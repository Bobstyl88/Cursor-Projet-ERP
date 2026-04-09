'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, MoreHorizontal } from 'lucide-react';
import { Button, Badge, Card, DataTable } from '@/components/ui';
import type { Column } from '@/components/ui/data-table';
import type { BadgeVariant } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface OrderRow {
  id: string;
  number: string;
  customer: string;
  date: string;
  status: string;
  total: number;
}

const statusColors: Record<string, BadgeVariant> = {
  DRAFT: 'gray',
  CONFIRMED: 'blue',
  PROCESSING: 'indigo',
  SHIPPED: 'purple',
  DELIVERED: 'green',
  CANCELLED: 'red',
};

const mockOrders: OrderRow[] = [
  { id: '1', number: 'SO-2024-0028', customer: 'Acme Corp', date: '2024-12-15', status: 'CONFIRMED', total: 15420 },
  { id: '2', number: 'SO-2024-0027', customer: 'TechStart Inc', date: '2024-12-14', status: 'PROCESSING', total: 8750 },
  { id: '3', number: 'SO-2024-0026', customer: 'Global Trade Co', date: '2024-12-13', status: 'DELIVERED', total: 32100 },
  { id: '4', number: 'SO-2024-0025', customer: 'Innovation Labs', date: '2024-12-12', status: 'SHIPPED', total: 5600 },
  { id: '5', number: 'SO-2024-0024', customer: 'Summit Industries', date: '2024-12-11', status: 'DRAFT', total: 21350 },
  { id: '6', number: 'SO-2024-0023', customer: 'Pacific Solutions', date: '2024-12-10', status: 'CANCELLED', total: 9800 },
  { id: '7', number: 'SO-2024-0022', customer: 'Alpine Group', date: '2024-12-09', status: 'CONFIRMED', total: 14200 },
  { id: '8', number: 'SO-2024-0021', customer: 'Metro Systems', date: '2024-12-08', status: 'DELIVERED', total: 27500 },
];

export default function SaleOrdersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredData = mockOrders.filter((o) => {
    const matchSearch =
      !search ||
      o.number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns: Column<OrderRow>[] = [
    {
      key: 'number',
      header: 'Number',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.number}</span>
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
          <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Sale Orders</h1>
          <p className="text-sm text-secondary-500 mt-1">Manage your sales orders</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>
          New Order
        </Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-secondary-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search orders..."
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
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
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
