import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { PrismaService } from '../../database/prisma.service';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    if (!WRITE_METHODS.has(method)) {
      return next.handle();
    }

    const startTime = Date.now();
    const user = (request as any).user;
    const tenantId = (request as any).tenantId;

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          this.logAuditEntry({
            action: method,
            resource: request.path,
            userId: user?.sub ?? 'anonymous',
            tenantId: tenantId ?? null,
            requestBody: this.sanitizeBody(request.body),
            responseStatus: context.switchToHttp().getResponse().statusCode,
            durationMs: Date.now() - startTime,
            ipAddress: request.ip ?? request.socket.remoteAddress ?? 'unknown',
            userAgent: request.headers['user-agent'] ?? 'unknown',
          });
        },
        error: (error) => {
          this.logAuditEntry({
            action: method,
            resource: request.path,
            userId: user?.sub ?? 'anonymous',
            tenantId: tenantId ?? null,
            requestBody: this.sanitizeBody(request.body),
            responseStatus: error.status ?? 500,
            durationMs: Date.now() - startTime,
            ipAddress: request.ip ?? request.socket.remoteAddress ?? 'unknown',
            userAgent: request.headers['user-agent'] ?? 'unknown',
            errorMessage: error.message,
          });
        },
      }),
    );
  }

  private async logAuditEntry(entry: {
    action: string;
    resource: string;
    userId: string;
    tenantId: string | null;
    requestBody: Record<string, any>;
    responseStatus: number;
    durationMs: number;
    ipAddress: string;
    userAgent: string;
    errorMessage?: string;
  }) {
    try {
      this.logger.log(
        `[AUDIT] ${entry.action} ${entry.resource} by ${entry.userId} ` +
          `(tenant: ${entry.tenantId ?? 'none'}) => ${entry.responseStatus} ` +
          `in ${entry.durationMs}ms`,
      );

      /* When the AuditLog model exists in the Prisma schema, persist the entry:
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          resource: entry.resource,
          userId: entry.userId,
          tenantId: entry.tenantId,
          requestBody: entry.requestBody as any,
          responseStatus: entry.responseStatus,
          durationMs: entry.durationMs,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          errorMessage: entry.errorMessage,
        },
      });
      */
    } catch (err) {
      this.logger.error('Failed to write audit log entry', err);
    }
  }

  private sanitizeBody(body: any): Record<string, any> {
    if (!body || typeof body !== 'object') {
      return {};
    }

    const sanitized = { ...body };
    const sensitiveKeys = [
      'password',
      'passwordConfirm',
      'secret',
      'token',
      'creditCard',
      'ssn',
    ];

    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
