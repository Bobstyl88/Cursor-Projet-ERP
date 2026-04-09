import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const headerTenantId = request.headers['x-tenant-id'] as string | undefined;
    const userTenantId = user.tenantId as string | undefined;

    if (headerTenantId && userTenantId && headerTenantId !== userTenantId) {
      throw new ForbiddenException(
        'Tenant mismatch: you do not have access to this tenant',
      );
    }

    const resolvedTenantId = headerTenantId || userTenantId;

    if (!resolvedTenantId) {
      throw new BadRequestException(
        'Tenant context required: provide X-Tenant-Id header or authenticate with a tenant-bound token',
      );
    }

    request.tenantId = resolvedTenantId;

    return true;
  }
}
