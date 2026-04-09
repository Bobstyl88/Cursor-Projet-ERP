'use client';

import React, { useState } from 'react';
import { Plus, Search, MoreHorizontal } from 'lucide-react';
import { Button, Badge, Card, DataTable } from '@/components/ui';
import type { Column } from '@/components/ui/data-table';
import type { BadgeVariant } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PurchaseOrderRow {
  id: string;
  number: string;
  supplier: string;
  date: string;
  expectedDate: string;
  status: string;
  total: number;
}

const statusColors: Record<string, BadgeVariant> = {
  DRAFT: 'gray',
  SENT: 'blue',
  CONFIRMED: 'green',
  RECEIVED: 'purple',
  CANCELLED: 'red',
};

const mockOrders: PurchaseOrderRow[] = [
  { id: '1', number: 'PO-2024-0034', supplier: 'Supplier ABC', date: '2024-12-15', expectedDate: '2024-12-25', status: 'CONFIRMED', total: 24500 },
  { id: '2', number: 'PO-2024-0033', supplier: 'Parts Direct', date: '2024-12-14', expectedDate: '2024-12-22', status: 'SENT', total: 8200 },
  { id: '3', number: 'PO-2024-0032', supplier: 'Global Materials', date: '2024-12-13', expectedDate: '2024-12-20', status: 'RECEIVED', total: 15600 },
  { id: '4', number: 'PO-2024-0031', supplier: 'TechParts Inc', date: '2024-12-12', expectedDate: '2024-12-28', status: 'DRAFT', total: 31000 },
  { id: '5', number: 'PO-2024-0030', supplier: 'Supplier ABC', date: '2024-12-10', expectedDate: '2024-12-18', status: 'RECEIVED', total: 12800 },
  { id: '6', number: 'PO-2024-0029', supplier: 'Premium Goods', date: '2024-12-08', expectedDate: '2024-12-16', status: 'CANCELLED', total: 4500 },
  { id: '7', number: 'PO-2024-0028', supplier: 'Parts Direct', date: '2024-12-06', expectedDate: '2024-12-14', status: 'RECEIVED', total: 19200 },
];

export default function PurchaseOrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredData = mockOrders.filter((o) => {
    const matchSearch =
      !search ||
      o.number.toLowerCase().includes(search.toLowerCase()) ||
      o.supplier.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns: Column<PurchaseOrderRow>[] = [
    {
      key: 'number',
      header: 'Number',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.number}</span>
      ),
    },
    { key: 'supplier', header: 'Supplier', sortable: true },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.date),
    },
    {
      key: 'expectedDate',
      header: 'Expected',
      render: (row) => formatDate(row.expectedDate),
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
          <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-secondary-500 mt-1">Manage procurement and supplier orders</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>
          New Purchase Order
        </Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-secondary-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search purchase orders..."
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
            <option value="CONFIRMED">Confirmed</option>
            <option value="RECEIVED">Received</option>
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
