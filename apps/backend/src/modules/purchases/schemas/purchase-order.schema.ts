import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PurchaseOrderDocument = PurchaseOrder & Document;

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  CONFIRMED = 'confirmed',
  RECEIVED = 'received',
  INVOICED = 'invoiced',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true, collection: 'purchase_orders' })
export class PurchaseOrder {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, unique: true })
  number: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Supplier' })
  supplierId: Types.ObjectId;

  @Prop({ required: true, enum: PurchaseOrderStatus, default: PurchaseOrderStatus.DRAFT })
  status: PurchaseOrderStatus;

  @Prop({ required: true, default: 'EUR' })
  currency: string;

  @Prop({ required: true, type: Date })
  orderDate: Date;

  @Prop({ type: Date })
  expectedDeliveryDate?: Date;

  @Prop({ type: Date })
  receivedAt?: Date;

  @Prop({ type: [Object], default: [] })
  lines: Array<{
    productId: Types.ObjectId;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    subtotal: number;
    taxAmount: number;
    total: number;
    warehouseId: Types.ObjectId;
    receivedQuantity: number;
  }>;

  @Prop({ default: 0 })
  subtotal: number;

  @Prop({ default: 0 })
  taxTotal: number;

  @Prop({ default: 0 })
  grandTotal: number;

  @Prop({ type: String })
  createdBy: string;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);
PurchaseOrderSchema.index({ tenantId: 1, status: 1 });
PurchaseOrderSchema.index({ tenantId: 1, supplierId: 1 });
