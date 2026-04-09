import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { SequenceService } from '../../common/utils/sequence.service';
import { PaginationParams, PaginatedResult } from '../../common/interfaces/pagination.interface';
import { PurchaseOrderStatus } from '@prisma/client';

@Injectable()
export class PurchaseOrderService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private sequence: SequenceService,
  ) {}

  async findAll(
    tenantId: string,
    params: PaginationParams & { status?: PurchaseOrderStatus },
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', status } = params;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { contact: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          contact: { select: { id: true, companyName: true } },
          _count: { select: { lines: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        contact: true,
        lines: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
        invoices: { select: { id: true, number: true, status: true, total: true } },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async create(
    tenantId: string,
    userId: string,
    data: {
      contactId: string;
      currencyCode?: string;
      exchangeRate?: number;
      notes?: string;
      expectedDate?: Date;
      lines: Array<{
        productId: string;
        description?: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
      }>;
    },
  ) {
    const number = await this.sequence.getNextNumber(tenantId, 'purchase_order');

    const lines = data.lines.map((line, index) => {
      const lineTotal = line.quantity * line.unitPrice;
      return { ...line, lineTotal, sortOrder: index, taxRate: line.taxRate || 0 };
    });

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const taxTotal = lines.reduce((sum, l) => sum + l.lineTotal * (l.taxRate / 100), 0);

    const po = await this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        number,
        contactId: data.contactId,
        currencyCode: data.currencyCode || 'EUR',
        exchangeRate: data.exchangeRate || 1,
        subtotal,
        taxTotal,
        total: subtotal + taxTotal,
        notes: data.notes,
        expectedDate: data.expectedDate,
        lines: { create: lines },
      },
      include: { lines: true, contact: true },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'CREATE',
      entity: 'PurchaseOrder',
      entityId: po.id,
      newValues: { number: po.number },
    });

    return po;
  }

  async receive(
    tenantId: string,
    id: string,
    userId: string,
    receivedLines: Array<{ lineId: string; receivedQty: number }>,
  ) {
    const po = await this.findById(tenantId, id);

    if (!['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
      throw new BadRequestException('PO must be confirmed before receiving');
    }

    return this.prisma.$transaction(async (tx) => {
      let allReceived = true;

      for (const received of receivedLines) {
        const line = po.lines.find((l: any) => l.id === received.lineId);
        if (!line) continue;

        const newReceivedQty = Number(line.receivedQty) + received.receivedQty;
        if (newReceivedQty > Number(line.quantity)) {
          throw new BadRequestException(`Received quantity exceeds ordered for line ${line.id}`);
        }

        await tx.purchaseOrderLine.update({
          where: { id: received.lineId },
          data: { receivedQty: newReceivedQty },
        });

        if (newReceivedQty < Number(line.quantity)) {
          allReceived = false;
        }
      }

      const newStatus = allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: newStatus as PurchaseOrderStatus },
      });

      return this.findById(tenantId, id);
    });
  }
}
