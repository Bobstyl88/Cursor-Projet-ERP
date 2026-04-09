import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Prisma, PurchaseOrder } from '@prisma/client';
import { buildPaginatedResult, PaginatedResult } from '@/common/interfaces/pagination.interface';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ReceiveGoodsDto,
  QueryPurchaseOrderDto,
} from './dto';

const VALID_PO_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
  PARTIALLY_RECEIVED: ['RECEIVED', 'PARTIALLY_INVOICED', 'INVOICED', 'CANCELLED'],
  RECEIVED: ['PARTIALLY_INVOICED', 'INVOICED'],
  PARTIALLY_INVOICED: ['INVOICED'],
  INVOICED: [],
  CANCELLED: [],
};

@Injectable()
export class PurchasingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const number = await this.generateNumber(tenantId);
    const lines = this.calculateLines(dto.lines);
    const totals = this.calculateTotals(lines);

    return this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        number,
        contactId: dto.contactId,
        date: new Date(dto.date),
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        currencyCode: dto.currencyCode,
        exchangeRate: dto.exchangeRate ?? 1,
        notes: dto.notes,
        createdBy: userId,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        discountTotal: totals.discountTotal,
        total: totals.total,
        lines: {
          create: lines,
        },
      },
      include: { lines: { include: { product: true } }, contact: true },
    });
  }

  async findAll(
    tenantId: string,
    query: QueryPurchaseOrderDto,
  ): Promise<PaginatedResult<PurchaseOrder>> {
    const where: Prisma.PurchaseOrderWhereInput = { tenantId };

    if (query.status) where.status = query.status;
    if (query.contactId) where.contactId = query.contactId;
    if (query.search) {
      where.number = { contains: query.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true, code: true } },
          _count: { select: { lines: true } },
        },
        skip: query.skip,
        take: query.take,
        orderBy: query.orderBy,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return buildPaginatedResult(data as any, total, query);
  }

  async findOne(tenantId: string, id: string): Promise<PurchaseOrder> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        lines: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
        contact: true,
      },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID "${id}" not found`);
    }

    return po;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const po = await this.findOne(tenantId, id);

    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT purchase orders can be edited');
    }

    const updateData: any = {};

    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.expectedDate !== undefined) updateData.expectedDate = dto.expectedDate ? new Date(dto.expectedDate) : null;
    if (dto.currencyCode) updateData.currencyCode = dto.currencyCode;
    if (dto.exchangeRate !== undefined) updateData.exchangeRate = dto.exchangeRate;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (dto.lines) {
      const lines = this.calculateLines(dto.lines);
      const totals = this.calculateTotals(lines);

      await this.prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });

      updateData.subtotal = totals.subtotal;
      updateData.taxTotal = totals.taxTotal;
      updateData.discountTotal = totals.discountTotal;
      updateData.total = totals.total;
      updateData.lines = { create: lines };
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        lines: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
        contact: true,
      },
    });
  }

  async sendToSupplier(tenantId: string, id: string): Promise<PurchaseOrder> {
    return this.transitionStatus(tenantId, id, 'SENT');
  }

  async confirm(tenantId: string, id: string): Promise<PurchaseOrder> {
    return this.transitionStatus(tenantId, id, 'CONFIRMED');
  }

  async cancel(tenantId: string, id: string): Promise<PurchaseOrder> {
    const po = await this.findOne(tenantId, id);
    const allowed = VALID_PO_TRANSITIONS[po.status];

    if (!allowed?.includes('CANCELLED')) {
      throw new BadRequestException(
        `Cannot cancel purchase order in ${po.status} status`,
      );
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { lines: { include: { product: true } }, contact: true },
    });
  }

  async receiveGoods(
    tenantId: string,
    userId: string,
    id: string,
    dto: ReceiveGoodsDto,
  ): Promise<PurchaseOrder> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID "${id}" not found`);
    }

    if (!['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
      throw new BadRequestException(
        `Cannot receive goods for purchase order in ${po.status} status`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let allFullyReceived = true;

      for (const receiveLine of dto.lines) {
        const poLine = po.lines.find(
          (l) => l.productId === receiveLine.productId,
        );

        if (!poLine) {
          throw new BadRequestException(
            `Product "${receiveLine.productId}" not found in purchase order`,
          );
        }

        const newReceived = new Prisma.Decimal(poLine.receivedQuantity.toString())
          .add(new Prisma.Decimal(receiveLine.receivedQuantity));

        if (newReceived.greaterThan(poLine.quantity)) {
          throw new BadRequestException(
            `Received quantity for product "${receiveLine.productId}" exceeds ordered quantity`,
          );
        }

        await (tx as any).purchaseOrderLine.update({
          where: { id: poLine.id },
          data: { receivedQuantity: newReceived },
        });

        const existingLevel = await (tx as any).stockLevel.findUnique({
          where: {
            tenantId_warehouseId_productId: {
              tenantId,
              warehouseId: dto.warehouseId,
              productId: receiveLine.productId,
            },
          },
        });

        if (existingLevel) {
          await (tx as any).stockLevel.update({
            where: {
              tenantId_warehouseId_productId: {
                tenantId,
                warehouseId: dto.warehouseId,
                productId: receiveLine.productId,
              },
            },
            data: { quantity: { increment: receiveLine.receivedQuantity } },
          });
        } else {
          await (tx as any).stockLevel.create({
            data: {
              tenantId,
              warehouseId: dto.warehouseId,
              productId: receiveLine.productId,
              quantity: receiveLine.receivedQuantity,
              reservedQuantity: 0,
            },
          });
        }

        await (tx as any).stockMovement.create({
          data: {
            tenantId,
            type: 'IN',
            warehouseId: dto.warehouseId,
            productId: receiveLine.productId,
            quantity: receiveLine.receivedQuantity,
            reference: `PO:${po.number}`,
            notes: dto.notes,
            createdBy: userId,
          },
        });

        if (!newReceived.equals(poLine.quantity)) {
          allFullyReceived = false;
        }
      }

      const unreceived = po.lines.filter(
        (l) => !dto.lines.find((rl) => rl.productId === l.productId),
      );
      for (const line of unreceived) {
        if (!new Prisma.Decimal(line.receivedQuantity.toString()).equals(line.quantity)) {
          allFullyReceived = false;
          break;
        }
      }

      const newStatus = allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

      return (tx as any).purchaseOrder.update({
        where: { id },
        data: { status: newStatus },
        include: {
          lines: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
          contact: true,
        },
      });
    });
  }

  // ── Private Helpers ─────────────────────────────────────────

  private async transitionStatus(
    tenantId: string,
    id: string,
    target: string,
  ): Promise<PurchaseOrder> {
    const po = await this.findOne(tenantId, id);
    const allowed = VALID_PO_TRANSITIONS[po.status];

    if (!allowed?.includes(target)) {
      throw new BadRequestException(
        `Cannot transition purchase order from ${po.status} to ${target}`,
      );
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: target as any },
      include: {
        lines: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
        contact: true,
      },
    });
  }

  private calculateLines(
    dtoLines: Array<{
      productId: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
      taxRate?: number;
      sortOrder?: number;
    }>,
  ) {
    return dtoLines.map((line, index) => {
      const discountPercent = line.discountPercent ?? 0;
      const taxRate = line.taxRate ?? 0;

      const subtotal = new Prisma.Decimal(line.quantity).mul(new Prisma.Decimal(line.unitPrice));
      const discountAmount = subtotal.mul(new Prisma.Decimal(discountPercent)).div(100);
      const afterDiscount = subtotal.minus(discountAmount);
      const taxAmount = afterDiscount.mul(new Prisma.Decimal(taxRate)).div(100);
      const lineTotal = afterDiscount.add(taxAmount);

      return {
        productId: line.productId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPercent,
        taxRate,
        lineTotal,
        sortOrder: line.sortOrder ?? index,
      };
    });
  }

  private calculateTotals(
    lines: Array<{
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      taxRate: number;
      lineTotal: Prisma.Decimal;
    }>,
  ) {
    let subtotal = new Prisma.Decimal(0);
    let taxTotal = new Prisma.Decimal(0);
    let discountTotal = new Prisma.Decimal(0);

    for (const line of lines) {
      const lineSubtotal = new Prisma.Decimal(line.quantity).mul(
        new Prisma.Decimal(line.unitPrice),
      );
      const lineDiscount = lineSubtotal
        .mul(new Prisma.Decimal(line.discountPercent))
        .div(100);
      const afterDiscount = lineSubtotal.minus(lineDiscount);
      const lineTax = afterDiscount
        .mul(new Prisma.Decimal(line.taxRate))
        .div(100);

      subtotal = subtotal.add(lineSubtotal);
      discountTotal = discountTotal.add(lineDiscount);
      taxTotal = taxTotal.add(lineTax);
    }

    const total = subtotal.minus(discountTotal).add(taxTotal);

    return { subtotal, taxTotal, discountTotal, total };
  }

  private async generateNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}`;

    const sequence = await this.prisma.sequence.upsert({
      where: { tenantId_prefix: { tenantId, prefix } },
      update: { currentValue: { increment: 1 } },
      create: { tenantId, prefix, currentValue: 1, padding: 5 },
    });

    return `PO-${year}-${String(sequence.currentValue).padStart(5, '0')}`;
  }
}
