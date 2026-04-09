import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

/**
 * Logs every mutating request with user context for audit trail.
 * In production this should write to a dedicated audit collection.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, user } = request as any;
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    if (!mutatingMethods.includes(method)) return next.handle();

    const userId = user?.sub ?? 'anonymous';
    const tenantId = (request.headers['x-tenant-id'] as string) ?? 'none';
    const startMs = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startMs;
        this.logger.log(
          JSON.stringify({ tenantId, userId, method, url, durationMs: duration }),
        );
      }),
    );
  }
}
