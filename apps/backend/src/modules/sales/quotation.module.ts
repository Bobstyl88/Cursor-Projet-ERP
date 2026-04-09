import { Module } from '@nestjs/common';
import { QuotationService } from './quotation.service';
import { QuotationController } from './quotation.controller';
import { SequenceService } from '../../common/utils/sequence.service';

@Module({
  controllers: [QuotationController],
  providers: [QuotationService, SequenceService],
  exports: [QuotationService],
})
export class QuotationModule {}
