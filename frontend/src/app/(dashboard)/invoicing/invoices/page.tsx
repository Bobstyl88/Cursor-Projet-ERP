'use client';

import React, { useState } from 'react';
import { Plus, Search, MoreHorizontal } from 'lucide-react';
import { Button, Badge, Card, DataTable } from '@/components/ui';
import type { Column } from '@/components/ui/data-table';
import type { BadgeVariant } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface InvoiceRow {
  id: string;
  number: string;
  type: string;
  customer: string;
  date: string;
  dueDate: string;
  status: string;
  total: number;
  amountDue: number;
}

const statusColors: Record<string, BadgeVariant> = {
  DRAFT: 'gray',
  SENT: 'blue',
  PARTIALLY_PAID: 'yellow',
  PAID: 'green',
  OVERDUE: 'red',
  CANCELLED: 'gray',
  VOID: 'gray',
};

const typeColors: Record<string, BadgeVariant> = {
  SALES: 'blue',
  PURCHASE: 'purple',
  CREDIT_NOTE: 'yellow',
  DEBIT_NOTE: 'indigo',
};

const mockInvoices: InvoiceRow[] = [
  { id: '1', number: 'INV-2024-0089', type: 'SALES', customer: 'Acme Corp', date: '2024-12-15', dueDate: '2024-12-30', status: 'SENT', total: 15420, amountDue: 15420 },
  { id: '2', number: 'INV-2024-0088', type: 'SALES', customer: 'TechStart Inc', date: '2024-12-14', dueDate: '2024-12-28', status: 'PAID', total: 8750, amountDue: 0 },
  { id: '3', number: 'INV-2024-0087', type: 'SALES', customer: 'Global Trade Co', date: '2024-12-13', dueDate: '2024-12-25', status: 'OVERDUE', total: 32100, amountDue: 32100 },
  { id: '4', number: 'INV-2024-0086', type: 'PURCHASE', customer: 'Innovation Labs', date: '2024-12-12', dueDate: '2024-12-22', status: 'PARTIALLY_PAID', total: 5600, amountDue: 2800 },
  { id: '5', number: 'INV-2024-0085', type: 'SALES', customer: 'Summit Industries', date: '2024-12-11', dueDate: '2024-12-20', status: 'PAID', total: 21350, amountDue: 0 },
  { id: '6', number: 'CN-2024-0003', type: 'CREDIT_NOTE', customer: 'Pacific Solutions', date: '2024-12-10', dueDate: '2024-12-10', status: 'DRAFT', total: 1200, amountDue: 1200 },
  { id: '7', number: 'INV-2024-0084', type: 'SALES', customer: 'Alpine Group', date: '2024-12-09', dueDate: '2024-12-24', status: 'SENT', total: 14200, amountDue: 14200 },
  { id: '8', number: 'INV-2024-0083', type: 'PURCHASE', customer: 'Metro Systems', date: '2024-12-08', dueDate: '2024-12-23', status: 'PAID', total: 27500, amountDue: 0 },
];

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filteredData = mockInvoices.filter((inv) => {
    const matchSearch =
      !search ||
      inv.number.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || inv.status === statusFilter;
    const matchType = !typeFilter || inv.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const columns: Column<InvoiceRow>[] = [
    {
      key: 'number',
      header: 'Number',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.number}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <Badge variant={typeColors[row.type]}>
          {row.type.replace('_', ' ')}
        </Badge>
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
      key: 'dueDate',
      header: 'Due Date',
      render: (row) => formatDate(row.dueDate),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={statusColors[row.status]} dot>
          {row.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      className: 'text-right',
      render: (row) => formatCurrency(row.total),
    },
    {
      key: 'amountDue',
      header: 'Amount Due',
      className: 'text-right',
      render: (row) => (
        <span className={row.amountDue > 0 ? 'font-medium text-secondary-900' : 'text-secondary-400'}>
          {formatCurrency(row.amountDue)}
        </span>
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
          <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Invoices</h1>
          <p className="text-sm text-secondary-500 mt-1">Manage invoices and billing</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>
          New Invoice
        </Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-secondary-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-secondary-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="">All Types</option>
            <option value="SALES">Sales</option>
            <option value="PURCHASE">Purchase</option>
            <option value="CREDIT_NOTE">Credit Note</option>
            <option value="DEBIT_NOTE">Debit Note</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-secondary-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
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
