import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(tenantSlug: string, dto: LoginDto): Promise<AuthTokens> {
    const tenant = await this.tenantsService.findBySlug(tenantSlug);
    const user = await this.usersService.findByEmail(String(tenant._id), dto.email);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = {
      sub: String(user._id),
      email: user.email,
      tenantId: String(tenant._id),
      roles: user.roles,
      permissions: user.permissions,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('auth.jwtSecret'),
        expiresIn: this.config.get('auth.jwtExpiresIn'),
      }),
      this.jwtService.signAsync(
        { sub: payload.sub },
        {
          secret: this.config.get('auth.jwtRefreshSecret'),
          expiresIn: this.config.get('auth.jwtRefreshExpiresIn'),
        },
      ),
    ]);

    await this.usersService.updateRefreshToken(String(user._id), refreshToken);

    return { accessToken, refreshToken, expiresIn: 900 };
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }
}
