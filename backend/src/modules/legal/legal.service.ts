import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Country, TaxRate } from '@prisma/client';
import { CreateCountryDto, CreateTaxRateDto, UpdateTaxRateDto } from './dto';

@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Countries ───────────────────────────────────────────────

  async createCountry(dto: CreateCountryDto): Promise<Country> {
    const existing = await this.prisma.country.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Country with code "${dto.code}" already exists`);
    }

    return this.prisma.country.create({
      data: {
        code: dto.code,
        name: dto.name,
        currencyCode: dto.currencyCode,
        taxLabel: dto.taxLabel,
      },
    });
  }

  async findAllCountries(): Promise<Country[]> {
    return this.prisma.country.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // ── Tax Rates ───────────────────────────────────────────────

  async createTaxRate(tenantId: string, dto: CreateTaxRateDto): Promise<TaxRate> {
    const existing = await this.prisma.taxRate.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });

    if (existing) {
      throw new ConflictException(`Tax rate with code "${dto.code}" already exists`);
    }

    if (dto.isDefault) {
      await this.prisma.taxRate.updateMany({
        where: { tenantId, isDefault: true, type: dto.type },
        data: { isDefault: false },
      });
    }

    return this.prisma.taxRate.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        rate: dto.rate,
        type: dto.type,
        country: dto.country,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async findAllTaxRates(tenantId: string): Promise<TaxRate[]> {
    return this.prisma.taxRate.findMany({
      where: { tenantId, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async updateTaxRate(
    tenantId: string,
    id: string,
    dto: UpdateTaxRateDto,
  ): Promise<TaxRate> {
    const taxRate = await this.prisma.taxRate.findFirst({
      where: { id, tenantId },
    });

    if (!taxRate) {
      throw new NotFoundException(`Tax rate with ID "${id}" not found`);
    }

    if (dto.code) {
      const existing = await this.prisma.taxRate.findFirst({
        where: { tenantId, code: dto.code, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Tax rate with code "${dto.code}" already exists`);
      }
    }

    if (dto.isDefault) {
      await this.prisma.taxRate.updateMany({
        where: {
          tenantId,
          isDefault: true,
          type: dto.type ?? taxRate.type,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.taxRate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.rate !== undefined && { rate: dto.rate }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });
  }

  async removeTaxRate(tenantId: string, id: string): Promise<TaxRate> {
    const taxRate = await this.prisma.taxRate.findFirst({
      where: { id, tenantId },
    });

    if (!taxRate) {
      throw new NotFoundException(`Tax rate with ID "${id}" not found`);
    }

    return this.prisma.taxRate.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
