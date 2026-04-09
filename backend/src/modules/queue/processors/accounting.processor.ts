import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AccountingService } from '@/modules/accounting/accounting.service';

interface InvoiceJournalJobData {
  tenantId: string;
  invoiceId: string;
  userId: string;
}

interface PaymentJournalJobData {
  tenantId: string;
  paymentId: string;
  userId: string;
}

@Processor('accounting-sync')
export class AccountingProcessor {
  private readonly logger = new Logger(AccountingProcessor.name);

  constructor(private readonly accountingService: AccountingService) {}

  @Process('create-invoice-journal')
  async handleInvoiceJournal(job: Job<InvoiceJournalJobData>) {
    const { tenantId, invoiceId, userId } = job.data;
    this.logger.log(`Creating journal entry for invoice ${invoiceId}`);

    try {
      const entry = await this.accountingService.createJournalEntryFromInvoice(
        tenantId,
        userId,
        invoiceId,
      );

      this.logger.log(
        `Journal entry ${entry.number} created for invoice ${invoiceId}`,
      );

      return { journalEntryId: entry.id, number: entry.number };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create journal entry for invoice ${invoiceId}: ${message}`,
      );
      throw error;
    }
  }

  @Process('create-payment-journal')
  async handlePaymentJournal(job: Job<PaymentJournalJobData>) {
    const { tenantId, paymentId, userId } = job.data;
    this.logger.log(`Creating journal entry for payment ${paymentId}`);

    try {
      const entry = await this.accountingService.createPaymentJournalEntry(
        tenantId,
        userId,
        paymentId,
      );

      this.logger.log(
        `Journal entry ${entry.number} created for payment ${paymentId}`,
      );

      return { journalEntryId: entry.id, number: entry.number };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create journal entry for payment ${paymentId}: ${message}`,
      );
      throw error;
    }
  }
}
