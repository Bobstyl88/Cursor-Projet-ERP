import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CurrencyService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.tenantCurrency.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
    });
  }

  async findByCode(tenantId: string, code: string) {
    const currency = await this.prisma.tenantCurrency.findFirst({
      where: { tenantId, code },
    });
    if (!currency) throw new NotFoundException('Currency not found');
    return currency;
  }

  async create(
    tenantId: string,
    data: {
      code: string;
      name: string;
      symbol: string;
      exchangeRate?: number;
      isBase?: boolean;
    },
  ) {
    return this.prisma.tenantCurrency.create({
      data: { tenantId, ...data },
    });
  }

  async updateRate(tenantId: string, code: string, exchangeRate: number) {
    const currency = await this.findByCode(tenantId, code);
    return this.prisma.tenantCurrency.update({
      where: { id: currency.id },
      data: { exchangeRate },
    });
  }

  async convert(
    tenantId: string,
    amount: number,
    fromCode: string,
    toCode: string,
  ): Promise<{ amount: number; rate: number }> {
    const [from, to] = await Promise.all([
      this.findByCode(tenantId, fromCode),
      this.findByCode(tenantId, toCode),
    ]);

    const rate = Number(to.exchangeRate) / Number(from.exchangeRate);
    return { amount: amount * rate, rate };
  }
}
