import { Request } from 'express';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

export interface TenantRequest extends Request {
  user: AuthenticatedUser;
  tenantId: string;
}
