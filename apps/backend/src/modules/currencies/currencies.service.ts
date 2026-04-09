import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Currency, CurrencyDocument } from './schemas/currency.schema';

@Injectable()
export class CurrenciesService {
  constructor(@InjectModel(Currency.name) private currencyModel: Model<CurrencyDocument>) {}

  async upsertCurrency(tenantId: string, data: Partial<Currency>): Promise<CurrencyDocument> {
    return this.currencyModel.findOneAndUpdate(
      { tenantId, code: (data.code as string).toUpperCase() },
      { tenantId, ...data, rateDate: new Date() },
      { upsert: true, new: true },
    ) as Promise<CurrencyDocument>;
  }

  async findAll(tenantId: string): Promise<CurrencyDocument[]> {
    return this.currencyModel.find({ tenantId, isActive: true }).exec();
  }

  async getRate(tenantId: string, fromCode: string, toCode: string): Promise<number> {
    if (fromCode === toCode) return 1;

    const [from, to] = await Promise.all([
      this.currencyModel.findOne({ tenantId, code: fromCode.toUpperCase() }),
      this.currencyModel.findOne({ tenantId, code: toCode.toUpperCase() }),
    ]);

    if (!from || !to) throw new NotFoundException(`Currency not configured: ${fromCode} or ${toCode}`);

    // Convert via base currency
    return to.rateToBase / from.rateToBase;
  }

  async convert(tenantId: string, amount: number, from: string, to: string): Promise<number> {
    const rate = await this.getRate(tenantId, from, to);
    return Math.round(amount * rate * 100) / 100;
  }

  /** Seed common currencies for a new tenant */
  async seedDefaults(tenantId: string, baseCurrency = 'EUR'): Promise<void> {
    const defaults = [
      { code: 'EUR', name: 'Euro', symbol: '€', rateToBase: 1, isBaseCurrency: true },
      { code: 'USD', name: 'US Dollar', symbol: '$', rateToBase: 1.08 },
      { code: 'GBP', name: 'British Pound', symbol: '£', rateToBase: 0.86 },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', rateToBase: 0.96 },
      { code: 'MAD', name: 'Dirham marocain', symbol: 'د.م.', rateToBase: 10.9 },
    ];
    await Promise.all(defaults.map((c) => this.upsertCurrency(tenantId, c)));
  }
}
