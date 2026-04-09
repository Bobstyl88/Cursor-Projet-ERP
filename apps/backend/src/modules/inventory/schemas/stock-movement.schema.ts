import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StockMovementDocument = StockMovement & Document;

export enum MovementType {
  IN = 'in',
  OUT = 'out',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
}

export enum MovementReason {
  SALE = 'sale',
  PURCHASE = 'purchase',
  RETURN = 'return',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
}

@Schema({ timestamps: true, collection: 'stock_movements' })
export class StockMovement {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Product' })
  productId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Warehouse' })
  warehouseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse' })
  destinationWarehouseId?: Types.ObjectId;

  @Prop({ required: true, enum: MovementType })
  type: MovementType;

  @Prop({ required: true, enum: MovementReason })
  reason: MovementReason;

  @Prop({ required: true })
  quantity: number;

  @Prop({ default: 0 })
  unitCost: number;

  /** Reference document (invoice id, purchase order id, etc.) */
  @Prop({ type: String })
  referenceId?: string;

  @Prop({ type: String })
  referenceType?: string;

  @Prop({ type: String })
  note?: string;

  @Prop({ required: true, type: String })
  createdBy: string;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);
StockMovementSchema.index({ tenantId: 1, productId: 1, warehouseId: 1 });
StockMovementSchema.index({ tenantId: 1, createdAt: -1 });
