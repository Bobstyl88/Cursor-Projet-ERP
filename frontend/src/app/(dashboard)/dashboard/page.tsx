'use client';

import React from 'react';
import Link from 'next/link';
import {
  DollarSign,
  FileText,
  ShoppingCart,
  Boxes,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { BadgeVariant } from '@/components/ui/badge';

const revenueData = [
  { month: 'Jan', revenue: 42000, expenses: 28000 },
  { month: 'Feb', revenue: 48000, expenses: 31000 },
  { month: 'Mar', revenue: 55000, expenses: 33000 },
  { month: 'Apr', revenue: 51000, expenses: 30000 },
  { month: 'May', revenue: 58000, expenses: 34000 },
  { month: 'Jun', revenue: 62000, expenses: 36000 },
  { month: 'Jul', revenue: 67000, expenses: 38000 },
  { month: 'Aug', revenue: 65000, expenses: 37000 },
  { month: 'Sep', revenue: 71000, expenses: 39000 },
  { month: 'Oct', revenue: 76000, expenses: 42000 },
  { month: 'Nov', revenue: 82000, expenses: 44000 },
  { month: 'Dec', revenue: 89000, expenses: 47000 },
];

const kpiCards = [
  {
    title: 'Total Revenue',
    value: 766000,
    change: 12.5,
    icon: DollarSign,
    color: 'text-accent-600 bg-accent-50',
  },
  {
    title: 'Outstanding Invoices',
    value: 124500,
    change: -3.2,
    icon: FileText,
    color: 'text-warning-600 bg-warning-50',
  },
  {
    title: 'Total Orders',
    value: 342,
    change: 8.1,
    icon: ShoppingCart,
    color: 'text-primary-600 bg-primary-50',
    isCurrency: false,
  },
  {
    title: 'Stock Value',
    value: 456000,
    change: 2.4,
    icon: Boxes,
    color: 'text-purple-600 bg-purple-50',
  },
];

const recentQuotations = [
  { id: '1', number: 'QT-2024-0042', customer: 'Acme Corp', date: '2024-12-15', status: 'SENT' as const, total: 15420 },
  { id: '2', number: 'QT-2024-0041', customer: 'TechStart Inc', date: '2024-12-14', status: 'DRAFT' as const, total: 8750 },
  { id: '3', number: 'QT-2024-0040', customer: 'Global Trade Co', date: '2024-12-13', status: 'ACCEPTED' as const, total: 32100 },
  { id: '4', number: 'QT-2024-0039', customer: 'Innovation Labs', date: '2024-12-12', status: 'REJECTED' as const, total: 5600 },
  { id: '5', number: 'QT-2024-0038', customer: 'Summit Industries', date: '2024-12-11', status: 'CONVERTED' as const, total: 21350 },
];

const recentInvoices = [
  { id: '1', number: 'INV-2024-0089', customer: 'Acme Corp', dueDate: '2024-12-30', status: 'SENT' as const, total: 15420 },
  { id: '2', number: 'INV-2024-0088', customer: 'TechStart Inc', dueDate: '2024-12-28', status: 'PAID' as const, total: 8750 },
  { id: '3', number: 'INV-2024-0087', customer: 'Global Trade Co', dueDate: '2024-12-25', status: 'OVERDUE' as const, total: 32100 },
  { id: '4', number: 'INV-2024-0086', customer: 'Innovation Labs', dueDate: '2024-12-22', status: 'PARTIALLY_PAID' as const, total: 5600 },
  { id: '5', number: 'INV-2024-0085', customer: 'Summit Industries', dueDate: '2024-12-20', status: 'PAID' as const, total: 21350 },
];

const statusColors: Record<string, BadgeVariant> = {
  DRAFT: 'gray',
  SENT: 'blue',
  ACCEPTED: 'green',
  REJECTED: 'red',
  CONVERTED: 'purple',
  PAID: 'green',
  OVERDUE: 'red',
  PARTIALLY_PAID: 'yellow',
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-secondary-500 mt-1">
          Welcome back. Here&apos;s an overview of your business.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-secondary-500">{kpi.title}</p>
                <p className="text-2xl font-bold text-secondary-900">
                  {kpi.isCurrency === false
                    ? kpi.value.toLocaleString()
                    : formatCurrency(kpi.value)}
                </p>
              </div>
              <div className={cn('p-2.5 rounded-xl', kpi.color)}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              {kpi.change >= 0 ? (
                <TrendingUp className="h-4 w-4 text-accent-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-error-500" />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  kpi.change >= 0 ? 'text-accent-600' : 'text-error-600'
                )}
              >
                {kpi.change >= 0 ? '+' : ''}
                {kpi.change}%
              </span>
              <span className="text-sm text-secondary-400">vs last month</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
        </CardHeader>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(v) => `$${v / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorRevenue)"
                name="Revenue"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#colorExpenses)"
                name="Expenses"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quotations */}
        <Card padding={false}>
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary-900">Recent Quotations</h3>
              <Link
                href="/sales/quotations"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-secondary-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Number</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {recentQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-secondary-50/50 transition-colors">
                    <td className="px-6 py-3.5 text-sm font-medium text-primary-600">{q.number}</td>
                    <td className="px-6 py-3.5 text-sm text-secondary-700">{q.customer}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={statusColors[q.status]} dot>
                        {q.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-secondary-900 font-medium text-right">
                      {formatCurrency(q.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Invoices */}
        <Card padding={false}>
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary-900">Recent Invoices</h3>
              <Link
                href="/invoicing/invoices"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-secondary-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Number</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-secondary-50/50 transition-colors">
                    <td className="px-6 py-3.5 text-sm font-medium text-primary-600">{inv.number}</td>
                    <td className="px-6 py-3.5 text-sm text-secondary-700">{inv.customer}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={statusColors[inv.status]} dot>
                        {inv.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-secondary-900 font-medium text-right">
                      {formatCurrency(inv.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Accounts Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Accounts Receivable</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-500">Current</span>
              <span className="text-sm font-semibold text-secondary-900">{formatCurrency(45200)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-500">1-30 days</span>
              <span className="text-sm font-semibold text-secondary-900">{formatCurrency(32100)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-500">31-60 days</span>
              <span className="text-sm font-semibold text-warning-600">{formatCurrency(18900)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-500">61-90 days</span>
              <span className="text-sm font-semibold text-error-600">{formatCurrency(8400)}</span>
            </div>
            <div className="pt-3 border-t border-secondary-200 flex justify-between items-center">
              <span className="text-sm font-medium text-secondary-700">Total Outstanding</span>
              <span className="text-base font-bold text-secondary-900">{formatCurrency(104600)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accounts Payable</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-500">Current</span>
              <span className="text-sm font-semibold text-secondary-900">{formatCurrency(28100)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-500">1-30 days</span>
              <span className="text-sm font-semibold text-secondary-900">{formatCurrency(15600)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-500">31-60 days</span>
              <span className="text-sm font-semibold text-warning-600">{formatCurrency(7200)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-500">61-90 days</span>
              <span className="text-sm font-semibold text-error-600">{formatCurrency(3100)}</span>
            </div>
            <div className="pt-3 border-t border-secondary-200 flex justify-between items-center">
              <span className="text-sm font-medium text-secondary-700">Total Outstanding</span>
              <span className="text-base font-bold text-secondary-900">{formatCurrency(54000)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
