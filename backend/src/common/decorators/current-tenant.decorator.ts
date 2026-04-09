import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<Request>();

    const tenantFromUser = (request as any).user?.tenantId;
    if (tenantFromUser) {
      return tenantFromUser;
    }

    const tenantFromHeader = request.headers['x-tenant-id'] as string;
    if (tenantFromHeader) {
      return tenantFromHeader;
    }

    return (request as any).tenantId ?? null;
  },
);
