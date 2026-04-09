import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Prisma, AccountCategory, JournalEntry, FiscalYear } from '@prisma/client';
import { buildPaginatedResult, PaginatedResult } from '@/common/interfaces/pagination.interface';
import {
  CreateAccountDto,
  UpdateAccountDto,
  CreateJournalEntryDto,
  QueryJournalEntryDto,
  ReportPeriodDto,
} from './dto';

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Chart of Accounts ───────────────────────────────────────

  async createAccount(
    tenantId: string,
    dto: CreateAccountDto,
  ): Promise<AccountCategory> {
    const existing = await this.prisma.accountCategory.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });

    if (existing) {
      throw new ConflictException(`Account with code "${dto.code}" already exists`);
    }

    if (dto.parentId) {
      const parent = await this.prisma.accountCategory.findFirst({
        where: { id: dto.parentId, tenantId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent account with ID "${dto.parentId}" not found`);
      }
    }

    return this.prisma.accountCategory.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId,
        isSystem: dto.isSystem ?? false,
      },
      include: { parent: true, children: true },
    });
  }

  async getChartOfAccounts(tenantId: string): Promise<AccountCategory[]> {
    return this.prisma.accountCategory.findMany({
      where: { tenantId, parentId: null },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true,
              },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async updateAccount(
    tenantId: string,
    id: string,
    dto: UpdateAccountDto,
  ): Promise<AccountCategory> {
    const account = await this.prisma.accountCategory.findFirst({
      where: { id, tenantId },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID "${id}" not found`);
    }

    if (account.isSystem) {
      throw new BadRequestException('System accounts cannot be modified');
    }

    if (dto.code) {
      const existing = await this.prisma.accountCategory.findFirst({
        where: { tenantId, code: dto.code, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Account with code "${dto.code}" already exists`);
      }
    }

    return this.prisma.accountCategory.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
      include: { parent: true, children: true },
    });
  }

  // ── Journal Entries ─────────────────────────────────────────

  async createJournalEntry(
    tenantId: string,
    userId: string,
    dto: CreateJournalEntryDto,
  ): Promise<JournalEntry> {
    this.validateDoubleEntry(dto.lines);

    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: { id: dto.fiscalYearId, tenantId, status: 'OPEN' },
    });

    if (!fiscalYear) {
      throw new BadRequestException('Fiscal year not found or is closed');
    }

    const entryDate = new Date(dto.date);
    if (entryDate < fiscalYear.startDate || entryDate > fiscalYear.endDate) {
      throw new BadRequestException('Entry date is outside the fiscal year period');
    }

    const number = await this.generateJournalNumber(tenantId);
    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    const lineData = dto.lines.map((line) => {
      totalDebit = totalDebit.add(new Prisma.Decimal(line.debit));
      totalCredit = totalCredit.add(new Prisma.Decimal(line.credit));

      const amountInCurrency = line.exchangeRate
        ? new Prisma.Decimal(line.debit || line.credit).mul(new Prisma.Decimal(line.exchangeRate))
        : new Prisma.Decimal(line.debit || line.credit);

      return {
        accountId: line.accountId,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
        currencyCode: line.currencyCode,
        exchangeRate: line.exchangeRate ?? 1,
        amountInCurrency,
      };
    });

    return this.prisma.journalEntry.create({
      data: {
        tenantId,
        number,
        date: entryDate,
        description: dto.description,
        reference: dto.reference,
        fiscalYearId: dto.fiscalYearId,
        createdBy: userId,
        totalDebit,
        totalCredit,
        lines: { create: lineData },
      },
      include: {
        lines: { include: { account: true } },
        fiscalYear: true,
      },
    });
  }

  async createJournalEntryFromInvoice(
    tenantId: string,
    userId: string,
    invoiceId: string,
  ): Promise<JournalEntry> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lines: { include: { product: true } } },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${invoiceId}" not found`);
    }

    const fiscalYear = await this.findOpenFiscalYear(tenantId, invoice.date);
    if (!fiscalYear) {
      throw new BadRequestException('No open fiscal year found for the invoice date');
    }

    const accounts = await this.prisma.accountCategory.findMany({
      where: { tenantId },
    });

    const findAccount = (type: string, hint: string) => {
      return accounts.find(
        (a) => a.type === type && a.code.includes(hint),
      ) || accounts.find((a) => a.type === type);
    };

    const number = await this.generateJournalNumber(tenantId);
    const lines: Array<{
      accountId: string;
      description: string;
      debit: Prisma.Decimal;
      credit: Prisma.Decimal;
      currencyCode: string;
      exchangeRate: Prisma.Decimal;
      amountInCurrency: Prisma.Decimal;
    }> = [];

    const subtotalAfterDiscount = new Prisma.Decimal(invoice.subtotal.toString())
      .minus(new Prisma.Decimal(invoice.discountTotal.toString()));

    if (invoice.type === 'SALE') {
      const arAccount = findAccount('ASSET', '1200');
      const revenueAccount = findAccount('REVENUE', '4000');
      const taxLiabilityAccount = findAccount('LIABILITY', '2200');

      if (!arAccount || !revenueAccount) {
        throw new BadRequestException(
          'Required accounts (Accounts Receivable, Revenue) not found in chart of accounts',
        );
      }

      lines.push({
        accountId: arAccount.id,
        description: `Invoice ${invoice.number} - Accounts Receivable`,
        debit: new Prisma.Decimal(invoice.total.toString()),
        credit: new Prisma.Decimal(0),
        currencyCode: invoice.currencyCode,
        exchangeRate: invoice.exchangeRate,
        amountInCurrency: new Prisma.Decimal(invoice.total.toString()),
      });

      lines.push({
        accountId: revenueAccount.id,
        description: `Invoice ${invoice.number} - Revenue`,
        debit: new Prisma.Decimal(0),
        credit: subtotalAfterDiscount,
        currencyCode: invoice.currencyCode,
        exchangeRate: invoice.exchangeRate,
        amountInCurrency: subtotalAfterDiscount,
      });

      if (taxLiabilityAccount && new Prisma.Decimal(invoice.taxTotal.toString()).greaterThan(0)) {
        lines.push({
          accountId: taxLiabilityAccount.id,
          description: `Invoice ${invoice.number} - Tax Liability`,
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal(invoice.taxTotal.toString()),
          currencyCode: invoice.currencyCode,
          exchangeRate: invoice.exchangeRate,
          amountInCurrency: new Prisma.Decimal(invoice.taxTotal.toString()),
        });
      }
    } else if (invoice.type === 'PURCHASE') {
      const expenseAccount = findAccount('EXPENSE', '5000');
      const taxAssetAccount = findAccount('ASSET', '1300');
      const apAccount = findAccount('LIABILITY', '2100');

      if (!expenseAccount || !apAccount) {
        throw new BadRequestException(
          'Required accounts (Expense, Accounts Payable) not found in chart of accounts',
        );
      }

      lines.push({
        accountId: expenseAccount.id,
        description: `Bill ${invoice.number} - Expense`,
        debit: subtotalAfterDiscount,
        credit: new Prisma.Decimal(0),
        currencyCode: invoice.currencyCode,
        exchangeRate: invoice.exchangeRate,
        amountInCurrency: subtotalAfterDiscount,
      });

      if (taxAssetAccount && new Prisma.Decimal(invoice.taxTotal.toString()).greaterThan(0)) {
        lines.push({
          accountId: taxAssetAccount.id,
          description: `Bill ${invoice.number} - Tax Asset`,
          debit: new Prisma.Decimal(invoice.taxTotal.toString()),
          credit: new Prisma.Decimal(0),
          currencyCode: invoice.currencyCode,
          exchangeRate: invoice.exchangeRate,
          amountInCurrency: new Prisma.Decimal(invoice.taxTotal.toString()),
        });
      }

      lines.push({
        accountId: apAccount.id,
        description: `Bill ${invoice.number} - Accounts Payable`,
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(invoice.total.toString()),
        currencyCode: invoice.currencyCode,
        exchangeRate: invoice.exchangeRate,
        amountInCurrency: new Prisma.Decimal(invoice.total.toString()),
      });
    }

    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);
    for (const line of lines) {
      totalDebit = totalDebit.add(line.debit);
      totalCredit = totalCredit.add(line.credit);
    }

    return this.prisma.journalEntry.create({
      data: {
        tenantId,
        number,
        date: invoice.date,
        description: `Auto-generated from ${invoice.type === 'SALE' ? 'Invoice' : 'Bill'} ${invoice.number}`,
        reference: invoice.number,
        sourceType: 'Invoice',
        sourceId: invoiceId,
        fiscalYearId: fiscalYear.id,
        createdBy: userId,
        status: 'POSTED',
        totalDebit,
        totalCredit,
        lines: { create: lines },
      },
      include: {
        lines: { include: { account: true } },
        fiscalYear: true,
      },
    });
  }

  async createPaymentJournalEntry(
    tenantId: string,
    userId: string,
    paymentId: string,
  ): Promise<JournalEntry> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID "${paymentId}" not found`);
    }

    const fiscalYear = await this.findOpenFiscalYear(tenantId, payment.date);
    if (!fiscalYear) {
      throw new BadRequestException('No open fiscal year found for the payment date');
    }

    const accounts = await this.prisma.accountCategory.findMany({
      where: { tenantId },
    });

    const findAccount = (type: string, hint: string) => {
      return accounts.find(
        (a) => a.type === type && a.code.includes(hint),
      ) || accounts.find((a) => a.type === type);
    };

    const number = await this.generateJournalNumber(tenantId);
    const lines: Array<{
      accountId: string;
      description: string;
      debit: Prisma.Decimal;
      credit: Prisma.Decimal;
      currencyCode: string;
      exchangeRate: Prisma.Decimal;
      amountInCurrency: Prisma.Decimal;
    }> = [];

    const bankAccount = findAccount('ASSET', '1100');
    const paymentAmount = new Prisma.Decimal(payment.amount.toString());

    if (!bankAccount) {
      throw new BadRequestException('Bank account not found in chart of accounts');
    }

    if (payment.invoice.type === 'SALE') {
      const arAccount = findAccount('ASSET', '1200');
      if (!arAccount) {
        throw new BadRequestException('Accounts Receivable account not found');
      }

      lines.push({
        accountId: bankAccount.id,
        description: `Payment for Invoice ${payment.invoice.number}`,
        debit: paymentAmount,
        credit: new Prisma.Decimal(0),
        currencyCode: payment.currencyCode,
        exchangeRate: payment.exchangeRate,
        amountInCurrency: paymentAmount,
      });

      lines.push({
        accountId: arAccount.id,
        description: `Payment for Invoice ${payment.invoice.number}`,
        debit: new Prisma.Decimal(0),
        credit: paymentAmount,
        currencyCode: payment.currencyCode,
        exchangeRate: payment.exchangeRate,
        amountInCurrency: paymentAmount,
      });
    } else {
      const apAccount = findAccount('LIABILITY', '2100');
      if (!apAccount) {
        throw new BadRequestException('Accounts Payable account not found');
      }

      lines.push({
        accountId: apAccount.id,
        description: `Payment for Bill ${payment.invoice.number}`,
        debit: paymentAmount,
        credit: new Prisma.Decimal(0),
        currencyCode: payment.currencyCode,
        exchangeRate: payment.exchangeRate,
        amountInCurrency: paymentAmount,
      });

      lines.push({
        accountId: bankAccount.id,
        description: `Payment for Bill ${payment.invoice.number}`,
        debit: new Prisma.Decimal(0),
        credit: paymentAmount,
        currencyCode: payment.currencyCode,
        exchangeRate: payment.exchangeRate,
        amountInCurrency: paymentAmount,
      });
    }

    return this.prisma.journalEntry.create({
      data: {
        tenantId,
        number,
        date: payment.date,
        description: `Payment for ${payment.invoice.type === 'SALE' ? 'Invoice' : 'Bill'} ${payment.invoice.number}`,
        reference: payment.reference,
        sourceType: 'Payment',
        sourceId: paymentId,
        fiscalYearId: fiscalYear.id,
        createdBy: userId,
        status: 'POSTED',
        totalDebit: paymentAmount,
        totalCredit: paymentAmount,
        lines: { create: lines },
      },
      include: {
        lines: { include: { account: true } },
        fiscalYear: true,
      },
    });
  }

  async findAllJournalEntries(
    tenantId: string,
    query: QueryJournalEntryDto,
  ): Promise<PaginatedResult<JournalEntry>> {
    const where: Prisma.JournalEntryWhereInput = { tenantId };

    if (query.status) where.status = query.status;
    if (query.fiscalYearId) where.fiscalYearId = query.fiscalYearId;
    if (query.search) {
      where.OR = [
        { number: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = new Date(query.dateFrom);
      if (query.dateTo) where.date.lte = new Date(query.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: {
          fiscalYear: { select: { id: true, name: true } },
          _count: { select: { lines: true } },
        },
        skip: query.skip,
        take: query.take,
        orderBy: query.orderBy,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return buildPaginatedResult(data as any, total, query);
  }

  async findOneJournalEntry(tenantId: string, id: string): Promise<JournalEntry> {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, tenantId },
      include: {
        lines: { include: { account: true } },
        fiscalYear: true,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Journal Entry with ID "${id}" not found`);
    }

    return entry;
  }

  async postJournalEntry(tenantId: string, id: string): Promise<JournalEntry> {
    const entry = await this.findOneJournalEntry(tenantId, id);

    if (entry.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT entries can be posted');
    }

    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: 'POSTED' },
      include: { lines: { include: { account: true } }, fiscalYear: true },
    });
  }

  async cancelJournalEntry(tenantId: string, id: string): Promise<JournalEntry> {
    const entry = await this.findOneJournalEntry(tenantId, id);

    if (entry.status === 'CANCELLED') {
      throw new BadRequestException('Entry is already cancelled');
    }

    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { lines: { include: { account: true } }, fiscalYear: true },
    });
  }

  // ── Fiscal Years ────────────────────────────────────────────

  async createFiscalYear(
    tenantId: string,
    data: { name: string; startDate: string; endDate: string },
  ): Promise<FiscalYear> {
    const overlap = await this.prisma.fiscalYear.findFirst({
      where: {
        tenantId,
        OR: [
          {
            startDate: { lte: new Date(data.endDate) },
            endDate: { gte: new Date(data.startDate) },
          },
        ],
      },
    });

    if (overlap) {
      throw new BadRequestException('Fiscal year period overlaps with an existing fiscal year');
    }

    return this.prisma.fiscalYear.create({
      data: {
        tenantId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });
  }

  async findAllFiscalYears(tenantId: string): Promise<FiscalYear[]> {
    return this.prisma.fiscalYear.findMany({
      where: { tenantId },
      orderBy: { startDate: 'desc' },
    });
  }

  async closeFiscalYear(tenantId: string, id: string): Promise<FiscalYear> {
    const fy = await this.prisma.fiscalYear.findFirst({
      where: { id, tenantId },
    });

    if (!fy) {
      throw new NotFoundException(`Fiscal year with ID "${id}" not found`);
    }

    if (fy.status === 'CLOSED') {
      throw new BadRequestException('Fiscal year is already closed');
    }

    const draftEntries = await this.prisma.journalEntry.count({
      where: { tenantId, fiscalYearId: id, status: 'DRAFT' },
    });

    if (draftEntries > 0) {
      throw new BadRequestException(
        `Cannot close fiscal year with ${draftEntries} draft journal entries`,
      );
    }

    return this.prisma.fiscalYear.update({
      where: { id },
      data: { status: 'CLOSED' },
    });
  }

  // ── Financial Reports ───────────────────────────────────────

  async getTrialBalance(tenantId: string, query: ReportPeriodDto) {
    const dateFilter = this.buildDateFilter(query);

    const where: Prisma.JournalEntryWhereInput = {
      tenantId,
      status: 'POSTED',
      ...dateFilter,
    };

    const entries = await this.prisma.journalEntryLine.findMany({
      where: { journalEntry: where },
      include: {
        account: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    const accountBalances = new Map<
      string,
      { account: any; totalDebit: Prisma.Decimal; totalCredit: Prisma.Decimal }
    >();

    for (const line of entries) {
      const existing = accountBalances.get(line.accountId) || {
        account: line.account,
        totalDebit: new Prisma.Decimal(0),
        totalCredit: new Prisma.Decimal(0),
      };

      existing.totalDebit = existing.totalDebit.add(new Prisma.Decimal(line.debit.toString()));
      existing.totalCredit = existing.totalCredit.add(new Prisma.Decimal(line.credit.toString()));
      accountBalances.set(line.accountId, existing);
    }

    const accounts = Array.from(accountBalances.values())
      .map((item) => ({
        ...item.account,
        totalDebit: item.totalDebit,
        totalCredit: item.totalCredit,
        balance: item.totalDebit.minus(item.totalCredit),
      }))
      .sort((a, b) => a.code.localeCompare(b.code));

    let grandTotalDebit = new Prisma.Decimal(0);
    let grandTotalCredit = new Prisma.Decimal(0);
    for (const acc of accounts) {
      grandTotalDebit = grandTotalDebit.add(acc.totalDebit);
      grandTotalCredit = grandTotalCredit.add(acc.totalCredit);
    }

    return {
      accounts,
      totals: {
        totalDebit: grandTotalDebit,
        totalCredit: grandTotalCredit,
        isBalanced: grandTotalDebit.equals(grandTotalCredit),
      },
    };
  }

  async getProfitAndLoss(tenantId: string, query: ReportPeriodDto) {
    const dateFilter = this.buildDateFilter(query);

    const where: Prisma.JournalEntryWhereInput = {
      tenantId,
      status: 'POSTED',
      ...dateFilter,
    };

    const lines = await this.prisma.journalEntryLine.findMany({
      where: { journalEntry: where },
      include: {
        account: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    const revenue: Record<string, { account: any; amount: Prisma.Decimal }> = {};
    const expenses: Record<string, { account: any; amount: Prisma.Decimal }> = {};

    for (const line of lines) {
      if (line.account.type === 'REVENUE') {
        if (!revenue[line.accountId]) {
          revenue[line.accountId] = {
            account: line.account,
            amount: new Prisma.Decimal(0),
          };
        }
        revenue[line.accountId].amount = revenue[line.accountId].amount.add(
          new Prisma.Decimal(line.credit.toString()).minus(new Prisma.Decimal(line.debit.toString())),
        );
      } else if (line.account.type === 'EXPENSE') {
        if (!expenses[line.accountId]) {
          expenses[line.accountId] = {
            account: line.account,
            amount: new Prisma.Decimal(0),
          };
        }
        expenses[line.accountId].amount = expenses[line.accountId].amount.add(
          new Prisma.Decimal(line.debit.toString()).minus(new Prisma.Decimal(line.credit.toString())),
        );
      }
    }

    let totalRevenue = new Prisma.Decimal(0);
    let totalExpenses = new Prisma.Decimal(0);

    const revenueItems = Object.values(revenue).sort((a, b) =>
      a.account.code.localeCompare(b.account.code),
    );
    const expenseItems = Object.values(expenses).sort((a, b) =>
      a.account.code.localeCompare(b.account.code),
    );

    for (const item of revenueItems) totalRevenue = totalRevenue.add(item.amount);
    for (const item of expenseItems) totalExpenses = totalExpenses.add(item.amount);

    return {
      revenue: revenueItems,
      expenses: expenseItems,
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue.minus(totalExpenses),
    };
  }

  async getBalanceSheet(tenantId: string, query: ReportPeriodDto) {
    const dateFilter = this.buildDateFilter(query);

    const where: Prisma.JournalEntryWhereInput = {
      tenantId,
      status: 'POSTED',
      ...dateFilter,
    };

    const lines = await this.prisma.journalEntryLine.findMany({
      where: { journalEntry: where },
      include: {
        account: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    const balances: Record<
      string,
      { account: any; balance: Prisma.Decimal }
    > = {};

    for (const line of lines) {
      if (!balances[line.accountId]) {
        balances[line.accountId] = {
          account: line.account,
          balance: new Prisma.Decimal(0),
        };
      }
      balances[line.accountId].balance = balances[line.accountId].balance.add(
        new Prisma.Decimal(line.debit.toString()).minus(new Prisma.Decimal(line.credit.toString())),
      );
    }

    const assets: Array<{ account: any; balance: Prisma.Decimal }> = [];
    const liabilities: Array<{ account: any; balance: Prisma.Decimal }> = [];
    const equity: Array<{ account: any; balance: Prisma.Decimal }> = [];

    let totalAssets = new Prisma.Decimal(0);
    let totalLiabilities = new Prisma.Decimal(0);
    let totalEquity = new Prisma.Decimal(0);

    for (const item of Object.values(balances)) {
      switch (item.account.type) {
        case 'ASSET':
          assets.push(item);
          totalAssets = totalAssets.add(item.balance);
          break;
        case 'LIABILITY':
          liabilities.push(item);
          totalLiabilities = totalLiabilities.add(item.balance.negated());
          break;
        case 'EQUITY':
          equity.push(item);
          totalEquity = totalEquity.add(item.balance.negated());
          break;
      }
    }

    const pnl = await this.getProfitAndLoss(tenantId, query);
    const retainedEarnings = pnl.netIncome;
    totalEquity = totalEquity.add(retainedEarnings);

    return {
      assets: assets.sort((a, b) => a.account.code.localeCompare(b.account.code)),
      liabilities: liabilities.sort((a, b) => a.account.code.localeCompare(b.account.code)),
      equity: equity.sort((a, b) => a.account.code.localeCompare(b.account.code)),
      retainedEarnings,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities.add(totalEquity),
      isBalanced: totalAssets.equals(totalLiabilities.add(totalEquity)),
    };
  }

  // ── Private Helpers ─────────────────────────────────────────

  private validateDoubleEntry(
    lines: Array<{ debit: number; credit: number }>,
  ): void {
    if (lines.length < 2) {
      throw new BadRequestException(
        'Journal entry must have at least 2 lines',
      );
    }

    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    for (const line of lines) {
      if (line.debit > 0 && line.credit > 0) {
        throw new BadRequestException(
          'A journal entry line cannot have both debit and credit amounts',
        );
      }
      if (line.debit === 0 && line.credit === 0) {
        throw new BadRequestException(
          'A journal entry line must have either a debit or credit amount',
        );
      }
      totalDebit = totalDebit.add(new Prisma.Decimal(line.debit));
      totalCredit = totalCredit.add(new Prisma.Decimal(line.credit));
    }

    if (!totalDebit.equals(totalCredit)) {
      throw new BadRequestException(
        `Total debits (${totalDebit.toString()}) must equal total credits (${totalCredit.toString()})`,
      );
    }
  }

  private async findOpenFiscalYear(
    tenantId: string,
    date: Date,
  ): Promise<FiscalYear | null> {
    return this.prisma.fiscalYear.findFirst({
      where: {
        tenantId,
        status: 'OPEN',
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });
  }

  private buildDateFilter(query: ReportPeriodDto): Prisma.JournalEntryWhereInput {
    const filter: Prisma.JournalEntryWhereInput = {};

    if (query.fiscalYearId) {
      filter.fiscalYearId = query.fiscalYearId;
    }

    if (query.dateFrom || query.dateTo) {
      filter.date = {};
      if (query.dateFrom) filter.date.gte = new Date(query.dateFrom);
      if (query.dateTo) filter.date.lte = new Date(query.dateTo);
    }

    return filter;
  }

  private async generateJournalNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `JE-${year}`;

    const sequence = await this.prisma.sequence.upsert({
      where: { tenantId_prefix: { tenantId, prefix } },
      update: { currentValue: { increment: 1 } },
      create: { tenantId, prefix, currentValue: 1, padding: 5 },
    });

    return `JE-${year}-${String(sequence.currentValue).padStart(5, '0')}`;
  }
}
