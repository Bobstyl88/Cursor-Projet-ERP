'use client';

import React, { useState } from 'react';
import { Plus, Search, MoreHorizontal } from 'lucide-react';
import { Button, Badge, Card, DataTable } from '@/components/ui';
import type { Column } from '@/components/ui/data-table';
import type { BadgeVariant } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentRow {
  id: string;
  number: string;
  invoice: string;
  customer: string;
  date: string;
  amount: number;
  method: string;
  reference: string;
}

const methodColors: Record<string, BadgeVariant> = {
  BANK_TRANSFER: 'blue',
  CASH: 'green',
  CHECK: 'gray',
  CREDIT_CARD: 'purple',
  OTHER: 'gray',
};

const mockPayments: PaymentRow[] = [
  { id: '1', number: 'PAY-2024-0045', invoice: 'INV-2024-0088', customer: 'TechStart Inc', date: '2024-12-14', amount: 8750, method: 'BANK_TRANSFER', reference: 'TRX-98765' },
  { id: '2', number: 'PAY-2024-0044', invoice: 'INV-2024-0086', customer: 'Innovation Labs', date: '2024-12-13', amount: 2800, method: 'CREDIT_CARD', reference: 'CC-45678' },
  { id: '3', number: 'PAY-2024-0043', invoice: 'INV-2024-0085', customer: 'Summit Industries', date: '2024-12-12', amount: 21350, method: 'BANK_TRANSFER', reference: 'TRX-98764' },
  { id: '4', number: 'PAY-2024-0042', invoice: 'INV-2024-0083', customer: 'Metro Systems', date: '2024-12-10', amount: 27500, method: 'CHECK', reference: 'CHK-1234' },
  { id: '5', number: 'PAY-2024-0041', invoice: 'INV-2024-0080', customer: 'Acme Corp', date: '2024-12-08', amount: 5000, method: 'CASH', reference: 'RCP-5678' },
  { id: '6', number: 'PAY-2024-0040', invoice: 'INV-2024-0079', customer: 'Global Trade Co', date: '2024-12-06', amount: 15000, method: 'BANK_TRANSFER', reference: 'TRX-98763' },
];

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const filteredData = mockPayments.filter((p) => {
    const matchSearch =
      !search ||
      p.number.toLowerCase().includes(search.toLowerCase()) ||
      p.customer.toLowerCase().includes(search.toLowerCase()) ||
      p.invoice.toLowerCase().includes(search.toLowerCase());
    const matchMethod = !methodFilter || p.method === methodFilter;
    return matchSearch && matchMethod;
  });

  const columns: Column<PaymentRow>[] = [
    {
      key: 'number',
      header: 'Number',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.number}</span>
      ),
    },
    {
      key: 'invoice',
      header: 'Invoice',
      render: (row) => (
        <span className="text-sm text-secondary-600">{row.invoice}</span>
      ),
    },
    { key: 'customer', header: 'Customer', sortable: true },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.date),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      className: 'text-right',
      render: (row) => (
        <span className="font-medium text-accent-600">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: (row) => (
        <Badge variant={methodColors[row.method]}>
          {row.method.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => (
        <span className="text-sm text-secondary-500 font-mono">{row.reference}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: () => (
        <button className="p-1.5 rounded-md text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Payments</h1>
          <p className="text-sm text-secondary-500 mt-1">Track payments and receipts</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>
          Record Payment
        </Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-secondary-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search payments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-secondary-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="">All Methods</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CASH">Cash</option>
            <option value="CHECK">Check</option>
            <option value="CREDIT_CARD">Credit Card</option>
          </select>
        </div>

        <DataTable
          columns={columns}
          data={filteredData}
          keyExtractor={(row) => row.id}
          page={1}
          totalPages={1}
          total={filteredData.length}
        />
      </Card>
    </div>
  );
}
