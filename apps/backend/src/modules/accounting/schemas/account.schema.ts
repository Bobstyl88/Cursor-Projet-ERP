import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AccountDocument = Account & Document;

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

export enum AccountNature {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

/**
 * Chart of accounts — one per tenant with optional country-specific templates.
 * Codes follow the French PCG (Plan Comptable Général) as default;
 * any chart can be loaded at tenant creation time.
 */
@Schema({ timestamps: true, collection: 'accounts' })
export class Account {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: AccountType })
  type: AccountType;

  @Prop({ required: true, enum: AccountNature })
  nature: AccountNature;

  /** Parent code for hierarchical grouping */
  @Prop({ trim: true })
  parentCode?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isSystem: boolean;

  /** Running balance (denormalised, updated on every journal entry) */
  @Prop({ default: 0 })
  balance: number;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
AccountSchema.index({ tenantId: 1, code: 1 }, { unique: true });
AccountSchema.index({ tenantId: 1, type: 1 });
