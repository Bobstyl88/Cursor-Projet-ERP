'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, MoreHorizontal, Send, Check, X, ArrowRightLeft } from 'lucide-react';
import { Button, Badge, Card, DataTable } from '@/components/ui';
import type { Column } from '@/components/ui/data-table';
import type { BadgeVariant } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface QuotationRow {
  id: string;
  number: string;
  customer: string;
  date: string;
  validUntil: string;
  status: string;
  total: number;
}

const statusColors: Record<string, BadgeVariant> = {
  DRAFT: 'gray',
  SENT: 'blue',
  ACCEPTED: 'green',
  REJECTED: 'red',
  CONVERTED: 'purple',
  EXPIRED: 'gray',
};

const mockData: QuotationRow[] = [
  { id: '1', number: 'QT-2024-0042', customer: 'Acme Corp', date: '2024-12-15', validUntil: '2025-01-15', status: 'SENT', total: 15420 },
  { id: '2', number: 'QT-2024-0041', customer: 'TechStart Inc', date: '2024-12-14', validUntil: '2025-01-14', status: 'DRAFT', total: 8750 },
  { id: '3', number: 'QT-2024-0040', customer: 'Global Trade Co', date: '2024-12-13', validUntil: '2025-01-13', status: 'ACCEPTED', total: 32100 },
  { id: '4', number: 'QT-2024-0039', customer: 'Innovation Labs', date: '2024-12-12', validUntil: '2025-01-12', status: 'REJECTED', total: 5600 },
  { id: '5', number: 'QT-2024-0038', customer: 'Summit Industries', date: '2024-12-11', validUntil: '2025-01-11', status: 'CONVERTED', total: 21350 },
  { id: '6', number: 'QT-2024-0037', customer: 'Pacific Solutions', date: '2024-12-10', validUntil: '2025-01-10', status: 'SENT', total: 9800 },
  { id: '7', number: 'QT-2024-0036', customer: 'Alpine Group', date: '2024-12-09', validUntil: '2025-01-09', status: 'DRAFT', total: 14200 },
  { id: '8', number: 'QT-2024-0035', customer: 'Metro Systems', date: '2024-12-08', validUntil: '2025-01-08', status: 'ACCEPTED', total: 27500 },
];

export default function QuotationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredData = mockData.filter((q) => {
    const matchSearch =
      !search ||
      q.number.toLowerCase().includes(search.toLowerCase()) ||
      q.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns: Column<QuotationRow>[] = [
    {
      key: 'number',
      header: 'Number',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600 hover:text-primary-700 cursor-pointer">
          {row.number}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      sortable: true,
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.date),
    },
    {
      key: 'validUntil',
      header: 'Valid Until',
      render: (row) => formatDate(row.validUntil),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={statusColors[row.status]} dot>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      className: 'text-right',
      render: (row) => (
        <span className="font-medium">{formatCurrency(row.total)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (row) => (
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
          <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Quotations</h1>
          <p className="text-sm text-secondary-500 mt-1">Manage your sales quotations</p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => router.push('/sales/quotations/new')}
        >
          New Quotation
        </Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-secondary-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search quotations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-secondary-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="CONVERTED">Converted</option>
          </select>
        </div>

        <DataTable
          columns={columns}
          data={filteredData}
          keyExtractor={(row) => row.id}
          page={1}
          totalPages={1}
          total={filteredData.length}
          onRowClick={(row) => router.push(`/sales/quotations/${row.id}`)}
        />
      </Card>
    </div>
  );
}
