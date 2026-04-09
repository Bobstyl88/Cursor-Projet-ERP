import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TaxRuleDocument = TaxRule & Document;

/**
 * Configurable per-tenant tax rules.
 * Supports different rates per country, product category, and date range.
 */
@Schema({ timestamps: true, collection: 'tax_rules' })
export class TaxRule {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  code: string;

  @Prop({ required: true, min: 0, max: 100 })
  rate: number;

  /** ISO 3166-1 alpha-2 country codes this rule applies to */
  @Prop({ type: [String], default: [] })
  countries: string[];

  /** Product category this tax applies to (optional) */
  @Prop({ type: String })
  categoryCode?: string;

  /** Accounting account code for tax output */
  @Prop({ required: true, trim: true })
  outputAccountCode: string;

  /** Accounting account code for tax input (deductible) */
  @Prop({ required: true, trim: true })
  inputAccountCode: string;

  @Prop({ type: Date })
  validFrom?: Date;

  @Prop({ type: Date })
  validTo?: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const TaxRuleSchema = SchemaFactory.createForClass(TaxRule);
TaxRuleSchema.index({ tenantId: 1, code: 1 }, { unique: true });
