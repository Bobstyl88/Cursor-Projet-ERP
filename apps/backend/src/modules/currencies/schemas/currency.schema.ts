import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CurrencyDocument = Currency & Document;

@Schema({ timestamps: true, collection: 'currencies' })
export class Currency {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  symbol: string;

  /** Rate vs tenant's base currency */
  @Prop({ required: true, min: 0 })
  rateToBase: number;

  @Prop({ required: true, type: Date })
  rateDate: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isBaseCurrency: boolean;
}

export const CurrencySchema = SchemaFactory.createForClass(Currency);
CurrencySchema.index({ tenantId: 1, code: 1 }, { unique: true });
