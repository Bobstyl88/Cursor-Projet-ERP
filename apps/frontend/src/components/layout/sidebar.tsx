'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Package,
  Warehouse,
  Receipt,
  BookOpen,
  BarChart3,
  Settings,
  Users,
  DollarSign,
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Sales',
    items: [
      { name: 'Quotations', href: '/sales/quotations', icon: FileText },
      { name: 'Orders', href: '/sales/orders', icon: ShoppingCart },
      { name: 'Customers', href: '/sales/customers', icon: Users },
    ],
  },
  {
    name: 'Purchasing',
    items: [
      { name: 'Purchase Orders', href: '/purchasing/orders', icon: ShoppingCart },
      { name: 'Suppliers', href: '/purchasing/suppliers', icon: Users },
    ],
  },
  {
    name: 'Inventory',
    items: [
      { name: 'Products', href: '/inventory/products', icon: Package },
      { name: 'Warehouses', href: '/inventory/warehouses', icon: Warehouse },
    ],
  },
  {
    name: 'Finance',
    items: [
      { name: 'Invoices', href: '/invoicing/list', icon: Receipt },
      { name: 'Accounting', href: '/accounting/journal', icon: BookOpen },
      { name: 'Currencies', href: '/accounting/currencies', icon: DollarSign },
    ],
  },
  {
    name: 'Reports',
    href: '/reporting',
    icon: BarChart3,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <span className="text-lg font-bold text-gray-900">ERP SaaS</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navigation.map((item) => {
          if ('items' in item) {
            return (
              <div key={item.name} className="pt-4 first:pt-0">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  {item.name}
                </p>
                <div className="space-y-0.5">
                  {item.items.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        pathname === subItem.href
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                      )}
                    >
                      <subItem.icon className="h-4 w-4 shrink-0" />
                      {subItem.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
