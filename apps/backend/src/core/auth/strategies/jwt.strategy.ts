import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', 'default-secret'),
    });
  }

  async validate(payload: { sub: string; tenantId: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = user.userRoles.flatMap((ur) => {
      try {
        const perms = JSON.parse(ur.role.permissions as string);
        return Array.isArray(perms) ? perms : [];
      } catch {
        return [];
      }
    });

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles,
      permissions: [...new Set(permissions)],
    };
  }
}
