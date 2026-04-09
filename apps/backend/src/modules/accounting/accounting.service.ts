import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { Model } from 'mongoose';
import { Account, AccountDocument, AccountNature } from './schemas/account.schema';
import { JournalEntry, JournalEntryDocument, JournalEntryStatus } from './schemas/journal-entry.schema';
import { InvoiceCreatedEvent, InvoicePaidEvent } from '../../common/events/domain-events';

@Injectable()
export class AccountingService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(JournalEntry.name) private journalModel: Model<JournalEntryDocument>,
  ) {}

  // ── Chart of Accounts ─────────────────────────────────────────────────

  async createAccount(tenantId: string, data: Partial<Account>): Promise<AccountDocument> {
    return new this.accountModel({ tenantId, ...data }).save();
  }

  async findAccounts(tenantId: string): Promise<AccountDocument[]> {
    return this.accountModel.find({ tenantId, isActive: true }).sort({ code: 1 }).exec();
  }

  /** Seed default French PCG chart for a new tenant */
  async seedDefaultChart(tenantId: string): Promise<void> {
    const defaultAccounts = [
      // Assets
      { code: '411000', name: 'Clients', type: 'asset', nature: 'debit' },
      { code: '401000', name: 'Fournisseurs', type: 'liability', nature: 'credit' },
      { code: '512000', name: 'Banque', type: 'asset', nature: 'debit' },
      { code: '411100', name: 'Clients — effets à recevoir', type: 'asset', nature: 'debit' },
      // Revenue
      { code: '706000', name: 'Prestations de services', type: 'revenue', nature: 'credit' },
      { code: '707000', name: 'Ventes de marchandises', type: 'revenue', nature: 'credit' },
      // Expenses
      { code: '607000', name: 'Achats de marchandises', type: 'expense', nature: 'debit' },
      { code: '611000', name: 'Sous-traitance générale', type: 'expense', nature: 'debit' },
      // Tax
      { code: '445710', name: 'TVA collectée 20%', type: 'liability', nature: 'credit' },
      { code: '445660', name: 'TVA déductible 20%', type: 'asset', nature: 'debit' },
      // Equity
      { code: '101000', name: 'Capital', type: 'equity', nature: 'credit' },
      { code: '120000', name: 'Résultat de l\'exercice', type: 'equity', nature: 'credit' },
    ];

    const existing = await this.accountModel.findOne({ tenantId, code: '411000' });
    if (existing) return;

    await this.accountModel.insertMany(
      defaultAccounts.map((a) => ({ tenantId, ...a, isSystem: true })),
    );
  }

  // ── Journal Entries ───────────────────────────────────────────────────

  async createEntry(params: {
    tenantId: string;
    date: Date;
    description: string;
    currency: string;
    exchangeRate?: number;
    referenceId?: string;
    referenceType?: string;
    createdBy?: string;
    lines: Array<{ accountCode: string; debit: number; credit: number; description?: string }>;
  }): Promise<JournalEntryDocument> {
    const totalDebit = r2(params.lines.reduce((s, l) => s + l.debit, 0));
    const totalCredit = r2(params.lines.reduce((s, l) => s + l.credit, 0));

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Journal entry unbalanced: debit=${totalDebit} credit=${totalCredit}`,
      );
    }

    const number = await this.generateJournalNumber(params.tenantId);

    const accountCodes = params.lines.map((l) => l.accountCode);
    const accounts = await this.accountModel.find({
      tenantId: params.tenantId,
      code: { $in: accountCodes },
    });
    const accountMap = new Map(accounts.map((a) => [a.code, a]));

    const lines = params.lines.map((l) => ({
      accountCode: l.accountCode,
      accountName: accountMap.get(l.accountCode)?.name ?? l.accountCode,
      debit: l.debit,
      credit: l.credit,
      description: l.description,
    }));

    const entry = await new this.journalModel({
      tenantId: params.tenantId,
      number,
      date: params.date,
      description: params.description,
      currency: params.currency,
      exchangeRate: params.exchangeRate ?? 1,
      referenceId: params.referenceId,
      referenceType: params.referenceType,
      lines,
      status: JournalEntryStatus.POSTED,
      createdBy: params.createdBy ?? 'system',
    }).save();

    // Update account balances
    await Promise.all(
      lines.map(async (l) => {
        const account = accountMap.get(l.accountCode);
        if (!account) return;
        const delta =
          account.nature === AccountNature.DEBIT
            ? l.debit - l.credit
            : l.credit - l.debit;
        await this.accountModel.findByIdAndUpdate(account._id, { $inc: { balance: delta } });
      }),
    );

    return entry;
  }

  async findEntries(tenantId: string, from?: Date, to?: Date): Promise<JournalEntryDocument[]> {
    const filter: Record<string, unknown> = { tenantId };
    if (from || to) {
      filter.date = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      };
    }
    return this.journalModel.find(filter).sort({ date: -1 }).exec();
  }

  async getTrialBalance(tenantId: string) {
    const accounts = await this.accountModel.find({ tenantId, isActive: true }).sort({ code: 1 });
    return accounts.map((a) => ({
      code: a.code,
      name: a.name,
      type: a.type,
      balance: a.balance,
    }));
  }

  // ── Event Listeners (automatic bookkeeping) ───────────────────────────

  @OnEvent('invoicing.invoice.created')
  async onInvoiceCreated(event: InvoiceCreatedEvent) {
    await this.createEntry({
      tenantId: event.tenantId,
      date: new Date(),
      description: `Invoice created — ${event.invoiceId}`,
      currency: event.currency,
      referenceId: event.invoiceId,
      referenceType: 'Invoice',
      lines: event.lines,
    });
  }

  @OnEvent('invoicing.invoice.paid')
  async onInvoicePaid(event: InvoicePaidEvent) {
    await this.createEntry({
      tenantId: event.tenantId,
      date: event.paidAt,
      description: `Invoice payment received — ${event.invoiceId}`,
      currency: event.currency,
      referenceId: event.invoiceId,
      referenceType: 'InvoicePayment',
      lines: [
        { accountCode: '512000', debit: event.amountPaid, credit: 0 },
        { accountCode: '411000', debit: 0, credit: event.amountPaid },
      ],
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private async generateJournalNumber(tenantId: string): Promise<string> {
    const count = await this.journalModel.countDocuments({ tenantId });
    const year = new Date().getFullYear();
    return `JE-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}

function r2(n: number) { return Math.round(n * 100) / 100; }
