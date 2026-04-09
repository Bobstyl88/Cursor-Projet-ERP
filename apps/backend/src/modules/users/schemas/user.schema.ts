import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  ACCOUNTANT = 'accountant',
  SALES_MANAGER = 'sales_manager',
  SALES_REP = 'sales_rep',
  PURCHASER = 'purchaser',
  WAREHOUSE = 'warehouse',
  VIEWER = 'viewer',
}

// Granular permissions follow a <module>:<action> pattern
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPERADMIN]: ['*'],
  [UserRole.ADMIN]: ['*'],
  [UserRole.ACCOUNTANT]: [
    'accounting:read', 'accounting:write',
    'invoicing:read', 'invoicing:write',
    'reporting:read',
  ],
  [UserRole.SALES_MANAGER]: [
    'sales:read', 'sales:write', 'sales:delete',
    'invoicing:read', 'invoicing:write',
    'customers:read', 'customers:write',
    'reporting:read',
  ],
  [UserRole.SALES_REP]: [
    'sales:read', 'sales:write',
    'customers:read', 'customers:write',
    'invoicing:read',
  ],
  [UserRole.PURCHASER]: [
    'purchases:read', 'purchases:write',
    'inventory:read',
    'suppliers:read', 'suppliers:write',
  ],
  [UserRole.WAREHOUSE]: [
    'inventory:read', 'inventory:write',
  ],
  [UserRole.VIEWER]: [
    'sales:read', 'purchases:read', 'inventory:read',
    'accounting:read', 'reporting:read',
  ],
};

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ type: [String], enum: UserRole, default: [UserRole.VIEWER] })
  roles: UserRole[];

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  @Prop({ default: 'fr' })
  locale: string;

  @Prop({ type: String, select: false })
  refreshTokenHash?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
