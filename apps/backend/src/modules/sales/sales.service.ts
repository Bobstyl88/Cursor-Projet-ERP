import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { Quote, QuoteDocument, QuoteStatus } from './schemas/quote.schema';
import { SaleOrder, SaleOrderDocument, SaleOrderStatus } from './schemas/sale-order.schema';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { CreateQuoteDto, QuoteLineDto } from './dto/create-quote.dto';
import { SaleOrderConfirmedEvent } from '../../common/events/domain-events';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>,
    @InjectModel(SaleOrder.name) private saleOrderModel: Model<SaleOrderDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ── Customers ────────────────────────────────────────────────────────

  async createCustomer(tenantId: string, data: Partial<Customer>): Promise<CustomerDocument> {
    return new this.customerModel({ tenantId, ...data }).save();
  }

  async findCustomers(tenantId: string): Promise<CustomerDocument[]> {
    return this.customerModel.find({ tenantId, isActive: true }).exec();
  }

  // ── Quotes ───────────────────────────────────────────────────────────

  async createQuote(
    tenantId: string,
    dto: CreateQuoteDto,
    userId: string,
  ): Promise<QuoteDocument> {
    const number = await this.generateNumber(tenantId, 'QT');
    const lines = dto.lines.map((l) => this.computeLine(l));
    const totals = this.sumLines(lines);

    return new this.quoteModel({
      tenantId,
      number,
      customerId: new Types.ObjectId(dto.customerId),
      currency: dto.currency ?? 'EUR',
      issueDate: new Date(dto.issueDate),
      expiryDate: new Date(dto.expiryDate),
      lines,
      ...totals,
      notes: dto.notes,
      termsAndConditions: dto.termsAndConditions,
      createdBy: userId,
    }).save();
  }

  async findQuotes(tenantId: string, status?: QuoteStatus): Promise<QuoteDocument[]> {
    const filter: Record<string, unknown> = { tenantId };
    if (status) filter.status = status;
    return this.quoteModel.find(filter).populate('customerId', 'name email').sort({ createdAt: -1 }).exec();
  }

  async findQuoteById(tenantId: string, id: string): Promise<QuoteDocument> {
    const quote = await this.quoteModel.findOne({ _id: id, tenantId }).populate('customerId');
    if (!quote) throw new NotFoundException('Quote not found');
    return quote;
  }

  /** Convert an accepted quote into a confirmed sale order */
  async convertQuoteToOrder(
    tenantId: string,
    quoteId: string,
    userId: string,
  ): Promise<SaleOrderDocument> {
    const quote = await this.findQuoteById(tenantId, quoteId);

    if (quote.status === QuoteStatus.CONVERTED) {
      throw new BadRequestException('Quote already converted');
    }
    if (quote.status === QuoteStatus.EXPIRED) {
      throw new BadRequestException('Cannot convert an expired quote');
    }

    const number = await this.generateNumber(tenantId, 'SO');
    const order = await new this.saleOrderModel({
      tenantId,
      number,
      quoteId: quote._id,
      customerId: quote.customerId,
      currency: quote.currency,
      orderDate: new Date(),
      lines: quote.lines,
      subtotal: quote.subtotal,
      taxTotal: quote.taxTotal,
      grandTotal: quote.grandTotal,
      status: SaleOrderStatus.CONFIRMED,
      createdBy: userId,
    }).save();

    quote.status = QuoteStatus.CONVERTED;
    quote.saleOrderId = order._id;
    await quote.save();

    this.eventEmitter.emit(
      'sales.order.confirmed',
      new SaleOrderConfirmedEvent(
        tenantId,
        String(order._id),
        (order.lines as any[]).map((l) => ({
          productId: String(l.productId),
          quantity: l.quantity,
          warehouseId: String(l.warehouseId),
        })),
      ),
    );

    return order;
  }

  async findOrders(tenantId: string): Promise<SaleOrderDocument[]> {
    return this.saleOrderModel
      .find({ tenantId })
      .populate('customerId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private computeLine(l: QuoteLineDto) {
    const base = l.quantity * l.unitPrice;
    const discount = base * ((l.discountPercent ?? 0) / 100);
    const subtotal = base - discount;
    const taxAmount = subtotal * (l.taxRate / 100);
    return {
      productId: new Types.ObjectId(l.productId),
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent ?? 0,
      taxRate: l.taxRate,
      subtotal: round2(subtotal),
      taxAmount: round2(taxAmount),
      total: round2(subtotal + taxAmount),
    };
  }

  private sumLines(lines: ReturnType<typeof this.computeLine>[]) {
    const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
    const taxTotal = lines.reduce((s, l) => s + l.taxAmount, 0);
    return {
      subtotal: round2(subtotal),
      taxTotal: round2(taxTotal),
      grandTotal: round2(subtotal + taxTotal),
    };
  }

  private async generateNumber(tenantId: string, prefix: string): Promise<string> {
    const count = await this.quoteModel.countDocuments({ tenantId });
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
