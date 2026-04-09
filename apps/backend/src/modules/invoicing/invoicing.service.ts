import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument, InvoiceStatus, InvoiceType } from './schemas/invoice.schema';
import { TaxRule, TaxRuleDocument } from './schemas/tax-rule.schema';
import { InvoiceCreatedEvent, InvoicePaidEvent } from '../../common/events/domain-events';

@Injectable()
export class InvoicingService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(TaxRule.name) private taxRuleModel: Model<TaxRuleDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ── Tax Rules ─────────────────────────────────────────────────────────

  async createTaxRule(tenantId: string, data: Partial<TaxRule>): Promise<TaxRuleDocument> {
    return new this.taxRuleModel({ tenantId, ...data }).save();
  }

  async findTaxRules(tenantId: string): Promise<TaxRuleDocument[]> {
    return this.taxRuleModel.find({ tenantId, isActive: true }).exec();
  }

  async findApplicableTaxRule(
    tenantId: string,
    code: string,
  ): Promise<TaxRuleDocument | null> {
    return this.taxRuleModel.findOne({ tenantId, code, isActive: true });
  }

  // ── Invoices ──────────────────────────────────────────────────────────

  async createFromSaleOrder(params: {
    tenantId: string;
    saleOrderId: string;
    partyId: string;
    currency: string;
    exchangeRate: number;
    lines: Array<{
      productId: string;
      description: string;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      taxRate: number;
      taxRuleCode: string;
      accountCode: string;
    }>;
    issueDate: Date;
    dueDate: Date;
    userId: string;
  }): Promise<InvoiceDocument> {
    const number = await this.generateNumber(params.tenantId, 'INV');

    const lines = params.lines.map((l) => {
      const base = l.quantity * l.unitPrice;
      const discount = base * ((l.discountPercent ?? 0) / 100);
      const subtotal = r2(base - discount);
      const taxAmount = r2(subtotal * (l.taxRate / 100));
      return {
        productId: new Types.ObjectId(l.productId),
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPercent: l.discountPercent ?? 0,
        taxRate: l.taxRate,
        taxRuleCode: l.taxRuleCode,
        subtotal,
        taxAmount,
        total: r2(subtotal + taxAmount),
        accountCode: l.accountCode,
      };
    });

    const subtotal = r2(lines.reduce((s, l) => s + l.subtotal, 0));
    const discountTotal = 0;
    const taxTotal = r2(lines.reduce((s, l) => s + l.taxAmount, 0));
    const grandTotal = r2(subtotal + taxTotal);

    const invoice = await new this.invoiceModel({
      tenantId: params.tenantId,
      number,
      type: InvoiceType.SALE,
      status: InvoiceStatus.DRAFT,
      partyId: new Types.ObjectId(params.partyId),
      partyType: 'Customer',
      saleOrderId: new Types.ObjectId(params.saleOrderId),
      currency: params.currency,
      exchangeRate: params.exchangeRate,
      issueDate: params.issueDate,
      dueDate: params.dueDate,
      lines,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      paidAmount: 0,
      balanceDue: grandTotal,
      createdBy: params.userId,
    }).save();

    // Build accounting lines from invoice data
    const accountingLines = [
      // Accounts Receivable debit
      { accountCode: '411000', debit: grandTotal, credit: 0 },
      // Revenue credit per line
      ...lines.map((l) => ({ accountCode: l.accountCode, debit: 0, credit: l.subtotal })),
      // Tax output credit per tax rule
      ...this.groupTaxLines(lines),
    ];

    this.eventEmitter.emit(
      'invoicing.invoice.created',
      new InvoiceCreatedEvent(
        params.tenantId,
        String(invoice._id),
        params.partyId,
        grandTotal,
        params.currency,
        accountingLines,
      ),
    );

    return invoice;
  }

  async recordPayment(
    tenantId: string,
    invoiceId: string,
    amount: number,
    currency: string,
  ): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findOne({ _id: invoiceId, tenantId });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === InvoiceStatus.PAID) throw new BadRequestException('Invoice already paid');

    invoice.paidAmount = r2(invoice.paidAmount + amount);
    invoice.balanceDue = r2(invoice.grandTotal - invoice.paidAmount);

    if (invoice.balanceDue <= 0) {
      invoice.status = InvoiceStatus.PAID;
    } else if (invoice.paidAmount > 0) {
      invoice.status = InvoiceStatus.PARTIALLY_PAID;
    }
    await invoice.save();

    if (invoice.status === InvoiceStatus.PAID) {
      this.eventEmitter.emit(
        'invoicing.invoice.paid',
        new InvoicePaidEvent(tenantId, invoiceId, amount, currency, new Date()),
      );
    }

    return invoice;
  }

  async findInvoices(tenantId: string, status?: InvoiceStatus): Promise<InvoiceDocument[]> {
    const filter: Record<string, unknown> = { tenantId };
    if (status) filter.status = status;
    return this.invoiceModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findById(tenantId: string, id: string): Promise<InvoiceDocument> {
    const inv = await this.invoiceModel.findOne({ _id: id, tenantId });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private groupTaxLines(lines: Array<{ taxAmount: number; taxRuleCode: string }>) {
    const map = new Map<string, number>();
    for (const l of lines) {
      map.set(l.taxRuleCode, (map.get(l.taxRuleCode) ?? 0) + l.taxAmount);
    }
    return [...map.entries()].map(([code, amount]) => ({
      accountCode: `TVA_${code}`,
      debit: 0,
      credit: r2(amount),
    }));
  }

  private async generateNumber(tenantId: string, prefix: string): Promise<string> {
    const count = await this.invoiceModel.countDocuments({ tenantId });
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}

function r2(n: number) { return Math.round(n * 100) / 100; }
