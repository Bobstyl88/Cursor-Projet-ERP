import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

/**
 * Injects the resolved tenantId into the request object so that downstream
 * services can access it via `request.tenantId` without re-resolving.
 *
 * Resolution priority:
 *   1. Already set by TenantGuard (request.tenantId)
 *   2. JWT payload (request.user.tenantId)
 *   3. X-Tenant-Id header
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantContextInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const req = request as any;

    if (!req.tenantId) {
      const fromUser = req.user?.tenantId;
      const fromHeader = request.headers['x-tenant-id'] as string | undefined;

      req.tenantId = fromUser || fromHeader || null;
    }

    if (req.tenantId) {
      this.injectTenantIntoBody(req);
    }

    return next.handle();
  }

  /**
   * For write operations, automatically inject tenantId into the request body
   * if the body is an object and doesn't already contain a tenantId.
   */
  private injectTenantIntoBody(request: any): void {
    const writeMethods = new Set(['POST', 'PUT', 'PATCH']);
    const method = request.method?.toUpperCase();

    if (
      writeMethods.has(method) &&
      request.body &&
      typeof request.body === 'object' &&
      !Array.isArray(request.body) &&
      !request.body.tenantId
    ) {
      request.body.tenantId = request.tenantId;
    }
  }
}
