import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';
import { PurchaseOrder, PurchaseOrderDocument, PurchaseOrderStatus } from './schemas/purchase-order.schema';
import { PurchaseOrderReceivedEvent } from '../../common/events/domain-events';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrderDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ── Suppliers ─────────────────────────────────────────────────────────

  async createSupplier(tenantId: string, data: Partial<Supplier>): Promise<SupplierDocument> {
    return new this.supplierModel({ tenantId, ...data }).save();
  }

  async findSuppliers(tenantId: string): Promise<SupplierDocument[]> {
    return this.supplierModel.find({ tenantId, isActive: true }).exec();
  }

  // ── Purchase Orders ───────────────────────────────────────────────────

  async createOrder(tenantId: string, data: Partial<PurchaseOrder>, userId: string): Promise<PurchaseOrderDocument> {
    const count = await this.poModel.countDocuments({ tenantId });
    const year = new Date().getFullYear();
    const number = `PO-${year}-${String(count + 1).padStart(5, '0')}`;

    const lines = (data.lines ?? []).map((l: any) => {
      const subtotal = l.quantity * l.unitPrice;
      const taxAmount = subtotal * (l.taxRate / 100);
      return { ...l, subtotal: r2(subtotal), taxAmount: r2(taxAmount), total: r2(subtotal + taxAmount), receivedQuantity: 0 };
    });

    const subtotal = lines.reduce((s: number, l: any) => s + l.subtotal, 0);
    const taxTotal = lines.reduce((s: number, l: any) => s + l.taxAmount, 0);

    return new this.poModel({
      tenantId,
      number,
      supplierId: new Types.ObjectId(data.supplierId as any),
      currency: data.currency ?? 'EUR',
      orderDate: data.orderDate ?? new Date(),
      expectedDeliveryDate: data.expectedDeliveryDate,
      lines,
      subtotal: r2(subtotal),
      taxTotal: r2(taxTotal),
      grandTotal: r2(subtotal + taxTotal),
      createdBy: userId,
    }).save();
  }

  async findOrders(tenantId: string): Promise<PurchaseOrderDocument[]> {
    return this.poModel.find({ tenantId }).populate('supplierId', 'name').sort({ createdAt: -1 }).exec();
  }

  async findOrderById(tenantId: string, id: string): Promise<PurchaseOrderDocument> {
    const po = await this.poModel.findOne({ _id: id, tenantId }).populate('supplierId');
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  /** Mark a purchase order as received and trigger stock IN */
  async receiveOrder(tenantId: string, id: string): Promise<PurchaseOrderDocument> {
    const po = await this.findOrderById(tenantId, id);
    if (po.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Order already received');
    }

    po.status = PurchaseOrderStatus.RECEIVED;
    po.receivedAt = new Date();
    await po.save();

    this.eventEmitter.emit(
      'purchases.order.received',
      new PurchaseOrderReceivedEvent(
        tenantId,
        String(po._id),
        (po.lines as any[]).map((l) => ({
          productId: String(l.productId),
          quantity: l.quantity,
          warehouseId: String(l.warehouseId),
        })),
      ),
    );

    return po;
  }
}

function r2(n: number) { return Math.round(n * 100) / 100; }
