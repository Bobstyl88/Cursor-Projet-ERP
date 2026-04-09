import { Module } from '@nestjs/common';
import { SalesOrderService } from './sales-order.service';
import { SalesOrderController } from './sales-order.controller';
import { SequenceService } from '../../common/utils/sequence.service';

@Module({
  controllers: [SalesOrderController],
  providers: [SalesOrderService, SequenceService],
  exports: [SalesOrderService],
})
export class SalesOrderModule {}
