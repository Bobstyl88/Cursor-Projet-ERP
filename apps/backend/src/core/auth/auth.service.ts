import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.companySlug },
    });
    if (existingTenant) {
      throw new ConflictException('Company slug already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName,
          slug: dto.companySlug,
        },
      });

      const adminRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Admin',
          description: 'Full system access',
          permissions: JSON.stringify(['*']),
          isSystem: true,
        },
      });

      await this.seedDefaultRoles(tx, tenant.id);

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          userRoles: {
            create: { roleId: adminRole.id },
          },
        },
      });

      await this.seedChartOfAccounts(tx, tenant.id);
      await this.seedDefaultCurrencies(tx, tenant.id);
      await this.seedDefaultTaxRules(tx, tenant.id);

      return { tenant, user };
    });

    const tokens = await this.generateTokens(
      result.user.id,
      result.tenant.id,
      result.user.email,
    );

    return {
      ...tokens,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, tenant: { slug: dto.tenantSlug } },
      include: {
        tenant: true,
        userRoles: { include: { role: true } },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.tenant.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account suspended');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.tenantId,
      user.email,
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.userRoles.map((ur) => ur.role.name),
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
      },
    };
  }

  private async generateTokens(
    userId: string,
    tenantId: string,
    email: string,
  ) {
    const payload = { sub: userId, tenantId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);

    return { accessToken, refreshToken };
  }

  private async seedDefaultRoles(tx: any, tenantId: string) {
    const roles = [
      {
        name: 'Sales Manager',
        description: 'Manage sales operations',
        permissions: JSON.stringify([
          'sales:read',
          'sales:write',
          'contacts:read',
          'contacts:write',
          'products:read',
          'invoices:read',
          'invoices:write',
        ]),
      },
      {
        name: 'Accountant',
        description: 'Manage financial operations',
        permissions: JSON.stringify([
          'accounting:read',
          'accounting:write',
          'invoices:read',
          'invoices:write',
          'reporting:read',
        ]),
      },
      {
        name: 'Warehouse Manager',
        description: 'Manage inventory operations',
        permissions: JSON.stringify([
          'inventory:read',
          'inventory:write',
          'products:read',
          'products:write',
          'purchasing:read',
        ]),
      },
      {
        name: 'Viewer',
        description: 'Read-only access',
        permissions: JSON.stringify([
          'sales:read',
          'contacts:read',
          'products:read',
          'inventory:read',
          'invoices:read',
          'accounting:read',
          'reporting:read',
        ]),
      },
    ];

    for (const role of roles) {
      await tx.role.create({
        data: { tenantId, ...role, isSystem: true },
      });
    }
  }

  private async seedChartOfAccounts(tx: any, tenantId: string) {
    const accounts = [
      { code: '1000', name: 'Cash', type: 'ASSET' },
      { code: '1100', name: 'Bank Account', type: 'ASSET' },
      { code: '1200', name: 'Accounts Receivable', type: 'ASSET' },
      { code: '1300', name: 'Inventory', type: 'ASSET' },
      { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
      { code: '2100', name: 'Tax Payable', type: 'LIABILITY' },
      { code: '2200', name: 'Unearned Revenue', type: 'LIABILITY' },
      { code: '3000', name: 'Owner Equity', type: 'EQUITY' },
      { code: '3100', name: 'Retained Earnings', type: 'EQUITY' },
      { code: '4000', name: 'Sales Revenue', type: 'REVENUE' },
      { code: '4100', name: 'Service Revenue', type: 'REVENUE' },
      { code: '4200', name: 'Other Income', type: 'REVENUE' },
      { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' },
      { code: '5100', name: 'Purchase Expenses', type: 'EXPENSE' },
      { code: '6000', name: 'Operating Expenses', type: 'EXPENSE' },
      { code: '6100', name: 'Salary Expenses', type: 'EXPENSE' },
      { code: '6200', name: 'Rent Expenses', type: 'EXPENSE' },
    ];

    for (const account of accounts) {
      await tx.chartOfAccount.create({
        data: { tenantId, ...account },
      });
    }
  }

  private async seedDefaultCurrencies(tx: any, tenantId: string) {
    const currencies = [
      { code: 'EUR', name: 'Euro', symbol: '€', isBase: true },
      { code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 1.08 },
      {
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        exchangeRate: 0.86,
      },
      {
        code: 'MAD',
        name: 'Moroccan Dirham',
        symbol: 'MAD',
        exchangeRate: 10.8,
      },
      { code: 'XOF', name: 'CFA Franc', symbol: 'CFA', exchangeRate: 655.96 },
    ];

    for (const currency of currencies) {
      await tx.tenantCurrency.create({
        data: { tenantId, ...currency },
      });
    }
  }

  private async seedDefaultTaxRules(tx: any, tenantId: string) {
    const taxes = [
      {
        name: 'TVA 20%',
        rate: 20,
        countryCode: 'FR',
        type: 'VAT',
        isDefault: true,
      },
      { name: 'TVA 10%', rate: 10, countryCode: 'FR', type: 'VAT' },
      { name: 'TVA 5.5%', rate: 5.5, countryCode: 'FR', type: 'VAT' },
      { name: 'VAT 20%', rate: 20, countryCode: 'MA', type: 'VAT' },
      { name: 'VAT 0%', rate: 0, countryCode: 'FR', type: 'EXEMPT' },
    ];

    for (const tax of taxes) {
      await tx.taxRule.create({
        data: { tenantId, ...tax },
      });
    }
  }
}
