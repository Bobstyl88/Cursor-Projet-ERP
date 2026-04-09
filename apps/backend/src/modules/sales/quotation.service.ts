import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { SequenceService } from '../../common/utils/sequence.service';
import { PaginationParams, PaginatedResult } from '../../common/interfaces/pagination.interface';
import { QuotationStatus } from '@prisma/client';

@Injectable()
export class QuotationService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private sequence: SequenceService,
  ) {}

  async findAll(
    tenantId: string,
    params: PaginationParams & { status?: QuotationStatus },
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', status } = params;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { contact: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          contact: { select: { id: true, companyName: true, firstName: true, lastName: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
          lines: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, tenantId },
      include: {
        contact: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        lines: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    return quotation;
  }

  async create(
    tenantId: string,
    userId: string,
    data: {
      contactId: string;
      currencyCode?: string;
      exchangeRate?: number;
      notes?: string;
      validUntil?: Date;
      lines: Array<{
        productId: string;
        description?: string;
        quantity: number;
        unitPrice: number;
        discount?: number;
        taxRate?: number;
      }>;
    },
  ) {
    const number = await this.sequence.getNextNumber(tenantId, 'quotation');
    const lines = this.calculateLines(data.lines);
    const { subtotal, taxTotal, total } = this.calculateTotals(lines);

    const quotation = await this.prisma.quotation.create({
      data: {
        tenantId,
        number,
        contactId: data.contactId,
        userId,
        currencyCode: data.currencyCode || 'EUR',
        exchangeRate: data.exchangeRate || 1,
        subtotal,
        taxTotal,
        total,
        notes: data.notes,
        validUntil: data.validUntil,
        lines: { create: lines },
      },
      include: { lines: true, contact: true },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'CREATE',
      entity: 'Quotation',
      entityId: quotation.id,
      newValues: { number: quotation.number },
    });

    return quotation;
  }

  async updateStatus(tenantId: string, id: string, userId: string, status: QuotationStatus) {
    const quotation = await this.findById(tenantId, id);
    const validTransitions: Record<string, QuotationStatus[]> = {
      DRAFT: ['SENT'],
      SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
      ACCEPTED: ['CONVERTED'],
    };

    const allowed = validTransitions[quotation.status];
    if (!allowed || !allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${quotation.status} to ${status}`,
      );
    }

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: { status },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'STATUS_CHANGE',
      entity: 'Quotation',
      entityId: id,
      oldValues: { status: quotation.status },
      newValues: { status },
    });

    return updated;
  }

  async convertToSalesOrder(tenantId: string, quotationId: string, userId: string) {
    const quotation = await this.findById(tenantId, quotationId);

    if (quotation.status !== 'ACCEPTED') {
      throw new BadRequestException('Only accepted quotations can be converted');
    }

    const soNumber = await this.sequence.getNextNumber(tenantId, 'sales_order');

    const result = await this.prisma.$transaction(async (tx) => {
      const salesOrder = await tx.salesOrder.create({
        data: {
          tenantId,
          number: soNumber,
          quotationId,
          contactId: quotation.contactId,
          userId,
          currencyCode: quotation.currencyCode,
          exchangeRate: quotation.exchangeRate,
          subtotal: quotation.subtotal,
          taxTotal: quotation.taxTotal,
          total: quotation.total,
          notes: quotation.notes,
          lines: {
            create: quotation.lines.map((line: any) => ({
              productId: line.productId,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discount: line.discount,
              taxRate: line.taxRate,
              lineTotal: line.lineTotal,
              sortOrder: line.sortOrder,
            })),
          },
        },
        include: { lines: true },
      });

      await tx.quotation.update({
        where: { id: quotationId },
        data: { status: 'CONVERTED' },
      });

      return salesOrder;
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'CONVERT_TO_SO',
      entity: 'Quotation',
      entityId: quotationId,
      newValues: { salesOrderId: result.id, salesOrderNumber: result.number },
    });

    return result;
  }

  private calculateLines(
    lines: Array<{
      productId: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
      taxRate?: number;
    }>,
  ) {
    return lines.map((line, index) => {
      const discount = line.discount || 0;
      const subtotal = line.quantity * line.unitPrice;
      const discountedAmount = subtotal * (1 - discount / 100);
      const lineTotal = discountedAmount;

      return {
        productId: line.productId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount,
        taxRate: line.taxRate || 0,
        lineTotal,
        sortOrder: index,
      };
    });
  }

  private calculateTotals(lines: Array<{ lineTotal: number; taxRate: number }>) {
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const taxTotal = lines.reduce(
      (sum, l) => sum + l.lineTotal * (l.taxRate / 100),
      0,
    );
    return { subtotal, taxTotal, total: subtotal + taxTotal };
  }
}
