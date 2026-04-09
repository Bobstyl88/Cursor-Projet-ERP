import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Model, Types, ClientSession } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Warehouse, WarehouseDocument } from './schemas/warehouse.schema';
import { StockMovement, StockMovementDocument, MovementType, MovementReason } from './schemas/stock-movement.schema';
import { StockLevel, StockLevelDocument } from './schemas/stock-level.schema';
import { SaleOrderConfirmedEvent, PurchaseOrderReceivedEvent } from '../../common/events/domain-events';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Warehouse.name) private warehouseModel: Model<WarehouseDocument>,
    @InjectModel(StockMovement.name) private movementModel: Model<StockMovementDocument>,
    @InjectModel(StockLevel.name) private stockLevelModel: Model<StockLevelDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ── Products ──────────────────────────────────────────────────────────

  async createProduct(tenantId: string, data: Partial<Product>): Promise<ProductDocument> {
    return new this.productModel({ tenantId, ...data }).save();
  }

  async findProducts(tenantId: string): Promise<ProductDocument[]> {
    return this.productModel.find({ tenantId, isActive: true }).exec();
  }

  async findProductById(tenantId: string, id: string): Promise<ProductDocument> {
    const p = await this.productModel.findOne({ _id: id, tenantId });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  // ── Warehouses ────────────────────────────────────────────────────────

  async createWarehouse(tenantId: string, data: Partial<Warehouse>): Promise<WarehouseDocument> {
    return new this.warehouseModel({ tenantId, ...data }).save();
  }

  async findWarehouses(tenantId: string): Promise<WarehouseDocument[]> {
    return this.warehouseModel.find({ tenantId, isActive: true }).exec();
  }

  // ── Stock movements ───────────────────────────────────────────────────

  async recordMovement(params: {
    tenantId: string;
    productId: string;
    warehouseId: string;
    type: MovementType;
    reason: MovementReason;
    quantity: number;
    unitCost?: number;
    referenceId?: string;
    referenceType?: string;
    createdBy: string;
  }): Promise<StockMovementDocument> {
    if (params.quantity <= 0) throw new BadRequestException('Quantity must be positive');

    const movement = await new this.movementModel({
      tenantId: params.tenantId,
      productId: new Types.ObjectId(params.productId),
      warehouseId: new Types.ObjectId(params.warehouseId),
      type: params.type,
      reason: params.reason,
      quantity: params.quantity,
      unitCost: params.unitCost ?? 0,
      referenceId: params.referenceId,
      referenceType: params.referenceType,
      createdBy: params.createdBy,
    }).save();

    // Update materialised stock level
    const delta = params.type === MovementType.OUT ? -params.quantity : params.quantity;
    await this.stockLevelModel.findOneAndUpdate(
      {
        tenantId: params.tenantId,
        productId: new Types.ObjectId(params.productId),
        warehouseId: new Types.ObjectId(params.warehouseId),
      },
      { $inc: { quantity: delta } },
      { upsert: true, new: true },
    );

    return movement;
  }

  async getStockLevels(tenantId: string, warehouseId?: string) {
    const filter: Record<string, unknown> = { tenantId };
    if (warehouseId) filter.warehouseId = new Types.ObjectId(warehouseId);
    return this.stockLevelModel.find(filter).populate('productId', 'sku name').exec();
  }

  // ── Event listeners ───────────────────────────────────────────────────

  @OnEvent('sales.order.confirmed')
  async onSaleOrderConfirmed(event: SaleOrderConfirmedEvent) {
    for (const line of event.lines) {
      await this.recordMovement({
        tenantId: event.tenantId,
        productId: line.productId,
        warehouseId: line.warehouseId,
        type: MovementType.OUT,
        reason: MovementReason.SALE,
        quantity: line.quantity,
        referenceId: event.orderId,
        referenceType: 'SaleOrder',
        createdBy: 'system',
      });
    }
  }

  @OnEvent('purchases.order.received')
  async onPurchaseOrderReceived(event: PurchaseOrderReceivedEvent) {
    for (const line of event.lines) {
      await this.recordMovement({
        tenantId: event.tenantId,
        productId: line.productId,
        warehouseId: line.warehouseId,
        type: MovementType.IN,
        reason: MovementReason.PURCHASE,
        quantity: line.quantity,
        referenceId: event.purchaseOrderId,
        referenceType: 'PurchaseOrder',
        createdBy: 'system',
      });
    }
  }
}
