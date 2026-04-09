import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as any).user as JwtPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
