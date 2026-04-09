import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SequenceService {
  constructor(private prisma: PrismaService) {}

  async getNextNumber(tenantId: string, type: string): Promise<string> {
    const sequence = await this.prisma.sequence.upsert({
      where: { tenantId_type: { tenantId, type } },
      create: {
        tenantId,
        type,
        prefix: this.getPrefix(type),
        current: 1,
        padding: 5,
      },
      update: { current: { increment: 1 } },
    });

    const paddedNumber = String(sequence.current).padStart(
      sequence.padding,
      '0',
    );
    return `${sequence.prefix}${paddedNumber}`;
  }

  private getPrefix(type: string): string {
    const prefixes: Record<string, string> = {
      quotation: 'QUO-',
      sales_order: 'SO-',
      purchase_order: 'PO-',
      invoice_sales: 'INV-',
      invoice_purchase: 'BILL-',
      credit_note: 'CN-',
      journal_entry: 'JE-',
    };
    return prefixes[type] || `${type.toUpperCase()}-`;
  }
}
