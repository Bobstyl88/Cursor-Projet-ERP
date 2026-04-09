import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type QuoteDocument = Quote & Document;

export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CONVERTED = 'converted',
}

export class QuoteLine {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Product' })
  productId: Types.ObjectId;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ default: 0, min: 0, max: 100 })
  discountPercent: number;

  @Prop({ required: true, min: 0 })
  taxRate: number;

  /** Computed fields stored for history */
  @Prop({ required: true })
  subtotal: number;

  @Prop({ required: true })
  taxAmount: number;

  @Prop({ required: true })
  total: number;
}

@Schema({ timestamps: true, collection: 'quotes' })
export class Quote {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, unique: true })
  number: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Customer' })
  customerId: Types.ObjectId;

  @Prop({ required: true, enum: QuoteStatus, default: QuoteStatus.DRAFT })
  status: QuoteStatus;

  @Prop({ required: true, default: 'EUR' })
  currency: string;

  @Prop({ required: true, type: Date })
  issueDate: Date;

  @Prop({ required: true, type: Date })
  expiryDate: Date;

  @Prop({ type: [Object], default: [] })
  lines: QuoteLine[];

  @Prop({ default: 0 })
  subtotal: number;

  @Prop({ default: 0 })
  discountTotal: number;

  @Prop({ default: 0 })
  taxTotal: number;

  @Prop({ default: 0 })
  grandTotal: number;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ trim: true })
  termsAndConditions?: string;

  /** Set when converted to a sale order */
  @Prop({ type: Types.ObjectId, ref: 'SaleOrder' })
  saleOrderId?: Types.ObjectId;

  @Prop({ type: String })
  createdBy: string;
}

export const QuoteSchema = SchemaFactory.createForClass(Quote);
QuoteSchema.index({ tenantId: 1, status: 1 });
QuoteSchema.index({ tenantId: 1, customerId: 1 });
