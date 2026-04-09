'use client';

import React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Package,
  Receipt,
  Calculator,
  FileText,
  PieChart,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

interface ReportCategory {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  reports: { name: string; href: string }[];
}

const reportCategories: ReportCategory[] = [
  {
    title: 'Sales Reports',
    description: 'Analyze sales performance and trends',
    icon: TrendingUp,
    color: 'text-primary-600 bg-primary-50',
    reports: [
      { name: 'Sales Summary', href: '/reports' },
      { name: 'Sales by Customer', href: '/reports' },
      { name: 'Sales by Product', href: '/reports' },
      { name: 'Quotation Analysis', href: '/reports' },
    ],
  },
  {
    title: 'Purchase Reports',
    description: 'Track purchasing and procurement data',
    icon: ShoppingCart,
    color: 'text-purple-600 bg-purple-50',
    reports: [
      { name: 'Purchase Summary', href: '/reports' },
      { name: 'Purchase by Supplier', href: '/reports' },
      { name: 'Purchase by Product', href: '/reports' },
    ],
  },
  {
    title: 'Inventory Reports',
    description: 'Monitor stock levels and movements',
    icon: Package,
    color: 'text-accent-600 bg-accent-50',
    reports: [
      { name: 'Stock Valuation', href: '/reports' },
      { name: 'Stock Movement', href: '/reports' },
      { name: 'Low Stock Alert', href: '/reports' },
      { name: 'Warehouse Summary', href: '/reports' },
    ],
  },
  {
    title: 'Financial Reports',
    description: 'Financial statements and accounting reports',
    icon: Calculator,
    color: 'text-warning-600 bg-warning-50',
    reports: [
      { name: 'Profit & Loss', href: '/reports' },
      { name: 'Balance Sheet', href: '/reports' },
      { name: 'Cash Flow Statement', href: '/reports' },
      { name: 'Trial Balance', href: '/reports' },
      { name: 'General Ledger', href: '/reports' },
    ],
  },
  {
    title: 'Invoice Reports',
    description: 'Invoice and payment analytics',
    icon: Receipt,
    color: 'text-indigo-600 bg-indigo-50',
    reports: [
      { name: 'Aging Report (AR)', href: '/reports' },
      { name: 'Aging Report (AP)', href: '/reports' },
      { name: 'Payment History', href: '/reports' },
      { name: 'Outstanding Invoices', href: '/reports' },
    ],
  },
  {
    title: 'Tax Reports',
    description: 'Tax summaries and compliance',
    icon: FileText,
    color: 'text-error-600 bg-error-50',
    reports: [
      { name: 'Tax Summary', href: '/reports' },
      { name: 'Tax by Period', href: '/reports' },
    ],
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Reports</h1>
        <p className="text-sm text-secondary-500 mt-1">
          Business intelligence and analytics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCategories.map((category) => (
          <Card key={category.title} className="flex flex-col">
            <div className="flex items-start gap-3 mb-4">
              <div className={cn('p-2.5 rounded-xl', category.color)}>
                <category.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-secondary-900">
                  {category.title}
                </h3>
                <p className="text-sm text-secondary-500 mt-0.5">
                  {category.description}
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-1">
              {category.reports.map((report) => (
                <Link
                  key={report.name}
                  href={report.href}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50 transition-colors group"
                >
                  <span>{report.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-secondary-300 group-hover:text-secondary-500 transition-colors" />
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
