import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

export enum ProductType {
  STORABLE = 'storable',
  CONSUMABLE = 'consumable',
  SERVICE = 'service',
}

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, unique: true, trim: true })
  sku: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, enum: ProductType, default: ProductType.STORABLE })
  type: ProductType;

  @Prop({ default: 0, min: 0 })
  salePrice: number;

  @Prop({ default: 0, min: 0 })
  purchasePrice: number;

  @Prop({ default: 'EUR' })
  currency: string;

  @Prop({ default: 0, min: 0 })
  taxRate: number;

  @Prop({ trim: true })
  unit: string;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId?: Types.ObjectId;

  /** Sales accounting account code */
  @Prop({ trim: true })
  salesAccountCode?: string;

  /** Purchase/cost accounting account code */
  @Prop({ trim: true })
  purchaseAccountCode?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ tenantId: 1, name: 'text' });
