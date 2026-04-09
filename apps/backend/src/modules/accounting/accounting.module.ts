import { Module } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { SequenceService } from '../../common/utils/sequence.service';

@Module({
  controllers: [AccountingController],
  providers: [AccountingService, SequenceService],
  exports: [AccountingService],
})
export class AccountingModule {}
