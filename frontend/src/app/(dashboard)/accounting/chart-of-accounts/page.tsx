'use client';

import React, { useState } from 'react';
import { Plus, ChevronRight, ChevronDown, Search } from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';
import type { BadgeVariant } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';

interface AccountNode {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  isActive: boolean;
  children?: AccountNode[];
}

const typeColors: Record<string, BadgeVariant> = {
  ASSET: 'blue',
  LIABILITY: 'red',
  EQUITY: 'purple',
  REVENUE: 'green',
  EXPENSE: 'yellow',
};

const mockAccounts: AccountNode[] = [
  {
    id: '1',
    code: '1000',
    name: 'Assets',
    type: 'ASSET',
    balance: 485000,
    isActive: true,
    children: [
      {
        id: '1a',
        code: '1100',
        name: 'Current Assets',
        type: 'ASSET',
        balance: 285000,
        isActive: true,
        children: [
          { id: '1a1', code: '1110', name: 'Cash and Bank', type: 'ASSET', balance: 125000, isActive: true },
          { id: '1a2', code: '1120', name: 'Accounts Receivable', type: 'ASSET', balance: 104600, isActive: true },
          { id: '1a3', code: '1130', name: 'Inventory', type: 'ASSET', balance: 55400, isActive: true },
        ],
      },
      {
        id: '1b',
        code: '1200',
        name: 'Non-Current Assets',
        type: 'ASSET',
        balance: 200000,
        isActive: true,
        children: [
          { id: '1b1', code: '1210', name: 'Property & Equipment', type: 'ASSET', balance: 150000, isActive: true },
          { id: '1b2', code: '1220', name: 'Intangible Assets', type: 'ASSET', balance: 50000, isActive: true },
        ],
      },
    ],
  },
  {
    id: '2',
    code: '2000',
    name: 'Liabilities',
    type: 'LIABILITY',
    balance: 168000,
    isActive: true,
    children: [
      { id: '2a', code: '2100', name: 'Accounts Payable', type: 'LIABILITY', balance: 54000, isActive: true },
      { id: '2b', code: '2200', name: 'Accrued Liabilities', type: 'LIABILITY', balance: 14000, isActive: true },
      { id: '2c', code: '2300', name: 'Long-term Debt', type: 'LIABILITY', balance: 100000, isActive: true },
    ],
  },
  {
    id: '3',
    code: '3000',
    name: 'Equity',
    type: 'EQUITY',
    balance: 317000,
    isActive: true,
    children: [
      { id: '3a', code: '3100', name: 'Common Stock', type: 'EQUITY', balance: 200000, isActive: true },
      { id: '3b', code: '3200', name: 'Retained Earnings', type: 'EQUITY', balance: 117000, isActive: true },
    ],
  },
  {
    id: '4',
    code: '4000',
    name: 'Revenue',
    type: 'REVENUE',
    balance: 766000,
    isActive: true,
    children: [
      { id: '4a', code: '4100', name: 'Sales Revenue', type: 'REVENUE', balance: 720000, isActive: true },
      { id: '4b', code: '4200', name: 'Service Revenue', type: 'REVENUE', balance: 46000, isActive: true },
    ],
  },
  {
    id: '5',
    code: '5000',
    name: 'Expenses',
    type: 'EXPENSE',
    balance: 439000,
    isActive: true,
    children: [
      { id: '5a', code: '5100', name: 'Cost of Goods Sold', type: 'EXPENSE', balance: 310000, isActive: true },
      { id: '5b', code: '5200', name: 'Operating Expenses', type: 'EXPENSE', balance: 89000, isActive: true },
      { id: '5c', code: '5300', name: 'Administrative Expenses', type: 'EXPENSE', balance: 40000, isActive: true },
    ],
  },
];

function AccountRow({ account, depth = 0 }: { account: AccountNode; depth?: number }) {
  const [isOpen, setIsOpen] = useState(depth === 0);
  const hasChildren = account.children && account.children.length > 0;

  return (
    <>
      <tr className="hover:bg-secondary-50/50 transition-colors group">
        <td className="px-4 py-3 text-sm" style={{ paddingLeft: `${16 + depth * 24}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-0.5 rounded hover:bg-secondary-200 transition-colors"
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-secondary-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-secondary-400" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span className="font-mono text-xs text-secondary-500 bg-secondary-100 px-1.5 py-0.5 rounded">
              {account.code}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          <span className={cn('font-medium', depth === 0 ? 'text-secondary-900' : 'text-secondary-700')}>
            {account.name}
          </span>
        </td>
        <td className="px-4 py-3">
          <Badge variant={typeColors[account.type]}>
            {account.type}
          </Badge>
        </td>
        <td className="px-4 py-3 text-sm text-right font-medium text-secondary-900">
          {formatCurrency(account.balance)}
        </td>
        <td className="px-4 py-3">
          <Badge variant={account.isActive ? 'green' : 'gray'} dot>
            {account.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </td>
      </tr>
      {isOpen &&
        hasChildren &&
        account.children!.map((child) => (
          <AccountRow key={child.id} account={child} depth={depth + 1} />
        ))}
    </>
  );
}

export default function ChartOfAccountsPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Chart of Accounts</h1>
          <p className="text-sm text-secondary-500 mt-1">Manage your account structure</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>
          Add Account
        </Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-secondary-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-secondary-50 border-b border-secondary-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider w-48">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider w-32">Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider w-40">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {mockAccounts.map((account) => (
                <AccountRow key={account.id} account={account} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
