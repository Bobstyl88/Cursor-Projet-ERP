'use client';

import React, { useState } from 'react';
import { Plus, Search, MoreHorizontal } from 'lucide-react';
import { Button, Badge, Card, DataTable } from '@/components/ui';
import type { Column } from '@/components/ui/data-table';
import type { BadgeVariant } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface JournalEntryRow {
  id: string;
  number: string;
  date: string;
  description: string;
  status: string;
  totalDebit: number;
  totalCredit: number;
}

const statusColors: Record<string, BadgeVariant> = {
  DRAFT: 'gray',
  POSTED: 'green',
  CANCELLED: 'red',
};

const mockEntries: JournalEntryRow[] = [
  { id: '1', number: 'JE-2024-0156', date: '2024-12-15', description: 'Sales revenue recognition - Acme Corp', status: 'POSTED', totalDebit: 15420, totalCredit: 15420 },
  { id: '2', number: 'JE-2024-0155', date: '2024-12-14', description: 'Purchase of inventory - Supplier ABC', status: 'POSTED', totalDebit: 8200, totalCredit: 8200 },
  { id: '3', number: 'JE-2024-0154', date: '2024-12-13', description: 'Salary expenses - December', status: 'DRAFT', totalDebit: 45000, totalCredit: 45000 },
  { id: '4', number: 'JE-2024-0153', date: '2024-12-12', description: 'Depreciation - Monthly', status: 'POSTED', totalDebit: 2500, totalCredit: 2500 },
  { id: '5', number: 'JE-2024-0152', date: '2024-12-11', description: 'Office rent payment', status: 'POSTED', totalDebit: 5000, totalCredit: 5000 },
  { id: '6', number: 'JE-2024-0151', date: '2024-12-10', description: 'Customer payment received - TechStart', status: 'POSTED', totalDebit: 8750, totalCredit: 8750 },
  { id: '7', number: 'JE-2024-0150', date: '2024-12-09', description: 'Utility expenses', status: 'CANCELLED', totalDebit: 1200, totalCredit: 1200 },
  { id: '8', number: 'JE-2024-0149', date: '2024-12-08', description: 'Insurance premium', status: 'POSTED', totalDebit: 3500, totalCredit: 3500 },
];

export default function JournalEntriesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredData = mockEntries.filter((e) => {
    const matchSearch =
      !search ||
      e.number.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns: Column<JournalEntryRow>[] = [
    {
      key: 'number',
      header: 'Number',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.number}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.date),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <span className="text-secondary-700 max-w-xs truncate block">{row.description}</span>
      ),
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
      key: 'totalDebit',
      header: 'Debit',
      sortable: true,
      className: 'text-right',
      render: (row) => formatCurrency(row.totalDebit),
    },
    {
      key: 'totalCredit',
      header: 'Credit',
      className: 'text-right',
      render: (row) => formatCurrency(row.totalCredit),
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
          <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Journal Entries</h1>
          <p className="text-sm text-secondary-500 mt-1">Record and manage accounting entries</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>
          New Entry
        </Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-secondary-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search journal entries..."
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
            <option value="POSTED">Posted</option>
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
