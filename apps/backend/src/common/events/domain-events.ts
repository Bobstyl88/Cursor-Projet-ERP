/**
 * Typed domain event payloads used with NestJS EventEmitter.
 * Pattern: '<module>.<entity>.<action>'
 */

export class InvoiceCreatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly invoiceId: string,
    public readonly customerId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly lines: Array<{ accountCode: string; debit: number; credit: number }>,
  ) {}
}

export class InvoicePaidEvent {
  constructor(
    public readonly tenantId: string,
    public readonly invoiceId: string,
    public readonly amountPaid: number,
    public readonly currency: string,
    public readonly paidAt: Date,
  ) {}
}

export class SaleOrderConfirmedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly lines: Array<{ productId: string; quantity: number; warehouseId: string }>,
  ) {}
}

export class PurchaseOrderReceivedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly purchaseOrderId: string,
    public readonly lines: Array<{ productId: string; quantity: number; warehouseId: string }>,
  ) {}
}

export class StockMovementCreatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly productId: string,
    public readonly warehouseId: string,
    public readonly quantity: number,
    public readonly movementType: 'in' | 'out' | 'transfer',
  ) {}
}
