import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TaxService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, countryCode?: string) {
    const where: any = { tenantId };
    if (countryCode) where.countryCode = countryCode;
    return this.prisma.taxRule.findMany({
      where,
      orderBy: [{ countryCode: 'asc' }, { rate: 'asc' }],
    });
  }

  async findById(tenantId: string, id: string) {
    const rule = await this.prisma.taxRule.findFirst({ where: { id, tenantId } });
    if (!rule) throw new NotFoundException('Tax rule not found');
    return rule;
  }

  async create(
    tenantId: string,
    data: {
      name: string;
      rate: number;
      countryCode: string;
      type?: string;
      isDefault?: boolean;
    },
  ) {
    return this.prisma.taxRule.create({
      data: { tenantId, ...data } as any,
    });
  }

  async update(tenantId: string, id: string, data: Partial<{ name: string; rate: number; isActive: boolean }>) {
    await this.findById(tenantId, id);
    return this.prisma.taxRule.update({ where: { id }, data });
  }
}
