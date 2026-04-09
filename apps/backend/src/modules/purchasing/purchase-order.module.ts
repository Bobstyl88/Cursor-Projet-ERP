import { Module } from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderController } from './purchase-order.controller';
import { SequenceService } from '../../common/utils/sequence.service';

@Module({
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService, SequenceService],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
