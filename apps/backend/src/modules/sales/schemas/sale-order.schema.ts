import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SaleOrderDocument = SaleOrder & Document;

export enum SaleOrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  IN_DELIVERY = 'in_delivery',
  DELIVERED = 'delivered',
  INVOICED = 'invoiced',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true, collection: 'sale_orders' })
export class SaleOrder {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, unique: true })
  number: string;

  @Prop({ type: Types.ObjectId, ref: 'Quote' })
  quoteId?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Customer' })
  customerId: Types.ObjectId;

  @Prop({ required: true, enum: SaleOrderStatus, default: SaleOrderStatus.DRAFT })
  status: SaleOrderStatus;

  @Prop({ required: true, default: 'EUR' })
  currency: string;

  @Prop({ required: true, type: Date })
  orderDate: Date;

  @Prop({ type: Date })
  expectedDeliveryDate?: Date;

  @Prop({ type: [Object], default: [] })
  lines: Array<{
    productId: Types.ObjectId;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    taxRate: number;
    subtotal: number;
    taxAmount: number;
    total: number;
    warehouseId: Types.ObjectId;
  }>;

  @Prop({ default: 0 })
  subtotal: number;

  @Prop({ default: 0 })
  taxTotal: number;

  @Prop({ default: 0 })
  grandTotal: number;

  @Prop({ type: String })
  createdBy: string;

  @Prop({ type: Types.ObjectId, ref: 'Invoice' })
  invoiceId?: Types.ObjectId;
}

export const SaleOrderSchema = SchemaFactory.createForClass(SaleOrder);
SaleOrderSchema.index({ tenantId: 1, status: 1 });
SaleOrderSchema.index({ tenantId: 1, customerId: 1 });
