import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from './schemas/customer.schema';
import { Quote, QuoteSchema } from './schemas/quote.schema';
import { SaleOrder, SaleOrderSchema } from './schemas/sale-order.schema';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Quote.name, schema: QuoteSchema },
      { name: SaleOrder.name, schema: SaleOrderSchema },
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
