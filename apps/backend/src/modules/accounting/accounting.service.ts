import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { SequenceService } from '../../common/utils/sequence.service';
import { PaginationParams, PaginatedResult } from '../../common/interfaces/pagination.interface';

@Injectable()
export class AccountingService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private sequence: SequenceService,
  ) {}

  // ── Chart of Accounts ────────────────────────────────────────────────

  async getChartOfAccounts(tenantId: string) {
    return this.prisma.chartOfAccount.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
      include: { children: true },
    });
  }

  async createAccount(
    tenantId: string,
    userId: string,
    data: {
      code: string;
      name: string;
      type: string;
      parentId?: string;
      description?: string;
    },
  ) {
    const account = await this.prisma.chartOfAccount.create({
      data: { tenantId, ...data } as any,
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'CREATE',
      entity: 'ChartOfAccount',
      entityId: account.id,
      newValues: { code: account.code, name: account.name },
    });

    return account;
  }

  // ── Journal Entries ──────────────────────────────────────────────────

  async getJournalEntries(
    tenantId: string,
    params: PaginationParams & { status?: string },
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'date', sortOrder = 'desc', status } = params;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          lines: {
            include: { account: { select: { id: true, code: true, name: true } } },
          },
          invoice: { select: { id: true, number: true, type: true } },
        },
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createJournalEntry(
    tenantId: string,
    userId: string,
    data: {
      date: Date;
      description: string;
      reference?: string;
      referenceId?: string;
      invoiceId?: string;
      lines: Array<{
        accountId: string;
        debit: number;
        credit: number;
        description?: string;
      }>;
    },
  ) {
    const totalDebit = data.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Journal entry must balance: debit=${totalDebit}, credit=${totalCredit}`,
      );
    }

    const number = await this.sequence.getNextNumber(tenantId, 'journal_entry');

    const entry = await this.prisma.journalEntry.create({
      data: {
        tenantId,
        number,
        date: data.date,
        description: data.description,
        reference: data.reference,
        referenceId: data.referenceId,
        invoiceId: data.invoiceId,
        lines: { create: data.lines },
      },
      include: { lines: { include: { account: true } } },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'CREATE',
      entity: 'JournalEntry',
      entityId: entry.id,
      newValues: { number: entry.number, description: entry.description },
    });

    return entry;
  }

  async postJournalEntry(tenantId: string, id: string, userId: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, tenantId },
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    if (entry.status !== 'DRAFT') {
      throw new BadRequestException('Only draft entries can be posted');
    }

    const updated = await this.prisma.journalEntry.update({
      where: { id },
      data: { status: 'POSTED' },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'POST',
      entity: 'JournalEntry',
      entityId: id,
      oldValues: { status: 'DRAFT' },
      newValues: { status: 'POSTED' },
    });

    return updated;
  }

  // ── Automated Journal Entry Creation ──────────────────────────────────

  async createJournalEntryFromInvoice(
    tenantId: string,
    invoiceId: string,
    userId: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lines: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { tenantId },
    });

    const accountMap = new Map(accounts.map((a) => [a.code, a.id]));
    const lines: Array<{ accountId: string; debit: number; credit: number; description?: string }> = [];

    if (invoice.type === 'SALES') {
      lines.push({
        accountId: accountMap.get('1200')!, // Accounts Receivable
        debit: Number(invoice.total),
        credit: 0,
        description: `Invoice ${invoice.number} - Receivable`,
      });

      lines.push({
        accountId: accountMap.get('4000')!, // Sales Revenue
        debit: 0,
        credit: Number(invoice.subtotal),
        description: `Invoice ${invoice.number} - Revenue`,
      });

      if (Number(invoice.taxTotal) > 0) {
        lines.push({
          accountId: accountMap.get('2100')!, // Tax Payable
          debit: 0,
          credit: Number(invoice.taxTotal),
          description: `Invoice ${invoice.number} - Tax`,
        });
      }
    } else if (invoice.type === 'PURCHASE') {
      lines.push({
        accountId: accountMap.get('5100')!, // Purchase Expenses
        debit: Number(invoice.subtotal),
        credit: 0,
        description: `Bill ${invoice.number} - Expense`,
      });

      if (Number(invoice.taxTotal) > 0) {
        lines.push({
          accountId: accountMap.get('2100')!, // Tax (deductible)
          debit: Number(invoice.taxTotal),
          credit: 0,
          description: `Bill ${invoice.number} - Tax deductible`,
        });
      }

      lines.push({
        accountId: accountMap.get('2000')!, // Accounts Payable
        debit: 0,
        credit: Number(invoice.total),
        description: `Bill ${invoice.number} - Payable`,
      });
    }

    return this.createJournalEntry(tenantId, userId, {
      date: new Date(),
      description: `Auto: Invoice ${invoice.number}`,
      reference: 'Invoice',
      referenceId: invoiceId,
      invoiceId,
      lines,
    });
  }

  async createPaymentJournalEntry(
    tenantId: string,
    invoiceId: string,
    paymentId: string,
    amount: number,
    userId: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { tenantId },
    });
    const accountMap = new Map(accounts.map((a) => [a.code, a.id]));

    const lines: Array<{ accountId: string; debit: number; credit: number; description?: string }> = [];

    if (invoice.type === 'SALES') {
      lines.push({
        accountId: accountMap.get('1100')!, // Bank
        debit: amount,
        credit: 0,
        description: `Payment received for ${invoice.number}`,
      });
      lines.push({
        accountId: accountMap.get('1200')!, // Accounts Receivable
        debit: 0,
        credit: amount,
        description: `Payment received for ${invoice.number}`,
      });
    } else {
      lines.push({
        accountId: accountMap.get('2000')!, // Accounts Payable
        debit: amount,
        credit: 0,
        description: `Payment sent for ${invoice.number}`,
      });
      lines.push({
        accountId: accountMap.get('1100')!, // Bank
        debit: 0,
        credit: amount,
        description: `Payment sent for ${invoice.number}`,
      });
    }

    return this.createJournalEntry(tenantId, userId, {
      date: new Date(),
      description: `Auto: Payment for ${invoice.number}`,
      reference: 'Payment',
      referenceId: paymentId,
      invoiceId,
      lines,
    });
  }

  // ── Trial Balance ────────────────────────────────────────────────────

  async getTrialBalance(tenantId: string) {
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { tenantId, isActive: true },
      orderBy: { code: 'asc' },
    });

    const postedEntries = await this.prisma.journalEntryLine.findMany({
      where: {
        journalEntry: { tenantId, status: 'POSTED' },
      },
      select: {
        accountId: true,
        debit: true,
        credit: true,
      },
    });

    const balances = new Map<string, { debit: number; credit: number }>();
    for (const line of postedEntries) {
      const current = balances.get(line.accountId) || { debit: 0, credit: 0 };
      current.debit += Number(line.debit);
      current.credit += Number(line.credit);
      balances.set(line.accountId, current);
    }

    return accounts.map((account) => {
      const balance = balances.get(account.id) || { debit: 0, credit: 0 };
      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        debit: balance.debit,
        credit: balance.credit,
        balance: balance.debit - balance.credit,
      };
    });
  }
}
