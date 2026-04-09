import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class WarehouseService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.warehouse.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { inventoryLevels: true } },
      },
    });
  }

  async findById(tenantId: string, id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId },
      include: {
        inventoryLevels: {
          include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
        },
      },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  async create(
    tenantId: string,
    userId: string,
    data: { name: string; code: string; address?: any; isDefault?: boolean },
  ) {
    const warehouse = await this.prisma.warehouse.create({
      data: { tenantId, ...data },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'CREATE',
      entity: 'Warehouse',
      entityId: warehouse.id,
      newValues: { name: warehouse.name, code: warehouse.code },
    });

    return warehouse;
  }

  async adjustStock(
    tenantId: string,
    userId: string,
    data: {
      productId: string;
      warehouseId: string;
      type: StockMovementType;
      quantity: number;
      reference?: string;
      referenceId?: string;
      notes?: string;
    },
  ) {
    if (data.quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          productId: data.productId,
          warehouseId: data.warehouseId,
          type: data.type,
          quantity: data.type === 'OUT' ? -data.quantity : data.quantity,
          reference: data.reference,
          referenceId: data.referenceId,
          notes: data.notes,
        },
      });

      const quantityChange =
        data.type === 'OUT' ? -data.quantity : data.quantity;

      await tx.inventoryLevel.upsert({
        where: {
          productId_warehouseId: {
            productId: data.productId,
            warehouseId: data.warehouseId,
          },
        },
        create: {
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantity: Math.max(0, quantityChange),
        },
        update: {
          quantity: { increment: quantityChange },
        },
      });

      await this.audit.log({
        tenantId,
        userId,
        action: 'STOCK_MOVEMENT',
        entity: 'StockMovement',
        entityId: movement.id,
        newValues: data,
      });

      return movement;
    });
  }

  async getStockMovements(
    tenantId: string,
    params: { productId?: string; warehouseId?: string; page?: number; limit?: number },
  ) {
    const { page = 1, limit = 50, productId, warehouseId } = params;
    const where: any = { tenantId };
    if (productId) where.productId = productId;
    if (warehouseId) where.warehouseId = warehouseId;

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
