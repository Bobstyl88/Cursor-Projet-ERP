import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument, InvoiceStatus } from '../invoicing/schemas/invoice.schema';
import { SaleOrder, SaleOrderDocument } from '../sales/schemas/sale-order.schema';
import { PurchaseOrder, PurchaseOrderDocument } from '../purchases/schemas/purchase-order.schema';
import { StockLevel, StockLevelDocument } from '../inventory/schemas/stock-level.schema';
import { Account, AccountDocument } from '../accounting/schemas/account.schema';

export interface DashboardKpis {
  totalRevenue: number;
  totalOutstanding: number;
  totalPurchases: number;
  lowStockProducts: number;
  openQuotes: number;
  openInvoices: number;
}

@Injectable()
export class ReportingService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(SaleOrder.name) private saleOrderModel: Model<SaleOrderDocument>,
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(StockLevel.name) private stockLevelModel: Model<StockLevelDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
  ) {}

  async getDashboardKpis(tenantId: string, year?: number): Promise<DashboardKpis> {
    const currentYear = year ?? new Date().getFullYear();
    const from = new Date(`${currentYear}-01-01`);
    const to = new Date(`${currentYear}-12-31T23:59:59`);

    const [revenueAgg, outstandingAgg, purchasesAgg, lowStock, openInvoices] =
      await Promise.all([
        this.invoiceModel.aggregate([
          { $match: { tenantId, status: InvoiceStatus.PAID, issueDate: { $gte: from, $lte: to } } },
          { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]),
        this.invoiceModel.aggregate([
          { $match: { tenantId, status: { $in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] } } },
          { $group: { _id: null, total: { $sum: '$balanceDue' } } },
        ]),
        this.poModel.aggregate([
          { $match: { tenantId, orderDate: { $gte: from, $lte: to } } },
          { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]),
        this.stockLevelModel.countDocuments({ tenantId, quantity: { $lte: '$reorderPoint' } }),
        this.invoiceModel.countDocuments({
          tenantId,
          status: { $in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
        }),
      ]);

    return {
      totalRevenue: revenueAgg[0]?.total ?? 0,
      totalOutstanding: outstandingAgg[0]?.total ?? 0,
      totalPurchases: purchasesAgg[0]?.total ?? 0,
      lowStockProducts: lowStock,
      openQuotes: 0,
      openInvoices,
    };
  }

  async getRevenueByMonth(tenantId: string, year?: number) {
    const currentYear = year ?? new Date().getFullYear();
    return this.invoiceModel.aggregate([
      {
        $match: {
          tenantId,
          status: InvoiceStatus.PAID,
          issueDate: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$issueDate' } },
          revenue: { $sum: '$grandTotal' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);
  }

  async getAccountsReceivableAging(tenantId: string) {
    const now = new Date();
    return this.invoiceModel.aggregate([
      {
        $match: {
          tenantId,
          status: { $in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
        },
      },
      {
        $project: {
          number: 1,
          partyId: 1,
          balanceDue: 1,
          daysOverdue: { $divide: [{ $subtract: [now, '$dueDate'] }, 86400000] },
        },
      },
      {
        $bucket: {
          groupBy: '$daysOverdue',
          boundaries: [-Infinity, 0, 30, 60, 90, Infinity],
          default: 'unknown',
          output: { total: { $sum: '$balanceDue' }, count: { $sum: 1 } },
        },
      },
    ]);
  }

  async getIncomeStatement(tenantId: string, year?: number) {
    const currentYear = year ?? new Date().getFullYear();
    return this.accountModel.aggregate([
      {
        $match: {
          tenantId,
          type: { $in: ['revenue', 'expense'] },
          isActive: true,
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$balance' },
          accounts: { $push: { code: '$code', name: '$name', balance: '$balance' } },
        },
      },
    ]);
  }
}
