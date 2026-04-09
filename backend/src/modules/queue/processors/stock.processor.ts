import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/database/prisma.service';
import { Prisma } from '@prisma/client';

interface StockUpdateJobData {
  tenantId: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  reference?: string;
  userId: string;
}

interface LowStockAlertJobData {
  tenantId: string;
  productId: string;
  warehouseId: string;
  currentQuantity: number;
  minStock: number;
}

@Processor('stock-update')
export class StockProcessor {
  private readonly logger = new Logger(StockProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('update-stock')
  async handleStockUpdate(job: Job<StockUpdateJobData>) {
    const { tenantId, warehouseId, productId, quantity, type, reference, userId } = job.data;
    this.logger.log(
      `Processing stock ${type} for product ${productId}, qty: ${quantity}`,
    );

    await this.prisma.$transaction(async (tx) => {
      const existing = await (tx as any).stockLevel.findUnique({
        where: {
          tenantId_warehouseId_productId: { tenantId, warehouseId, productId },
        },
      });

      if (existing) {
        const delta =
          type === 'OUT'
            ? new Prisma.Decimal(quantity).negated()
            : new Prisma.Decimal(quantity);

        await (tx as any).stockLevel.update({
          where: {
            tenantId_warehouseId_productId: { tenantId, warehouseId, productId },
          },
          data: {
            quantity:
              type === 'ADJUSTMENT'
                ? quantity
                : { increment: delta },
          },
        });
      } else {
        await (tx as any).stockLevel.create({
          data: {
            tenantId,
            warehouseId,
            productId,
            quantity: type === 'OUT' ? 0 : quantity,
            reservedQuantity: 0,
          },
        });
      }

      await (tx as any).stockMovement.create({
        data: {
          tenantId,
          type,
          warehouseId,
          productId,
          quantity,
          reference,
          createdBy: userId,
        },
      });
    });

    const stockLevel = await this.prisma.stockLevel.findUnique({
      where: {
        tenantId_warehouseId_productId: { tenantId, warehouseId, productId },
      },
    });

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (
      product?.minStock &&
      stockLevel &&
      new Prisma.Decimal(stockLevel.quantity.toString()).lessThan(product.minStock)
    ) {
      this.logger.warn(
        `Low stock alert: Product ${product.code} in warehouse ${warehouseId} ` +
          `(current: ${stockLevel.quantity}, min: ${product.minStock})`,
      );
    }

    return { productId, warehouseId, newQuantity: stockLevel?.quantity };
  }

  @Process('low-stock-alert')
  async handleLowStockAlert(job: Job<LowStockAlertJobData>) {
    const { tenantId, productId, warehouseId, currentQuantity, minStock } = job.data;

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, tenantId },
    });

    this.logger.warn(
      `LOW STOCK ALERT: ${product?.name} (${product?.code}) in ${warehouse?.name} — ` +
        `Current: ${currentQuantity}, Min: ${minStock}`,
    );

    return { productId, warehouseId, currentQuantity, minStock, status: 'alerted' };
  }
}
