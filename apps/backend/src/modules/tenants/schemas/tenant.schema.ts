import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TenantDocument = Tenant & Document;

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
}

export enum TenantPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

@Schema({ timestamps: true, collection: 'tenants' })
export class Tenant {
  @Prop({ required: true, unique: true, trim: true })
  slug: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  domain: string;

  @Prop({ default: TenantStatus.TRIAL, enum: TenantStatus })
  status: TenantStatus;

  @Prop({ default: TenantPlan.STARTER, enum: TenantPlan })
  plan: TenantPlan;

  @Prop({ default: 'fr', trim: true })
  defaultLocale: string;

  @Prop({ default: 'EUR', trim: true })
  defaultCurrency: string;

  @Prop({ default: 'France' })
  country: string;

  @Prop({ default: 'Europe/Paris' })
  timezone: string;

  @Prop({ type: Object, default: {} })
  settings: Record<string, unknown>;

  @Prop({ type: Date })
  trialEndsAt?: Date;

  @Prop({ type: Date })
  suspendedAt?: Date;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

TenantSchema.index({ slug: 1 }, { unique: true });
TenantSchema.index({ domain: 1 }, { unique: true });
