import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from '../invoicing/schemas/invoice.schema';
import { SaleOrder, SaleOrderSchema } from '../sales/schemas/sale-order.schema';
import { PurchaseOrder, PurchaseOrderSchema } from '../purchases/schemas/purchase-order.schema';
import { StockLevel, StockLevelSchema } from '../inventory/schemas/stock-level.schema';
import { Account, AccountSchema } from '../accounting/schemas/account.schema';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: SaleOrder.name, schema: SaleOrderSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: StockLevel.name, schema: StockLevelSchema },
      { name: Account.name, schema: AccountSchema },
    ]),
  ],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
