'use client';

import React, { useState } from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import { Badge, Card, DataTable } from '@/components/ui';
import type { Column } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';

interface StockRow {
  id: string;
  product: string;
  sku: string;
  warehouse: string;
  quantity: number;
  reserved: number;
  available: number;
  reorderLevel: number;
}

const mockStock: StockRow[] = [
  { id: '1', product: 'Widget Pro X1', sku: 'WPX-001', warehouse: 'Main Warehouse', quantity: 450, reserved: 50, available: 400, reorderLevel: 100 },
  { id: '2', product: 'Gadget Lite', sku: 'GL-001', warehouse: 'Main Warehouse', quantity: 80, reserved: 20, available: 60, reorderLevel: 100 },
  { id: '3', product: 'Server Module', sku: 'SM-001', warehouse: 'West Coast Hub', quantity: 25, reserved: 5, available: 20, reorderLevel: 30 },
  { id: '4', product: 'Wireless Adapter', sku: 'WA-001', warehouse: 'Main Warehouse', quantity: 1200, reserved: 150, available: 1050, reorderLevel: 200 },
  { id: '5', product: 'Widget Pro X1', sku: 'WPX-001', warehouse: 'East Distribution', quantity: 320, reserved: 30, available: 290, reorderLevel: 100 },
  { id: '6', product: 'Server Module', sku: 'SM-001', warehouse: 'Main Warehouse', quantity: 15, reserved: 10, available: 5, reorderLevel: 30 },
  { id: '7', product: 'Wireless Adapter', sku: 'WA-001', warehouse: 'West Coast Hub', quantity: 800, reserved: 100, available: 700, reorderLevel: 200 },
  { id: '8', product: 'Gadget Lite', sku: 'GL-001', warehouse: 'East Distribution', quantity: 150, reserved: 0, available: 150, reorderLevel: 100 },
];

export default function StockLevelsPage() {
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  const filteredData = mockStock.filter((s) => {
    const matchSearch =
      !search ||
      s.product.toLowerCase().includes(search.toLowerCase()) ||
      s.sku.toLowerCase().includes(search.toLowerCase());
    const matchWarehouse = !warehouseFilter || s.warehouse === warehouseFilter;
    return matchSearch && matchWarehouse;
  });

  const columns: Column<StockRow>[] = [
    {
      key: 'product',
      header: 'Product',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-secondary-900">{row.product}</p>
          <p className="text-xs text-secondary-500">{row.sku}</p>
        </div>
      ),
    },
    { key: 'warehouse', header: 'Warehouse', sortable: true },
    {
      key: 'quantity',
      header: 'On Hand',
      sortable: true,
      className: 'text-right',
      render: (row) => row.quantity.toLocaleString(),
    },
    {
      key: 'reserved',
      header: 'Reserved',
      className: 'text-right',
      render: (row) => row.reserved.toLocaleString(),
    },
    {
      key: 'available',
      header: 'Available',
      sortable: true,
      className: 'text-right',
      render: (row) => (
        <span className={cn('font-medium', row.available < row.reorderLevel && 'text-error-600')}>
          {row.available.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        if (row.available < row.reorderLevel) {
          return (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-warning-500" />
              <Badge variant="yellow">Low Stock</Badge>
            </div>
          );
        }
        return <Badge variant="green">In Stock</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Stock Levels</h1>
        <p className="text-sm text-secondary-500 mt-1">Monitor inventory across warehouses</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-secondary-500">Total Items</p>
          <p className="text-2xl font-bold text-secondary-900 mt-1">3,040</p>
        </Card>
        <Card>
          <p className="text-sm text-secondary-500">Low Stock Alerts</p>
          <p className="text-2xl font-bold text-warning-600 mt-1">3</p>
        </Card>
        <Card>
          <p className="text-sm text-secondary-500">Out of Stock</p>
          <p className="text-2xl font-bold text-error-600 mt-1">0</p>
        </Card>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-secondary-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search by product or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-secondary-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="">All Warehouses</option>
            <option value="Main Warehouse">Main Warehouse</option>
            <option value="West Coast Hub">West Coast Hub</option>
            <option value="East Distribution">East Distribution</option>
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
