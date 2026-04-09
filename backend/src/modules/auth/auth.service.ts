import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';
import { hashPassword, comparePassword } from '@/common/utils/hash.util';
import { RegisterDto } from './dto/register.dto';

export interface TokenPayload {
  sub: string;
  email: string;
  tenantId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends TokenPair {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    tenantId: string;
    role: string;
  };
}

const DEFAULT_ROLES = [
  { name: 'Admin', description: 'Full system access', isSystem: true },
  { name: 'Manager', description: 'Managerial access', isSystem: true },
  { name: 'Accountant', description: 'Accounting and finance access', isSystem: true },
  { name: 'User', description: 'Basic user access', isSystem: true },
];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const slug = dto.tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existingTenant = await this.prisma.tenant.findFirst({
      where: { slug, deletedAt: null },
    });

    if (existingTenant) {
      throw new ConflictException('A tenant with this name already exists');
    }

    const passwordHash = await hashPassword(dto.password);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug,
          settings: {
            currency: 'USD',
            fiscalYearStart: '01-01',
            timezone: 'UTC',
            dateFormat: 'YYYY-MM-DD',
          },
        },
      });

      const roles = await Promise.all(
        DEFAULT_ROLES.map((role) =>
          tx.role.create({
            data: {
              name: role.name,
              description: role.description,
              isSystem: role.isSystem,
              tenantId: tenant.id,
            },
          }),
        ),
      );

      const adminRole = roles.find((r) => r.name === 'Admin')!;

      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          tenantId: tenant.id,
          roleId: adminRole.id,
          emailVerified: true,
        },
      });

      return { tenant, user, adminRole };
    });

    const tokens = await this.generateTokens({
      sub: result.user.id,
      email: result.user.email,
      tenantId: result.tenant.id,
    });

    this.logger.log(`New tenant registered: ${result.tenant.name} (${result.tenant.id})`);

    return {
      ...tokens,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        tenantId: result.tenant.id,
        role: result.adminRole.name,
      },
    };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        role: user.role.name,
      },
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true, deletedAt: null },
      include: { role: true },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async refreshToken(userId: string, tenantId: string): Promise<TokenPair> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: true, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    return this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
    });
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isOldPasswordValid = await comparePassword(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  async getProfile(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
        tenant: {
          select: { id: true, name: true, slug: true, plan: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const permissions = user.role.rolePermissions.map(
      (rp) => `${rp.permission.resource}:${rp.permission.action}`,
    );

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      role: {
        id: user.role.id,
        name: user.role.name,
      },
      permissions,
      tenant: user.tenant,
    };
  }

  async generateTokens(payload: TokenPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get<string>('jwt.expiration', '24h'),
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
