'use client';

import React, { useState } from 'react';
import { Plus, Search, Warehouse as WarehouseIcon, MapPin, MoreHorizontal } from 'lucide-react';
import { Button, Badge, Card, DataTable } from '@/components/ui';
import type { Column } from '@/components/ui/data-table';

interface WarehouseRow {
  id: string;
  name: string;
  code: string;
  address: string;
  totalProducts: number;
  totalStock: number;
  isActive: boolean;
}

const mockWarehouses: WarehouseRow[] = [
  { id: '1', name: 'Main Warehouse', code: 'WH-MAIN', address: '123 Industrial Blvd, Chicago, IL', totalProducts: 156, totalStock: 12450, isActive: true },
  { id: '2', name: 'West Coast Hub', code: 'WH-WEST', address: '456 Commerce Dr, Los Angeles, CA', totalProducts: 98, totalStock: 8200, isActive: true },
  { id: '3', name: 'East Distribution', code: 'WH-EAST', address: '789 Logistics Ave, New York, NY', totalProducts: 124, totalStock: 9800, isActive: true },
  { id: '4', name: 'South Storage', code: 'WH-SOUTH', address: '321 Supply Rd, Houston, TX', totalProducts: 45, totalStock: 3200, isActive: false },
];

export default function WarehousesPage() {
  const [search, setSearch] = useState('');

  const filteredData = mockWarehouses.filter((w) =>
    !search ||
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.code.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<WarehouseRow>[] = [
    {
      key: 'name',
      header: 'Warehouse',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary-50 flex items-center justify-center">
            <WarehouseIcon className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-secondary-900">{row.name}</p>
            <p className="text-xs text-secondary-500">{row.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Location',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-sm text-secondary-600">
          <MapPin className="h-3.5 w-3.5 text-secondary-400" />
          {row.address}
        </div>
      ),
    },
    { key: 'totalProducts', header: 'Products', sortable: true },
    {
      key: 'totalStock',
      header: 'Total Stock',
      sortable: true,
      render: (row) => row.totalStock.toLocaleString(),
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
          <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Warehouses</h1>
          <p className="text-sm text-secondary-500 mt-1">Manage your warehouse locations</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>
          Add Warehouse
        </Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-secondary-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search warehouses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
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
