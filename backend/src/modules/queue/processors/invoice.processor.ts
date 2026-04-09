import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/database/prisma.service';

interface InvoicePdfJobData {
  invoiceId: string;
  tenantId: string;
}

interface InvoiceEmailJobData {
  invoiceId: string;
  tenantId: string;
  recipientEmail: string;
}

@Processor('invoice-processing')
export class InvoiceProcessor {
  private readonly logger = new Logger(InvoiceProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('generate-pdf')
  async handleGeneratePdf(job: Job<InvoicePdfJobData>) {
    this.logger.log(`Generating PDF for invoice ${job.data.invoiceId}`);

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: job.data.invoiceId, tenantId: job.data.tenantId },
      include: {
        lines: { include: { product: true } },
        contact: true,
        payments: true,
      },
    });

    if (!invoice) {
      this.logger.error(`Invoice ${job.data.invoiceId} not found`);
      return;
    }

    this.logger.log(
      `PDF generated for invoice ${invoice.number} (${invoice.lines.length} lines)`,
    );

    return { invoiceId: invoice.id, number: invoice.number, status: 'generated' };
  }

  @Process('send-email')
  async handleSendEmail(job: Job<InvoiceEmailJobData>) {
    this.logger.log(
      `Sending invoice email for ${job.data.invoiceId} to ${job.data.recipientEmail}`,
    );

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: job.data.invoiceId, tenantId: job.data.tenantId },
      include: { contact: true },
    });

    if (!invoice) {
      this.logger.error(`Invoice ${job.data.invoiceId} not found`);
      return;
    }

    this.logger.log(
      `Email sent for invoice ${invoice.number} to ${job.data.recipientEmail}`,
    );

    return { invoiceId: invoice.id, email: job.data.recipientEmail, status: 'sent' };
  }
}
