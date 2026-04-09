import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Prisma, Warehouse, StockLevel, StockMovement } from '@prisma/client';
import { buildPaginatedResult, PaginatedResult } from '@/common/interfaces/pagination.interface';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateStockMovementDto,
  QueryStockLevelDto,
  QueryStockMovementDto,
} from './dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Warehouse CRUD ──────────────────────────────────────────

  async createWarehouse(tenantId: string, dto: CreateWarehouseDto): Promise<Warehouse> {
    const existing = await this.prisma.warehouse.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });

    if (existing) {
      throw new ConflictException(`Warehouse with code "${dto.code}" already exists`);
    }

    if (dto.isDefault) {
      await this.prisma.warehouse.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.warehouse.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        address: dto.address as Prisma.InputJsonValue,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async findAllWarehouses(tenantId: string): Promise<Warehouse[]> {
    return this.prisma.warehouse.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOneWarehouse(tenantId: string, id: string): Promise<Warehouse> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID "${id}" not found`);
    }

    return warehouse;
  }

  async updateWarehouse(
    tenantId: string,
    id: string,
    dto: UpdateWarehouseDto,
  ): Promise<Warehouse> {
    await this.findOneWarehouse(tenantId, id);

    if (dto.code) {
      const existing = await this.prisma.warehouse.findFirst({
        where: { tenantId, code: dto.code, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`Warehouse with code "${dto.code}" already exists`);
      }
    }

    if (dto.isDefault) {
      await this.prisma.warehouse.updateMany({
        where: { tenantId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.warehouse.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address as Prisma.InputJsonValue }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });
  }

  async removeWarehouse(tenantId: string, id: string): Promise<Warehouse> {
    await this.findOneWarehouse(tenantId, id);

    const stockCount = await this.prisma.stockLevel.count({
      where: { tenantId, warehouseId: id, quantity: { gt: 0 } },
    });

    if (stockCount > 0) {
      throw new BadRequestException(
        'Cannot delete warehouse with existing stock. Move stock first.',
      );
    }

    return this.prisma.warehouse.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Stock Levels ────────────────────────────────────────────

  async getStockLevels(
    tenantId: string,
    query: QueryStockLevelDto,
  ): Promise<PaginatedResult<StockLevel>> {
    const where: Prisma.StockLevelWhereInput = { tenantId };

    if (query.warehouseId) {
      where.warehouseId = query.warehouseId;
    }

    if (query.productId) {
      where.productId = query.productId;
    }

    const [data, total] = await Promise.all([
      this.prisma.stockLevel.findMany({
        where,
        include: {
          product: { select: { id: true, code: true, name: true, unit: true } },
          warehouse: { select: { id: true, code: true, name: true } },
        },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.stockLevel.count({ where }),
    ]);

    return buildPaginatedResult(data as any, total, query);
  }

  async getProductStockLevels(
    tenantId: string,
    productId: string,
  ): Promise<StockLevel[]> {
    return this.prisma.stockLevel.findMany({
      where: { tenantId, productId },
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });
  }

  // ── Stock Movements ─────────────────────────────────────────

  async createStockMovement(
    tenantId: string,
    userId: string,
    dto: CreateStockMovementDto,
  ): Promise<StockMovement> {
    return this.prisma.$transaction(async (tx) => {
      switch (dto.type) {
        case 'IN':
          await this.upsertStockLevel(
            tx as any,
            tenantId,
            dto.warehouseId,
            dto.productId,
            new Prisma.Decimal(dto.quantity),
          );
          break;

        case 'OUT': {
          const currentLevel = await this.getOrCreateStockLevel(
            tx as any,
            tenantId,
            dto.warehouseId,
            dto.productId,
          );
          const available = new Prisma.Decimal(currentLevel.quantity.toString())
            .minus(new Prisma.Decimal(currentLevel.reservedQuantity.toString()));

          if (available.lessThan(new Prisma.Decimal(dto.quantity))) {
            throw new BadRequestException(
              `Insufficient stock. Available: ${available.toString()}, Requested: ${dto.quantity}`,
            );
          }

          await this.upsertStockLevel(
            tx as any,
            tenantId,
            dto.warehouseId,
            dto.productId,
            new Prisma.Decimal(dto.quantity).negated(),
          );
          break;
        }

        case 'TRANSFER': {
          if (!dto.sourceWarehouseId || !dto.destinationWarehouseId) {
            throw new BadRequestException(
              'Transfer requires both sourceWarehouseId and destinationWarehouseId',
            );
          }

          if (dto.sourceWarehouseId === dto.destinationWarehouseId) {
            throw new BadRequestException(
              'Source and destination warehouses must be different',
            );
          }

          const sourceLevel = await this.getOrCreateStockLevel(
            tx as any,
            tenantId,
            dto.sourceWarehouseId,
            dto.productId,
          );
          const sourceAvailable = new Prisma.Decimal(sourceLevel.quantity.toString())
            .minus(new Prisma.Decimal(sourceLevel.reservedQuantity.toString()));

          if (sourceAvailable.lessThan(new Prisma.Decimal(dto.quantity))) {
            throw new BadRequestException(
              `Insufficient stock in source warehouse. Available: ${sourceAvailable.toString()}, Requested: ${dto.quantity}`,
            );
          }

          await this.upsertStockLevel(
            tx as any,
            tenantId,
            dto.sourceWarehouseId,
            dto.productId,
            new Prisma.Decimal(dto.quantity).negated(),
          );
          await this.upsertStockLevel(
            tx as any,
            tenantId,
            dto.destinationWarehouseId,
            dto.productId,
            new Prisma.Decimal(dto.quantity),
          );
          break;
        }

        case 'ADJUSTMENT': {
          const current = await this.getOrCreateStockLevel(
            tx as any,
            tenantId,
            dto.warehouseId,
            dto.productId,
          );
          const diff = new Prisma.Decimal(dto.quantity)
            .minus(new Prisma.Decimal(current.quantity.toString()));

          await (tx as any).stockLevel.update({
            where: {
              tenantId_warehouseId_productId: {
                tenantId,
                warehouseId: dto.warehouseId,
                productId: dto.productId,
              },
            },
            data: { quantity: dto.quantity },
          });
          break;
        }
      }

      return (tx as any).stockMovement.create({
        data: {
          tenantId,
          type: dto.type,
          warehouseId: dto.warehouseId,
          productId: dto.productId,
          quantity: dto.quantity,
          sourceWarehouseId: dto.sourceWarehouseId,
          destinationWarehouseId: dto.destinationWarehouseId,
          reference: dto.reference,
          notes: dto.notes,
          createdBy: userId,
        },
        include: {
          product: { select: { id: true, code: true, name: true } },
          warehouse: { select: { id: true, code: true, name: true } },
        },
      });
    });
  }

  async findAllMovements(
    tenantId: string,
    query: QueryStockMovementDto,
  ): Promise<PaginatedResult<StockMovement>> {
    const where: Prisma.StockMovementWhereInput = { tenantId };

    if (query.warehouseId) {
      where.warehouseId = query.warehouseId;
    }

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.type) {
      where.type = query.type;
    }

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, code: true, name: true } },
          warehouse: { select: { id: true, code: true, name: true } },
          sourceWarehouse: { select: { id: true, code: true, name: true } },
          destinationWarehouse: { select: { id: true, code: true, name: true } },
        },
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return buildPaginatedResult(data as any, total, query);
  }

  // ── Stock Valuation ─────────────────────────────────────────

  async getStockValuation(tenantId: string, warehouseId?: string) {
    const where: Prisma.StockLevelWhereInput = { tenantId };
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    const stockLevels = await this.prisma.stockLevel.findMany({
      where,
      include: {
        product: {
          select: { id: true, code: true, name: true, purchasePrice: true, salePrice: true },
        },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });

    let totalCostValue = new Prisma.Decimal(0);
    let totalSaleValue = new Prisma.Decimal(0);

    const items = stockLevels.map((sl) => {
      const costValue = new Prisma.Decimal(sl.quantity.toString())
        .mul(new Prisma.Decimal(sl.product.purchasePrice.toString()));
      const saleValue = new Prisma.Decimal(sl.quantity.toString())
        .mul(new Prisma.Decimal(sl.product.salePrice.toString()));

      totalCostValue = totalCostValue.add(costValue);
      totalSaleValue = totalSaleValue.add(saleValue);

      return {
        product: sl.product,
        warehouse: sl.warehouse,
        quantity: sl.quantity,
        reservedQuantity: sl.reservedQuantity,
        costValue,
        saleValue,
      };
    });

    return {
      items,
      summary: {
        totalCostValue,
        totalSaleValue,
        totalItems: items.length,
      },
    };
  }

  // ── Helpers ─────────────────────────────────────────────────

  private async getOrCreateStockLevel(
    tx: PrismaService,
    tenantId: string,
    warehouseId: string,
    productId: string,
  ): Promise<StockLevel> {
    const existing = await tx.stockLevel.findUnique({
      where: {
        tenantId_warehouseId_productId: { tenantId, warehouseId, productId },
      },
    });

    if (existing) return existing;

    return tx.stockLevel.create({
      data: { tenantId, warehouseId, productId, quantity: 0, reservedQuantity: 0 },
    });
  }

  private async upsertStockLevel(
    tx: PrismaService,
    tenantId: string,
    warehouseId: string,
    productId: string,
    delta: Prisma.Decimal,
  ): Promise<StockLevel> {
    await this.getOrCreateStockLevel(tx, tenantId, warehouseId, productId);

    return tx.stockLevel.update({
      where: {
        tenantId_warehouseId_productId: { tenantId, warehouseId, productId },
      },
      data: { quantity: { increment: delta } },
    });
  }
}
