'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  FileText,
  ShoppingCart,
  Receipt,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reporting/dashboard').then((r) => r.data.data || r.data),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-32 bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};

  const stats = [
    {
      name: 'Total Revenue',
      value: formatCurrency(Number(kpis.totalRevenue) || 0),
      icon: TrendingUp,
      color: 'bg-green-50 text-green-700',
      iconColor: 'text-green-600',
    },
    {
      name: 'Outstanding',
      value: formatCurrency(Number(kpis.outstandingAmount) || 0),
      icon: Clock,
      color: 'bg-yellow-50 text-yellow-700',
      iconColor: 'text-yellow-600',
    },
    {
      name: 'Quotations',
      value: kpis.totalQuotations || 0,
      subtitle: `${kpis.pendingQuotations || 0} pending`,
      icon: FileText,
      color: 'bg-blue-50 text-blue-700',
      iconColor: 'text-blue-600',
    },
    {
      name: 'Unpaid Invoices',
      value: kpis.unpaidInvoices || 0,
      subtitle: `${kpis.overdueInvoices || 0} overdue`,
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-700',
      iconColor: 'text-red-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your business performance
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center justify-between">
              <div
                className={`rounded-lg p-2 ${stat.color}`}
              >
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">{stat.name}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stat.value}
              </p>
              {stat.subtitle && (
                <p className="mt-1 text-xs text-gray-500">{stat.subtitle}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Invoices
          </h3>
          <div className="space-y-3">
            {(data?.recentInvoices || []).map((invoice: any) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2">
                    <Receipt className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {invoice.number}
                    </p>
                    <p className="text-xs text-gray-500">
                      {invoice.contact?.companyName || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(Number(invoice.total))}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      invoice.status === 'PAID'
                        ? 'bg-green-50 text-green-700'
                        : invoice.status === 'OVERDUE'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {invoice.status}
                  </span>
                </div>
              </div>
            ))}
            {(!data?.recentInvoices || data.recentInvoices.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-8">
                No invoices yet
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Quotations
          </h3>
          <div className="space-y-3">
            {(data?.recentQuotations || []).map((quotation: any) => (
              <div
                key={quotation.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-50 p-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {quotation.number}
                    </p>
                    <p className="text-xs text-gray-500">
                      {quotation.contact?.companyName || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(Number(quotation.total))}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      quotation.status === 'ACCEPTED'
                        ? 'bg-green-50 text-green-700'
                        : quotation.status === 'REJECTED'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {quotation.status}
                  </span>
                </div>
              </div>
            ))}
            {(!data?.recentQuotations || data.recentQuotations.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-8">
                No quotations yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
