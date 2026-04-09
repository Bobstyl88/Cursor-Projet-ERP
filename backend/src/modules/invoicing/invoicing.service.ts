import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Prisma, Invoice, Payment } from '@prisma/client';
import { buildPaginatedResult, PaginatedResult } from '@/common/interfaces/pagination.interface';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  CreatePaymentDto,
  QueryInvoiceDto,
} from './dto';

@Injectable()
export class InvoicingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateInvoiceDto,
  ): Promise<Invoice> {
    const number = await this.generateNumber(tenantId, dto.type);
    const lines = this.calculateLines(dto.lines);
    const totals = this.calculateTotals(lines);

    return this.prisma.invoice.create({
      data: {
        tenantId,
        number,
        type: dto.type,
        contactId: dto.contactId,
        date: new Date(dto.date),
        dueDate: new Date(dto.dueDate),
        currencyCode: dto.currencyCode,
        exchangeRate: dto.exchangeRate ?? 1,
        notes: dto.notes,
        terms: dto.terms,
        saleOrderId: dto.saleOrderId,
        purchaseOrderId: dto.purchaseOrderId,
        createdBy: userId,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        discountTotal: totals.discountTotal,
        total: totals.total,
        amountDue: totals.total,
        amountPaid: 0,
        lines: {
          create: lines,
        },
      },
      include: {
        lines: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
        contact: true,
      },
    });
  }

  async createFromSaleOrder(
    tenantId: string,
    userId: string,
    saleOrderId: string,
  ): Promise<Invoice> {
    const order = await this.prisma.saleOrder.findFirst({
      where: { id: saleOrderId, tenantId },
      include: { lines: true, contact: true },
    });

    if (!order) {
      throw new NotFoundException(`Sale Order with ID "${saleOrderId}" not found`);
    }

    if (!['CONFIRMED', 'PARTIALLY_SHIPPED', 'SHIPPED', 'PARTIALLY_INVOICED'].includes(order.status)) {
      throw new BadRequestException(
        `Cannot create invoice from sale order in ${order.status} status`,
      );
    }

    const number = await this.generateNumber(tenantId, 'SALE');

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        number,
        type: 'SALE',
        contactId: order.contactId,
        date: new Date(),
        dueDate: new Date(Date.now() + (order.contact?.paymentTermDays ?? 30) * 86400000),
        currencyCode: order.currencyCode,
        exchangeRate: order.exchangeRate,
        saleOrderId: order.id,
        createdBy: userId,
        subtotal: order.subtotal,
        taxTotal: order.taxTotal,
        discountTotal: order.discountTotal,
        total: order.total,
        amountDue: order.total,
        amountPaid: 0,
        lines: {
          create: order.lines.map((line) => ({
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
        lines: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
        contact: true,
      },
    });

    await this.prisma.saleOrder.update({
      where: { id: saleOrderId },
      data: { status: 'INVOICED' },
    });

    return invoice;
  }

  async createFromPurchaseOrder(
    tenantId: string,
    userId: string,
    purchaseOrderId: string,
  ): Promise<Invoice> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, tenantId },
      include: { lines: true, contact: true },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID "${purchaseOrderId}" not found`);
    }

    if (!['RECEIVED', 'PARTIALLY_RECEIVED', 'PARTIALLY_INVOICED'].includes(po.status)) {
      throw new BadRequestException(
        `Cannot create invoice from purchase order in ${po.status} status`,
      );
    }

    const number = await this.generateNumber(tenantId, 'PURCHASE');

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        number,
        type: 'PURCHASE',
        contactId: po.contactId,
        date: new Date(),
        dueDate: new Date(Date.now() + 30 * 86400000),
        currencyCode: po.currencyCode,
        exchangeRate: po.exchangeRate,
        purchaseOrderId: po.id,
        createdBy: userId,
        subtotal: po.subtotal,
        taxTotal: po.taxTotal,
        discountTotal: po.discountTotal,
        total: po.total,
        amountDue: po.total,
        amountPaid: 0,
        lines: {
          create: po.lines.map((line) => ({
            productId: line.productId,
            description: line.description,
            quantity: line.receivedQuantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent,
            taxRate: line.taxRate,
            lineTotal: line.lineTotal,
            sortOrder: line.sortOrder,
          })),
        },
      },
      include: {
        lines: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
        contact: true,
      },
    });

    await this.prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: 'INVOICED' },
    });

    return invoice;
  }

  async findAll(
    tenantId: string,
    query: QueryInvoiceDto,
  ): Promise<PaginatedResult<Invoice>> {
    const where: Prisma.InvoiceWhereInput = { tenantId };

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.contactId) where.contactId = query.contactId;
    if (query.search) {
      where.number = { contains: query.search, mode: 'insensitive' };
    }
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = new Date(query.dateFrom);
      if (query.dateTo) where.date.lte = new Date(query.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true, code: true } },
          _count: { select: { lines: true, payments: true } },
        },
        skip: query.skip,
        take: query.take,
        orderBy: query.orderBy,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return buildPaginatedResult(data as any, total, query);
  }

  async findOne(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        lines: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
        contact: true,
        payments: { orderBy: { date: 'desc' } },
        saleOrder: true,
        purchaseOrder: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }

    return invoice;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateInvoiceDto,
  ): Promise<Invoice> {
    const invoice = await this.findOne(tenantId, id);

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT invoices can be edited');
    }

    const updateData: any = {};

    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.dueDate) updateData.dueDate = new Date(dto.dueDate);
    if (dto.currencyCode) updateData.currencyCode = dto.currencyCode;
    if (dto.exchangeRate !== undefined) updateData.exchangeRate = dto.exchangeRate;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.terms !== undefined) updateData.terms = dto.terms;

    if (dto.lines) {
      const lines = this.calculateLines(dto.lines);
      const totals = this.calculateTotals(lines);

      await this.prisma.invoiceLine.deleteMany({ where: { invoiceId: id } });

      updateData.subtotal = totals.subtotal;
      updateData.taxTotal = totals.taxTotal;
      updateData.discountTotal = totals.discountTotal;
      updateData.total = totals.total;
      updateData.amountDue = totals.total;
      updateData.lines = { create: lines };
    }

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        lines: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
        contact: true,
      },
    });
  }

  async send(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.findOne(tenantId, id);

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT invoices can be sent');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'SENT' },
      include: {
        lines: { include: { product: true } },
        contact: true,
      },
    });
  }

  async void(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.findOne(tenantId, id);

    if (['VOID', 'CANCELLED'].includes(invoice.status)) {
      throw new BadRequestException(`Invoice is already ${invoice.status}`);
    }

    if (new Prisma.Decimal(invoice.amountPaid.toString()).greaterThan(0)) {
      throw new BadRequestException(
        'Cannot void an invoice with recorded payments. Refund first.',
      );
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'VOID' },
      include: { lines: { include: { product: true } }, contact: true },
    });
  }

  async recordPayment(
    tenantId: string,
    userId: string,
    invoiceId: string,
    dto: CreatePaymentDto,
  ): Promise<Payment> {
    const invoice = await this.findOne(tenantId, invoiceId);

    if (['VOID', 'CANCELLED', 'PAID'].includes(invoice.status)) {
      throw new BadRequestException(
        `Cannot record payment for invoice in ${invoice.status} status`,
      );
    }

    const amountDue = new Prisma.Decimal(invoice.amountDue.toString());
    const paymentAmount = new Prisma.Decimal(dto.amount);

    if (paymentAmount.greaterThan(amountDue)) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) exceeds amount due (${amountDue.toString()})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await (tx as any).payment.create({
        data: {
          tenantId,
          invoiceId,
          date: new Date(dto.date),
          amount: dto.amount,
          currencyCode: dto.currencyCode,
          exchangeRate: dto.exchangeRate ?? 1,
          method: dto.method,
          reference: dto.reference,
          notes: dto.notes,
          createdBy: userId,
        },
      });

      const newAmountPaid = new Prisma.Decimal(invoice.amountPaid.toString()).add(paymentAmount);
      const newAmountDue = new Prisma.Decimal(invoice.total.toString()).minus(newAmountPaid);
      const newStatus = newAmountDue.lessThanOrEqualTo(0) ? 'PAID' : 'PARTIALLY_PAID';

      await (tx as any).invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue.lessThan(0) ? 0 : newAmountDue,
          status: newStatus,
        },
      });

      return payment;
    });
  }

  async getPayments(tenantId: string, invoiceId: string): Promise<Payment[]> {
    await this.findOne(tenantId, invoiceId);

    return this.prisma.payment.findMany({
      where: { tenantId, invoiceId },
      orderBy: { date: 'desc' },
    });
  }

  // ── Private Helpers ─────────────────────────────────────────

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

  private async generateNumber(tenantId: string, type: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefixMap: Record<string, string> = {
      SALE: 'INV',
      PURCHASE: 'BILL',
      CREDIT_NOTE: 'CN',
      DEBIT_NOTE: 'DN',
    };
    const docPrefix = prefixMap[type] || 'INV';
    const seqPrefix = `${docPrefix}-${year}`;

    const sequence = await this.prisma.sequence.upsert({
      where: { tenantId_prefix: { tenantId, prefix: seqPrefix } },
      update: { currentValue: { increment: 1 } },
      create: { tenantId, prefix: seqPrefix, currentValue: 1, padding: 5 },
    });

    return `${docPrefix}-${year}-${String(sequence.currentValue).padStart(5, '0')}`;
  }
}
