import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CustomerDocument = Customer & Document;

export enum CustomerType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company',
}

@Schema({ timestamps: true, collection: 'customers' })
export class Customer {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, enum: CustomerType, default: CustomerType.COMPANY })
  type: CustomerType;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  legalName?: string;

  @Prop({ trim: true })
  taxId?: string;

  @Prop({ lowercase: true, trim: true })
  email?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ type: Object })
  billingAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    state?: string;
  };

  @Prop({ type: Object })
  shippingAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    state?: string;
  };

  @Prop({ default: 'EUR' })
  currency: string;

  @Prop({ default: 30 })
  paymentTermDays: number;

  @Prop({ type: Number, default: 0 })
  creditLimit: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ tenantId: 1, email: 1 });
CustomerSchema.index({ tenantId: 1, name: 'text' });
