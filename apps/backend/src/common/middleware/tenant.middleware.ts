import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Extracts the tenant identifier from the `X-Tenant-ID` header and
 * attaches it to the request object so downstream services can use it
 * for data isolation.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request & { tenantId?: string }, _res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string | undefined;

    // Public endpoints (auth/login, healthcheck) do not require tenant header
    const publicPaths = ['/api/v1/auth/login', '/api/v1/auth/register', '/health'];
    const isPublic = publicPaths.some((p) => req.path.startsWith(p));

    if (!isPublic && !tenantId) {
      throw new BadRequestException('Missing X-Tenant-ID header');
    }

    req.tenantId = tenantId;
    next();
  }
}
