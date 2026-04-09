import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const [
      totalQuotations,
      pendingQuotations,
      totalSalesOrders,
      totalInvoices,
      unpaidInvoices,
      overdueInvoices,
      totalPurchaseOrders,
      recentInvoices,
      recentQuotations,
    ] = await Promise.all([
      this.prisma.quotation.count({ where: { tenantId } }),
      this.prisma.quotation.count({ where: { tenantId, status: 'SENT' } }),
      this.prisma.salesOrder.count({ where: { tenantId } }),
      this.prisma.invoice.count({ where: { tenantId, type: 'SALES' } }),
      this.prisma.invoice.count({
        where: { tenantId, type: 'SALES', status: { in: ['SENT', 'PARTIALLY_PAID'] } },
      }),
      this.prisma.invoice.count({
        where: { tenantId, type: 'SALES', status: 'OVERDUE' },
      }),
      this.prisma.purchaseOrder.count({ where: { tenantId } }),
      this.prisma.invoice.findMany({
        where: { tenantId, type: 'SALES' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          amountPaid: true,
          contact: { select: { companyName: true } },
          createdAt: true,
        },
      }),
      this.prisma.quotation.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          contact: { select: { companyName: true } },
          createdAt: true,
        },
      }),
    ]);

    const revenueResult = await this.prisma.invoice.aggregate({
      where: { tenantId, type: 'SALES', status: { in: ['PAID', 'PARTIALLY_PAID'] } },
      _sum: { amountPaid: true },
    });

    const outstandingResult = await this.prisma.invoice.aggregate({
      where: { tenantId, type: 'SALES', status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } },
      _sum: { total: true },
    });

    return {
      kpis: {
        totalRevenue: revenueResult._sum.amountPaid || 0,
        outstandingAmount: outstandingResult._sum.total || 0,
        totalQuotations,
        pendingQuotations,
        totalSalesOrders,
        totalInvoices,
        unpaidInvoices,
        overdueInvoices,
        totalPurchaseOrders,
      },
      recentInvoices,
      recentQuotations,
    };
  }

  async getSalesReport(
    tenantId: string,
    params: { startDate?: Date; endDate?: Date },
  ) {
    const where: any = { tenantId, type: 'SALES' as const };
    if (params.startDate || params.endDate) {
      where.issueDate = {};
      if (params.startDate) where.issueDate.gte = params.startDate;
      if (params.endDate) where.issueDate.lte = params.endDate;
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        contact: { select: { companyName: true } },
        lines: { include: { product: { select: { name: true, sku: true } } } },
      },
      orderBy: { issueDate: 'asc' },
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalTax = invoices.reduce((sum, inv) => sum + Number(inv.taxTotal), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);

    return {
      summary: {
        invoiceCount: invoices.length,
        totalRevenue,
        totalTax,
        totalPaid,
        totalOutstanding: totalRevenue - totalPaid,
      },
      invoices,
    };
  }
}
