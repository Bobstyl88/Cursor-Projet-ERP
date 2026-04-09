import { Request } from 'express';

export interface TenantRequest extends Request {
  tenantId: string;
  user: {
    id: string;
    tenantId: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
}
