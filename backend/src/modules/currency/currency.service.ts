import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Prisma, Currency, ExchangeRate } from '@prisma/client';
import { CreateCurrencyDto, CreateExchangeRateDto, ConvertCurrencyDto } from './dto';

@Injectable()
export class CurrencyService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Currencies ──────────────────────────────────────────────

  async createCurrency(dto: CreateCurrencyDto): Promise<Currency> {
    const existing = await this.prisma.currency.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Currency with code "${dto.code}" already exists`);
    }

    return this.prisma.currency.create({
      data: {
        code: dto.code,
        name: dto.name,
        symbol: dto.symbol,
        decimalPlaces: dto.decimalPlaces ?? 2,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAllCurrencies(): Promise<Currency[]> {
    return this.prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  // ── Exchange Rates ──────────────────────────────────────────

  async createExchangeRate(
    tenantId: string,
    dto: CreateExchangeRateDto,
  ): Promise<ExchangeRate> {
    return this.prisma.exchangeRate.upsert({
      where: {
        tenantId_baseCurrencyCode_targetCurrencyCode_date: {
          tenantId,
          baseCurrencyCode: dto.baseCurrencyCode,
          targetCurrencyCode: dto.targetCurrencyCode,
          date: new Date(dto.date),
        },
      },
      update: { rate: dto.rate },
      create: {
        tenantId,
        baseCurrencyCode: dto.baseCurrencyCode,
        targetCurrencyCode: dto.targetCurrencyCode,
        rate: dto.rate,
        date: new Date(dto.date),
      },
    });
  }

  async findExchangeRates(
    tenantId: string,
    filters?: {
      baseCurrencyCode?: string;
      targetCurrencyCode?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ): Promise<ExchangeRate[]> {
    const where: Prisma.ExchangeRateWhereInput = { tenantId };

    if (filters?.baseCurrencyCode) {
      where.baseCurrencyCode = filters.baseCurrencyCode;
    }

    if (filters?.targetCurrencyCode) {
      where.targetCurrencyCode = filters.targetCurrencyCode;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
    }

    return this.prisma.exchangeRate.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 100,
    });
  }

  // ── Conversion ──────────────────────────────────────────────

  async convert(
    tenantId: string,
    dto: ConvertCurrencyDto,
  ): Promise<{ amount: number; from: string; to: string; rate: string; result: string; date: string }> {
    if (dto.from === dto.to) {
      return {
        amount: dto.amount,
        from: dto.from,
        to: dto.to,
        rate: '1',
        result: String(dto.amount),
        date: dto.date || new Date().toISOString().split('T')[0],
      };
    }

    const rate = await this.findRate(tenantId, dto.from, dto.to, dto.date);

    if (!rate) {
      throw new NotFoundException(
        `Exchange rate not found for ${dto.from} to ${dto.to}`,
      );
    }

    const result = new Prisma.Decimal(dto.amount)
      .mul(new Prisma.Decimal(rate.rate.toString()));

    return {
      amount: dto.amount,
      from: dto.from,
      to: dto.to,
      rate: rate.rate.toString(),
      result: result.toString(),
      date: rate.date.toISOString().split('T')[0],
    };
  }

  async getRate(
    tenantId: string,
    from: string,
    to: string,
    date?: string,
  ): Promise<Prisma.Decimal> {
    if (from === to) return new Prisma.Decimal(1);

    const rate = await this.findRate(tenantId, from, to, date);
    if (!rate) {
      throw new NotFoundException(`Exchange rate not found for ${from} to ${to}`);
    }

    return new Prisma.Decimal(rate.rate.toString());
  }

  private async findRate(
    tenantId: string,
    from: string,
    to: string,
    date?: string,
  ): Promise<ExchangeRate | null> {
    const dateFilter = date ? new Date(date) : new Date();

    let rate = await this.prisma.exchangeRate.findFirst({
      where: {
        tenantId,
        baseCurrencyCode: from,
        targetCurrencyCode: to,
        date: { lte: dateFilter },
      },
      orderBy: { date: 'desc' },
    });

    if (!rate) {
      const inverseRate = await this.prisma.exchangeRate.findFirst({
        where: {
          tenantId,
          baseCurrencyCode: to,
          targetCurrencyCode: from,
          date: { lte: dateFilter },
        },
        orderBy: { date: 'desc' },
      });

      if (inverseRate) {
        const invertedRate = new Prisma.Decimal(1).div(
          new Prisma.Decimal(inverseRate.rate.toString()),
        );
        return {
          ...inverseRate,
          baseCurrencyCode: from,
          targetCurrencyCode: to,
          rate: invertedRate,
        };
      }
    }

    return rate;
  }
}
