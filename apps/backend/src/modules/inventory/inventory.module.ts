import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { Warehouse, WarehouseSchema } from './schemas/warehouse.schema';
import { StockMovement, StockMovementSchema } from './schemas/stock-movement.schema';
import { StockLevel, StockLevelSchema } from './schemas/stock-level.schema';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
      { name: StockLevel.name, schema: StockLevelSchema },
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
