import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Prisma, Quotation, SaleOrder } from '@prisma/client';
import { buildPaginatedResult, PaginatedResult } from '@/common/interfaces/pagination.interface';
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  CreateSaleOrderDto,
  UpdateSaleOrderDto,
  QueryQuotationDto,
  QuerySaleOrderDto,
} from './dto';

const VALID_QUOTATION_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SENT'],
  SENT: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['CONVERTED'],
  REJECTED: [],
  EXPIRED: [],
  CONVERTED: [],
};

const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PARTIALLY_SHIPPED', 'SHIPPED', 'PARTIALLY_INVOICED', 'INVOICED', 'CANCELLED'],
  PARTIALLY_SHIPPED: ['SHIPPED', 'PARTIALLY_INVOICED', 'INVOICED', 'CANCELLED'],
  SHIPPED: ['PARTIALLY_INVOICED', 'INVOICED'],
  PARTIALLY_INVOICED: ['INVOICED'],
  INVOICED: [],
  CANCELLED: [],
};

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Quotations ──────────────────────────────────────────────

  async createQuotation(
    tenantId: string,
    userId: string,
    dto: CreateQuotationDto,
  ): Promise<Quotation> {
    const number = await this.generateNumber(tenantId, 'QUO');
    const lines = this.calculateLines(dto.lines);
    const totals = this.calculateTotals(lines);

    return this.prisma.quotation.create({
      data: {
        tenantId,
        number,
        contactId: dto.contactId,
        date: new Date(dto.date),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        currencyCode: dto.currencyCode,
        exchangeRate: dto.exchangeRate ?? 1,
        notes: dto.notes,
        terms: dto.terms,
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

  async findAllQuotations(
    tenantId: string,
    query: QueryQuotationDto,
  ): Promise<PaginatedResult<Quotation>> {
    const where: Prisma.QuotationWhereInput = { tenantId };

    if (query.status) where.status = query.status;
    if (query.contactId) where.contactId = query.contactId;
    if (query.search) {
      where.number = { contains: query.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true, code: true } },
          _count: { select: { lines: true } },
        },
        skip: query.skip,
        take: query.take,
        orderBy: query.orderBy,
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return buildPaginatedResult(data as any, total, query);
  }

  async findOneQuotation(tenantId: string, id: string): Promise<Quotation> {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, tenantId },
      include: {
        lines: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
        contact: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID "${id}" not found`);
    }

    return quotation;
  }

  async updateQuotation(
    tenantId: string,
    id: string,
    dto: UpdateQuotationDto,
  ): Promise<Quotation> {
    const quotation = await this.findOneQuotation(tenantId, id);

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT quotations can be edited');
    }

    const updateData: any = {};

    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.validUntil !== undefined) updateData.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (dto.currencyCode) updateData.currencyCode = dto.currencyCode;
    if (dto.exchangeRate !== undefined) updateData.exchangeRate = dto.exchangeRate;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.terms !== undefined) updateData.terms = dto.terms;

    if (dto.lines) {
      const lines = this.calculateLines(dto.lines);
      const totals = this.calculateTotals(lines);

      await this.prisma.quotationLine.deleteMany({ where: { quotationId: id } });

      updateData.subtotal = totals.subtotal;
      updateData.taxTotal = totals.taxTotal;
      updateData.discountTotal = totals.discountTotal;
      updateData.total = totals.total;
      updateData.lines = { create: lines };
    }

    return this.prisma.quotation.update({
      where: { id },
      data: updateData,
      include: {
        lines: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
        contact: true,
      },
    });
  }

  async sendQuotation(tenantId: string, id: string): Promise<Quotation> {
    return this.transitionQuotation(tenantId, id, 'SENT');
  }

  async acceptQuotation(tenantId: string, id: string): Promise<Quotation> {
    return this.transitionQuotation(tenantId, id, 'ACCEPTED');
  }

  async rejectQuotation(tenantId: string, id: string): Promise<Quotation> {
    return this.transitionQuotation(tenantId, id, 'REJECTED');
  }

  async convertQuotationToOrder(
    tenantId: string,
    userId: string,
    quotationId: string,
  ): Promise<SaleOrder> {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quotationId, tenantId },
      include: { lines: true },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID "${quotationId}" not found`);
    }

    if (quotation.status !== 'ACCEPTED') {
      throw new BadRequestException('Only ACCEPTED quotations can be converted to orders');
    }

    const orderNumber = await this.generateNumber(tenantId, 'SO');

    const [saleOrder] = await this.prisma.$transaction([
      this.prisma.saleOrder.create({
        data: {
          tenantId,
          number: orderNumber,
          contactId: quotation.contactId,
          date: new Date(),
          currencyCode: quotation.currencyCode,
          exchangeRate: quotation.exchangeRate,
          subtotal: quotation.subtotal,
          taxTotal: quotation.taxTotal,
          discountTotal: quotation.discountTotal,
          total: quotation.total,
          notes: quotation.notes,
          createdBy: userId,
          quotationId: quotation.id,
          lines: {
            create: quotation.lines.map((line) => ({
              productId: line.productId,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountPercent: line.discountPercent,
              taxRate: line.taxRate,
              lineTotal: line.lineTotal,
              sortOrder: line.sortOrder,
            })),
          },
        },
        include: {
          lines: { include: { product: true } },
          contact: true,
        },
      }),
      this.prisma.quotation.update({
        where: { id: quotationId },
        data: {
          status: 'CONVERTED',
          convertedToOrderId: undefined,
        },
      }),
    ]);

    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: { convertedToOrderId: saleOrder.id },
    });

    return saleOrder;
  }

  // ── Sale Orders ─────────────────────────────────────────────

  async createSaleOrder(
    tenantId: string,
    userId: string,
    dto: CreateSaleOrderDto,
  ): Promise<SaleOrder> {
    const number = await this.generateNumber(tenantId, 'SO');
    const lines = this.calculateLines(dto.lines);
    const totals = this.calculateTotals(lines);

    return this.prisma.saleOrder.create({
      data: {
        tenantId,
        number,
        contactId: dto.contactId,
        date: new Date(dto.date),
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
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

  async findAllSaleOrders(
    tenantId: string,
    query: QuerySaleOrderDto,
  ): Promise<PaginatedResult<SaleOrder>> {
    const where: Prisma.SaleOrderWhereInput = { tenantId };

    if (query.status) where.status = query.status;
    if (query.contactId) where.contactId = query.contactId;
    if (query.search) {
      where.number = { contains: query.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.saleOrder.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true, code: true } },
          _count: { select: { lines: true } },
        },
        skip: query.skip,
        take: query.take,
        orderBy: query.orderBy,
      }),
      this.prisma.saleOrder.count({ where }),
    ]);

    return buildPaginatedResult(data as any, total, query);
  }

  async findOneSaleOrder(tenantId: string, id: string): Promise<SaleOrder> {
    const order = await this.prisma.saleOrder.findFirst({
      where: { id, tenantId },
      include: {
        lines: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
        contact: true,
        quotation: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Sale Order with ID "${id}" not found`);
    }

    return order;
  }

  async updateSaleOrder(
    tenantId: string,
    id: string,
    dto: UpdateSaleOrderDto,
  ): Promise<SaleOrder> {
    const order = await this.findOneSaleOrder(tenantId, id);

    if (order.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT orders can be edited');
    }

    const updateData: any = {};

    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.deliveryDate !== undefined) updateData.deliveryDate = dto.deliveryDate ? new Date(dto.deliveryDate) : null;
    if (dto.currencyCode) updateData.currencyCode = dto.currencyCode;
    if (dto.exchangeRate !== undefined) updateData.exchangeRate = dto.exchangeRate;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (dto.lines) {
      const lines = this.calculateLines(dto.lines);
      const totals = this.calculateTotals(lines);

      await this.prisma.saleOrderLine.deleteMany({ where: { saleOrderId: id } });

      updateData.subtotal = totals.subtotal;
      updateData.taxTotal = totals.taxTotal;
      updateData.discountTotal = totals.discountTotal;
      updateData.total = totals.total;
      updateData.lines = { create: lines };
    }

    return this.prisma.saleOrder.update({
      where: { id },
      data: updateData,
      include: {
        lines: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
        contact: true,
      },
    });
  }

  async confirmSaleOrder(tenantId: string, id: string): Promise<SaleOrder> {
    return this.transitionSaleOrder(tenantId, id, 'CONFIRMED');
  }

  async cancelSaleOrder(tenantId: string, id: string): Promise<SaleOrder> {
    const order = await this.findOneSaleOrder(tenantId, id);

    const allowed = VALID_ORDER_TRANSITIONS[order.status];
    if (!allowed?.includes('CANCELLED')) {
      throw new BadRequestException(
        `Cannot cancel order in ${order.status} status`,
      );
    }

    return this.prisma.saleOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { lines: { include: { product: true } }, contact: true },
    });
  }

  // ── Private Helpers ─────────────────────────────────────────

  private async transitionQuotation(
    tenantId: string,
    id: string,
    target: string,
  ): Promise<Quotation> {
    const quotation = await this.findOneQuotation(tenantId, id);

    const allowed = VALID_QUOTATION_TRANSITIONS[quotation.status];
    if (!allowed?.includes(target)) {
      throw new BadRequestException(
        `Cannot transition quotation from ${quotation.status} to ${target}`,
      );
    }

    return this.prisma.quotation.update({
      where: { id },
      data: { status: target as any },
      include: {
        lines: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
        contact: true,
      },
    });
  }

  private async transitionSaleOrder(
    tenantId: string,
    id: string,
    target: string,
  ): Promise<SaleOrder> {
    const order = await this.findOneSaleOrder(tenantId, id);

    const allowed = VALID_ORDER_TRANSITIONS[order.status];
    if (!allowed?.includes(target)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${target}`,
      );
    }

    return this.prisma.saleOrder.update({
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

  private async generateNumber(tenantId: string, prefix: string): Promise<string> {
    const year = new Date().getFullYear();
    const seqPrefix = `${prefix}-${year}`;

    const sequence = await this.prisma.sequence.upsert({
      where: { tenantId_prefix: { tenantId, prefix: seqPrefix } },
      update: { currentValue: { increment: 1 } },
      create: { tenantId, prefix: seqPrefix, currentValue: 1, padding: 5 },
    });

    return `${prefix}-${year}-${String(sequence.currentValue).padStart(5, '0')}`;
  }
}
