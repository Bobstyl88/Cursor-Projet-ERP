import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InvoiceProcessor } from './processors/invoice.processor';
import { StockProcessor } from './processors/stock.processor';
import { AccountingProcessor } from './processors/accounting.processor';
import { AccountingModule } from '@/modules/accounting/accounting.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST') || 'localhost',
          port: parseInt(config.get<string>('REDIS_PORT') || '6379', 10),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'invoice-processing' },
      { name: 'stock-update' },
      { name: 'accounting-sync' },
      { name: 'email-notification' },
    ),
    AccountingModule,
  ],
  providers: [InvoiceProcessor, StockProcessor, AccountingProcessor],
  exports: [BullModule],
})
export class QueueModule {}
