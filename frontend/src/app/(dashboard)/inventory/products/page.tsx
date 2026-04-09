'use client';

import React, { useState } from 'react';
import { Plus, Search, MoreHorizontal, Package } from 'lucide-react';
import { Button, Badge, Card, DataTable } from '@/components/ui';
import type { Column } from '@/components/ui/data-table';
import { formatCurrency } from '@/lib/utils';

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  type: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  isActive: boolean;
}

const mockProducts: ProductRow[] = [
  { id: '1', name: 'Widget Pro X1', sku: 'WPX-001', type: 'GOODS', category: 'Hardware', unitPrice: 299.99, costPrice: 180.00, isActive: true },
  { id: '2', name: 'Enterprise License', sku: 'EL-001', type: 'SERVICE', category: 'Software', unitPrice: 1999.99, costPrice: 0, isActive: true },
  { id: '3', name: 'Consulting Hour', sku: 'CON-001', type: 'SERVICE', category: 'Services', unitPrice: 150.00, costPrice: 75.00, isActive: true },
  { id: '4', name: 'Support Package', sku: 'SUP-001', type: 'SERVICE', category: 'Services', unitPrice: 499.99, costPrice: 200.00, isActive: true },
  { id: '5', name: 'Gadget Lite', sku: 'GL-001', type: 'GOODS', category: 'Hardware', unitPrice: 149.99, costPrice: 90.00, isActive: false },
  { id: '6', name: 'Server Module', sku: 'SM-001', type: 'GOODS', category: 'Hardware', unitPrice: 799.99, costPrice: 450.00, isActive: true },
  { id: '7', name: 'Data Migration', sku: 'DM-001', type: 'SERVICE', category: 'Services', unitPrice: 2500.00, costPrice: 1200.00, isActive: true },
  { id: '8', name: 'Wireless Adapter', sku: 'WA-001', type: 'GOODS', category: 'Accessories', unitPrice: 59.99, costPrice: 25.00, isActive: true },
];

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filteredData = mockProducts.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || p.type === typeFilter;
    return matchSearch && matchType;
  });

  const columns: Column<ProductRow>[] = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-secondary-100 flex items-center justify-center">
            <Package className="h-4 w-4 text-secondary-500" />
          </div>
          <div>
            <p className="font-medium text-secondary-900">{row.name}</p>
            <p className="text-xs text-secondary-500">{row.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <Badge variant={row.type === 'GOODS' ? 'blue' : 'purple'}>
          {row.type}
        </Badge>
      ),
    },
    { key: 'category', header: 'Category', sortable: true },
    {
      key: 'unitPrice',
      header: 'Unit Price',
      sortable: true,
      className: 'text-right',
      render: (row) => formatCurrency(row.unitPrice),
    },
    {
      key: 'costPrice',
      header: 'Cost Price',
      className: 'text-right',
      render: (row) => formatCurrency(row.costPrice),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.isActive ? 'green' : 'gray'} dot>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
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
          <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Products</h1>
          <p className="text-sm text-secondary-500 mt-1">Manage your product catalog</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>
          Add Product
        </Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-secondary-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search products..."
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
            <option value="GOODS">Goods</option>
            <option value="SERVICE">Service</option>
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
