import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

export enum InvoiceType {
  SALE = 'sale',
  PURCHASE = 'purchase',
  CREDIT_NOTE = 'credit_note',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export class InvoiceLine {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Product' })
  productId: Types.ObjectId;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ default: 0 })
  discountPercent: number;

  @Prop({ required: true })
  taxRate: number;

  @Prop({ required: true })
  taxRuleCode: string;

  @Prop({ required: true })
  subtotal: number;

  @Prop({ required: true })
  taxAmount: number;

  @Prop({ required: true })
  total: number;

  /** Revenue accounting account code */
  @Prop({ required: true })
  accountCode: string;
}

@Schema({ timestamps: true, collection: 'invoices' })
export class Invoice {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, unique: true })
  number: string;

  @Prop({ required: true, enum: InvoiceType, default: InvoiceType.SALE })
  type: InvoiceType;

  @Prop({ required: true, enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  /** Customer (for sale invoices) or Supplier (for purchase invoices) */
  @Prop({ required: true, type: Types.ObjectId })
  partyId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  partyType: 'Customer' | 'Supplier';

  @Prop({ type: Types.ObjectId, ref: 'SaleOrder' })
  saleOrderId?: Types.ObjectId;

  @Prop({ required: true, default: 'EUR' })
  currency: string;

  @Prop({ required: true })
  exchangeRate: number;

  @Prop({ required: true, type: Date })
  issueDate: Date;

  @Prop({ required: true, type: Date })
  dueDate: Date;

  @Prop({ type: [Object], default: [] })
  lines: InvoiceLine[];

  @Prop({ default: 0 })
  subtotal: number;

  @Prop({ default: 0 })
  discountTotal: number;

  @Prop({ default: 0 })
  taxTotal: number;

  @Prop({ default: 0 })
  grandTotal: number;

  @Prop({ default: 0 })
  paidAmount: number;

  @Prop({ default: 0 })
  balanceDue: number;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: String })
  createdBy: string;

  /** Set once accounting journal entry created */
  @Prop({ type: Types.ObjectId, ref: 'JournalEntry' })
  journalEntryId?: Types.ObjectId;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ tenantId: 1, status: 1 });
InvoiceSchema.index({ tenantId: 1, partyId: 1 });
InvoiceSchema.index({ tenantId: 1, dueDate: 1, status: 1 });
