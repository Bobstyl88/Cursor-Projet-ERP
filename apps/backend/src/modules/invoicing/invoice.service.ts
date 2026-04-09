import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AccountingService } from '../accounting/accounting.service';
import { SequenceService } from '../../common/utils/sequence.service';
import { PaginationParams, PaginatedResult } from '../../common/interfaces/pagination.interface';
import { InvoiceStatus, InvoiceType, PaymentMethod } from '@prisma/client';

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private accounting: AccountingService,
    private sequence: SequenceService,
  ) {}

  async findAll(
    tenantId: string,
    params: PaginationParams & { status?: InvoiceStatus; type?: InvoiceType },
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', status, type } = params;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { contact: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          contact: { select: { id: true, companyName: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        contact: true,
        salesOrder: { select: { id: true, number: true } },
        purchaseOrder: { select: { id: true, number: true } },
        lines: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
        payments: true,
        journalEntries: { select: { id: true, number: true, status: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async validate(tenantId: string, id: string, userId: string) {
    const invoice = await this.findById(tenantId, id);

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only draft invoices can be validated');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'SENT' },
    });

    await this.accounting.createJournalEntryFromInvoice(tenantId, id, userId);

    await this.audit.log({
      tenantId,
      userId,
      action: 'VALIDATE',
      entity: 'Invoice',
      entityId: id,
      oldValues: { status: 'DRAFT' },
      newValues: { status: 'SENT' },
    });

    return updated;
  }

  async recordPayment(
    tenantId: string,
    invoiceId: string,
    userId: string,
    data: {
      amount: number;
      method: PaymentMethod;
      reference?: string;
      paidAt?: Date;
    },
  ) {
    const invoice = await this.findById(tenantId, invoiceId);

    if (['DRAFT', 'CANCELLED', 'PAID'].includes(invoice.status)) {
      throw new BadRequestException(`Cannot record payment for ${invoice.status} invoice`);
    }

    const totalPaid = Number(invoice.amountPaid) + data.amount;
    const invoiceTotal = Number(invoice.total);

    if (totalPaid > invoiceTotal) {
      throw new BadRequestException('Payment exceeds invoice total');
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          tenantId,
          invoiceId,
          amount: data.amount,
          currencyCode: invoice.currencyCode,
          method: data.method,
          reference: data.reference,
          paidAt: data.paidAt || new Date(),
        },
      });

      const newStatus: InvoiceStatus =
        totalPaid >= invoiceTotal ? 'PAID' : 'PARTIALLY_PAID';

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { amountPaid: totalPaid, status: newStatus },
      });

      await this.accounting.createPaymentJournalEntry(
        tenantId,
        invoiceId,
        payment.id,
        data.amount,
        userId,
      );

      await this.audit.log({
        tenantId,
        userId,
        action: 'RECORD_PAYMENT',
        entity: 'Invoice',
        entityId: invoiceId,
        newValues: { paymentId: payment.id, amount: data.amount, method: data.method },
      });

      return payment;
    });
  }
}
