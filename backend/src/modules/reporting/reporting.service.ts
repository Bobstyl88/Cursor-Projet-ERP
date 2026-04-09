import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Prisma } from '@prisma/client';
import { ReportQueryDto } from './dto';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalContacts,
      totalProducts,
      openQuotations,
      openSaleOrders,
      openPurchaseOrders,
      overdueInvoices,
      monthlyRevenue,
      yearlyRevenue,
      recentInvoices,
      topProducts,
    ] = await Promise.all([
      this.prisma.contact.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.product.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.quotation.count({
        where: { tenantId, status: { in: ['DRAFT', 'SENT'] } },
      }),
      this.prisma.saleOrder.count({
        where: { tenantId, status: { in: ['DRAFT', 'CONFIRMED'] } },
      }),
      this.prisma.purchaseOrder.count({
        where: { tenantId, status: { in: ['DRAFT', 'SENT', 'CONFIRMED'] } },
      }),
      this.prisma.invoice.count({
        where: { tenantId, status: 'OVERDUE' },
      }),
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          type: 'SALE',
          status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID'] },
          date: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          type: 'SALE',
          status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID'] },
          date: { gte: startOfYear },
        },
        _sum: { total: true },
      }),
      this.prisma.invoice.findMany({
        where: { tenantId },
        include: { contact: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.invoiceLine.groupBy({
        by: ['productId'],
        where: { invoice: { tenantId, type: 'SALE', status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID'] } } },
        _sum: { lineTotal: true, quantity: true },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 5,
      }),
    ]);

    const topProductIds = topProducts.map((p) => p.productId);
    const products = topProductIds.length > 0
      ? await this.prisma.product.findMany({
          where: { id: { in: topProductIds } },
          select: { id: true, code: true, name: true },
        })
      : [];

    const topProductsWithNames = topProducts.map((tp) => ({
      ...tp,
      product: products.find((p) => p.id === tp.productId),
    }));

    return {
      kpis: {
        totalContacts,
        totalProducts,
        openQuotations,
        openSaleOrders,
        openPurchaseOrders,
        overdueInvoices,
        monthlyRevenue: monthlyRevenue._sum.total ?? 0,
        yearlyRevenue: yearlyRevenue._sum.total ?? 0,
      },
      recentInvoices,
      topProducts: topProductsWithNames,
    };
  }

  async getSalesReport(tenantId: string, query: ReportQueryDto) {
    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      type: 'SALE',
      status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID'] },
    };

    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = new Date(query.dateFrom);
      if (query.dateTo) where.date.lte = new Date(query.dateTo);
    }
    if (query.contactId) where.contactId = query.contactId;

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        contact: { select: { id: true, name: true, code: true } },
        lines: { include: { product: { select: { id: true, name: true, code: true, category: true } } } },
      },
      orderBy: { date: 'asc' },
    });

    let totalRevenue = new Prisma.Decimal(0);
    let totalTax = new Prisma.Decimal(0);
    let totalDiscount = new Prisma.Decimal(0);
    const byContact: Record<string, { contact: any; total: Prisma.Decimal; count: number }> = {};
    const byProduct: Record<string, { product: any; total: Prisma.Decimal; quantity: Prisma.Decimal }> = {};

    for (const inv of invoices) {
      totalRevenue = totalRevenue.add(new Prisma.Decimal(inv.total.toString()));
      totalTax = totalTax.add(new Prisma.Decimal(inv.taxTotal.toString()));
      totalDiscount = totalDiscount.add(new Prisma.Decimal(inv.discountTotal.toString()));

      if (!byContact[inv.contactId]) {
        byContact[inv.contactId] = { contact: inv.contact, total: new Prisma.Decimal(0), count: 0 };
      }
      byContact[inv.contactId].total = byContact[inv.contactId].total.add(
        new Prisma.Decimal(inv.total.toString()),
      );
      byContact[inv.contactId].count++;

      for (const line of inv.lines) {
        if (!byProduct[line.productId]) {
          byProduct[line.productId] = {
            product: line.product,
            total: new Prisma.Decimal(0),
            quantity: new Prisma.Decimal(0),
          };
        }
        byProduct[line.productId].total = byProduct[line.productId].total.add(
          new Prisma.Decimal(line.lineTotal.toString()),
        );
        byProduct[line.productId].quantity = byProduct[line.productId].quantity.add(
          new Prisma.Decimal(line.quantity.toString()),
        );
      }
    }

    return {
      summary: {
        totalRevenue,
        totalTax,
        totalDiscount,
        invoiceCount: invoices.length,
      },
      byContact: Object.values(byContact).sort((a, b) =>
        b.total.minus(a.total).toNumber(),
      ),
      byProduct: Object.values(byProduct).sort((a, b) =>
        b.total.minus(a.total).toNumber(),
      ),
    };
  }

  async getPurchasesReport(tenantId: string, query: ReportQueryDto) {
    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      type: 'PURCHASE',
      status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID'] },
    };

    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = new Date(query.dateFrom);
      if (query.dateTo) where.date.lte = new Date(query.dateTo);
    }
    if (query.contactId) where.contactId = query.contactId;

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        contact: { select: { id: true, name: true, code: true } },
        lines: { include: { product: { select: { id: true, name: true, code: true } } } },
      },
      orderBy: { date: 'asc' },
    });

    let totalSpent = new Prisma.Decimal(0);
    let totalTax = new Prisma.Decimal(0);
    const bySupplier: Record<string, { contact: any; total: Prisma.Decimal; count: number }> = {};

    for (const inv of invoices) {
      totalSpent = totalSpent.add(new Prisma.Decimal(inv.total.toString()));
      totalTax = totalTax.add(new Prisma.Decimal(inv.taxTotal.toString()));

      if (!bySupplier[inv.contactId]) {
        bySupplier[inv.contactId] = { contact: inv.contact, total: new Prisma.Decimal(0), count: 0 };
      }
      bySupplier[inv.contactId].total = bySupplier[inv.contactId].total.add(
        new Prisma.Decimal(inv.total.toString()),
      );
      bySupplier[inv.contactId].count++;
    }

    return {
      summary: { totalSpent, totalTax, billCount: invoices.length },
      bySupplier: Object.values(bySupplier).sort((a, b) =>
        b.total.minus(a.total).toNumber(),
      ),
    };
  }

  async getInventoryReport(tenantId: string, query: ReportQueryDto) {
    const stockWhere: Prisma.StockLevelWhereInput = { tenantId };
    if (query.warehouseId) stockWhere.warehouseId = query.warehouseId;

    const stockLevels = await this.prisma.stockLevel.findMany({
      where: stockWhere,
      include: {
        product: { select: { id: true, code: true, name: true, purchasePrice: true, salePrice: true, minStock: true } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });

    let totalCostValue = new Prisma.Decimal(0);
    let totalSaleValue = new Prisma.Decimal(0);
    let totalItems = 0;
    const lowStockItems: any[] = [];

    for (const sl of stockLevels) {
      const costValue = new Prisma.Decimal(sl.quantity.toString()).mul(
        new Prisma.Decimal(sl.product.purchasePrice.toString()),
      );
      const saleValue = new Prisma.Decimal(sl.quantity.toString()).mul(
        new Prisma.Decimal(sl.product.salePrice.toString()),
      );

      totalCostValue = totalCostValue.add(costValue);
      totalSaleValue = totalSaleValue.add(saleValue);
      totalItems++;

      if (
        sl.product.minStock !== null &&
        new Prisma.Decimal(sl.quantity.toString()).lessThan(sl.product.minStock)
      ) {
        lowStockItems.push({
          product: sl.product,
          warehouse: sl.warehouse,
          currentStock: sl.quantity,
          minStock: sl.product.minStock,
        });
      }
    }

    const movementWhere: Prisma.StockMovementWhereInput = { tenantId };
    if (query.dateFrom || query.dateTo) {
      movementWhere.createdAt = {};
      if (query.dateFrom) movementWhere.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) movementWhere.createdAt.lte = new Date(query.dateTo);
    }

    const movementSummary = await this.prisma.stockMovement.groupBy({
      by: ['type'],
      where: movementWhere,
      _sum: { quantity: true },
      _count: true,
    });

    return {
      valuation: { totalCostValue, totalSaleValue, totalItems },
      lowStockItems,
      movementSummary,
    };
  }

  async getReceivablesAging(tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        type: 'SALE',
        status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
        amountDue: { gt: 0 },
      },
      include: {
        contact: { select: { id: true, name: true, code: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    const buckets = {
      current: [] as any[],
      days1to30: [] as any[],
      days31to60: [] as any[],
      days61to90: [] as any[],
      over90: [] as any[],
    };

    let totalReceivable = new Prisma.Decimal(0);

    for (const inv of invoices) {
      const daysPastDue = Math.floor(
        (now.getTime() - new Date(inv.dueDate).getTime()) / 86400000,
      );
      const item = {
        id: inv.id,
        number: inv.number,
        contact: inv.contact,
        dueDate: inv.dueDate,
        amountDue: inv.amountDue,
        daysPastDue: Math.max(0, daysPastDue),
      };

      totalReceivable = totalReceivable.add(new Prisma.Decimal(inv.amountDue.toString()));

      if (daysPastDue <= 0) buckets.current.push(item);
      else if (daysPastDue <= 30) buckets.days1to30.push(item);
      else if (daysPastDue <= 60) buckets.days31to60.push(item);
      else if (daysPastDue <= 90) buckets.days61to90.push(item);
      else buckets.over90.push(item);
    }

    return {
      totalReceivable,
      buckets,
      summary: {
        current: buckets.current.reduce(
          (sum, i) => sum.add(new Prisma.Decimal(i.amountDue.toString())),
          new Prisma.Decimal(0),
        ),
        days1to30: buckets.days1to30.reduce(
          (sum, i) => sum.add(new Prisma.Decimal(i.amountDue.toString())),
          new Prisma.Decimal(0),
        ),
        days31to60: buckets.days31to60.reduce(
          (sum, i) => sum.add(new Prisma.Decimal(i.amountDue.toString())),
          new Prisma.Decimal(0),
        ),
        days61to90: buckets.days61to90.reduce(
          (sum, i) => sum.add(new Prisma.Decimal(i.amountDue.toString())),
          new Prisma.Decimal(0),
        ),
        over90: buckets.over90.reduce(
          (sum, i) => sum.add(new Prisma.Decimal(i.amountDue.toString())),
          new Prisma.Decimal(0),
        ),
      },
    };
  }

  async getPayablesAging(tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        type: 'PURCHASE',
        status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
        amountDue: { gt: 0 },
      },
      include: {
        contact: { select: { id: true, name: true, code: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    const buckets = {
      current: [] as any[],
      days1to30: [] as any[],
      days31to60: [] as any[],
      days61to90: [] as any[],
      over90: [] as any[],
    };

    let totalPayable = new Prisma.Decimal(0);

    for (const inv of invoices) {
      const daysPastDue = Math.floor(
        (now.getTime() - new Date(inv.dueDate).getTime()) / 86400000,
      );
      const item = {
        id: inv.id,
        number: inv.number,
        contact: inv.contact,
        dueDate: inv.dueDate,
        amountDue: inv.amountDue,
        daysPastDue: Math.max(0, daysPastDue),
      };

      totalPayable = totalPayable.add(new Prisma.Decimal(inv.amountDue.toString()));

      if (daysPastDue <= 0) buckets.current.push(item);
      else if (daysPastDue <= 30) buckets.days1to30.push(item);
      else if (daysPastDue <= 60) buckets.days31to60.push(item);
      else if (daysPastDue <= 90) buckets.days61to90.push(item);
      else buckets.over90.push(item);
    }

    return {
      totalPayable,
      buckets,
      summary: {
        current: buckets.current.reduce(
          (sum, i) => sum.add(new Prisma.Decimal(i.amountDue.toString())),
          new Prisma.Decimal(0),
        ),
        days1to30: buckets.days1to30.reduce(
          (sum, i) => sum.add(new Prisma.Decimal(i.amountDue.toString())),
          new Prisma.Decimal(0),
        ),
        days31to60: buckets.days31to60.reduce(
          (sum, i) => sum.add(new Prisma.Decimal(i.amountDue.toString())),
          new Prisma.Decimal(0),
        ),
        days61to90: buckets.days61to90.reduce(
          (sum, i) => sum.add(new Prisma.Decimal(i.amountDue.toString())),
          new Prisma.Decimal(0),
        ),
        over90: buckets.over90.reduce(
          (sum, i) => sum.add(new Prisma.Decimal(i.amountDue.toString())),
          new Prisma.Decimal(0),
        ),
      },
    };
  }

  async getRevenueByPeriod(tenantId: string, query: ReportQueryDto) {
    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      type: 'SALE',
      status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID'] },
    };

    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = new Date(query.dateFrom);
      if (query.dateTo) where.date.lte = new Date(query.dateTo);
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      select: { date: true, total: true, taxTotal: true, discountTotal: true },
      orderBy: { date: 'asc' },
    });

    const groupBy = query.groupBy || 'month';
    const periods: Record<string, { revenue: Prisma.Decimal; tax: Prisma.Decimal; count: number }> = {};

    for (const inv of invoices) {
      const key = this.getPeriodKey(inv.date, groupBy);
      if (!periods[key]) {
        periods[key] = { revenue: new Prisma.Decimal(0), tax: new Prisma.Decimal(0), count: 0 };
      }
      periods[key].revenue = periods[key].revenue.add(new Prisma.Decimal(inv.total.toString()));
      periods[key].tax = periods[key].tax.add(new Prisma.Decimal(inv.taxTotal.toString()));
      periods[key].count++;
    }

    return {
      groupBy,
      periods: Object.entries(periods).map(([period, data]) => ({
        period,
        ...data,
      })),
    };
  }

  private getPeriodKey(date: Date, groupBy: string): string {
    const d = new Date(date);
    switch (groupBy) {
      case 'day':
        return d.toISOString().split('T')[0];
      case 'week': {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().split('T')[0];
      }
      case 'month':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      case 'quarter': {
        const quarter = Math.ceil((d.getMonth() + 1) / 3);
        return `${d.getFullYear()}-Q${quarter}`;
      }
      case 'year':
        return `${d.getFullYear()}`;
      default:
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }
}
