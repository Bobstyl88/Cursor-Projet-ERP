import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StockLevelDocument = StockLevel & Document;

/**
 * Materialised view of current stock quantity per product per warehouse.
 * Updated on every StockMovement write; never computed on-the-fly in reports.
 */
@Schema({ timestamps: true, collection: 'stock_levels' })
export class StockLevel {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Product' })
  productId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Warehouse' })
  warehouseId: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  quantity: number;

  @Prop({ default: 0 })
  reservedQuantity: number;

  @Prop({ default: 0 })
  reorderPoint: number;

  get availableQuantity(): number {
    return this.quantity - this.reservedQuantity;
  }
}

export const StockLevelSchema = SchemaFactory.createForClass(StockLevel);
StockLevelSchema.index({ tenantId: 1, productId: 1, warehouseId: 1 }, { unique: true });
