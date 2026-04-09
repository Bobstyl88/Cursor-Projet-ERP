import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, PERMISSIONS_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length && !requiredPermissions?.length) return true;

    const user: JwtPayload = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('No user in request context');

    if (requiredRoles?.length) {
      const hasRole = requiredRoles.some((r) => user.roles?.includes(r));
      if (!hasRole) throw new ForbiddenException('Insufficient role');
    }

    if (requiredPermissions?.length) {
      const hasPerm = requiredPermissions.every((p) => user.permissions?.includes(p));
      if (!hasPerm) throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
