import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { SequenceService } from '../../common/utils/sequence.service';
import { PaginationParams, PaginatedResult } from '../../common/interfaces/pagination.interface';
import { SalesOrderStatus } from '@prisma/client';

@Injectable()
export class SalesOrderService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private sequence: SequenceService,
  ) {}

  async findAll(
    tenantId: string,
    params: PaginationParams & { status?: SalesOrderStatus },
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
      this.prisma.salesOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          contact: { select: { id: true, companyName: true, firstName: true, lastName: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { invoices: true } },
        },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const salesOrder = await this.prisma.salesOrder.findFirst({
      where: { id, tenantId },
      include: {
        contact: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        quotation: { select: { id: true, number: true } },
        lines: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
        invoices: { select: { id: true, number: true, status: true, total: true } },
      },
    });
    if (!salesOrder) throw new NotFoundException('Sales order not found');
    return salesOrder;
  }

  async confirm(tenantId: string, id: string, userId: string) {
    const so = await this.findById(tenantId, id);
    if (so.status !== 'DRAFT') {
      throw new BadRequestException('Only draft orders can be confirmed');
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'CONFIRM',
      entity: 'SalesOrder',
      entityId: id,
      oldValues: { status: 'DRAFT' },
      newValues: { status: 'CONFIRMED' },
    });

    return updated;
  }

  async generateInvoice(tenantId: string, salesOrderId: string, userId: string) {
    const so = await this.findById(tenantId, salesOrderId);

    if (!['CONFIRMED', 'PROCESSING'].includes(so.status)) {
      throw new BadRequestException('Order must be confirmed before invoicing');
    }

    const invoiceNumber = await this.sequence.getNextNumber(tenantId, 'invoice_sales');

    const result = await this.prisma.$transaction(async (tx) => {
      const defaultDueDays = 30;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + defaultDueDays);

      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          number: invoiceNumber,
          type: 'SALES',
          contactId: so.contactId,
          salesOrderId,
          currencyCode: so.currencyCode,
          exchangeRate: so.exchangeRate,
          issueDate: new Date(),
          dueDate,
          subtotal: so.subtotal,
          taxTotal: so.taxTotal,
          total: so.total,
          lines: {
            create: so.lines.map((line: any) => ({
              productId: line.productId,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discount: line.discount,
              taxRate: line.taxRate,
              taxAmount: Number(line.lineTotal) * (Number(line.taxRate) / 100),
              lineTotal: line.lineTotal,
              sortOrder: line.sortOrder,
            })),
          },
        },
        include: { lines: true },
      });

      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: 'PROCESSING' },
      });

      return invoice;
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'GENERATE_INVOICE',
      entity: 'SalesOrder',
      entityId: salesOrderId,
      newValues: { invoiceId: result.id, invoiceNumber: result.number },
    });

    return result;
  }
}
