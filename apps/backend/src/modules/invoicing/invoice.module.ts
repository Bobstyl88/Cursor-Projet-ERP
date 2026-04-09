import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { SequenceService } from '../../common/utils/sequence.service';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [InvoiceController],
  providers: [InvoiceService, SequenceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
