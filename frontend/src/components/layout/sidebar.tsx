'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Package,
  Warehouse,
  Receipt,
  CreditCard,
  Calculator,
  BookOpen,
  Calendar,
  BarChart3,
  Settings,
  Users,
  Shield,
  DollarSign,
  Percent,
  ChevronDown,
  Boxes,
  ClipboardList,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: { label: string; href: string }[];
}

const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Sales',
    icon: ShoppingCart,
    children: [
      { label: 'Quotations', href: '/sales/quotations' },
      { label: 'Sale Orders', href: '/sales/orders' },
    ],
  },
  {
    label: 'Purchasing',
    icon: Package,
    children: [
      { label: 'Purchase Orders', href: '/purchasing/orders' },
    ],
  },
  {
    label: 'Inventory',
    icon: Warehouse,
    children: [
      { label: 'Products', href: '/inventory/products' },
      { label: 'Warehouses', href: '/inventory/warehouses' },
      { label: 'Stock Levels', href: '/inventory/stock' },
    ],
  },
  {
    label: 'Invoicing',
    icon: Receipt,
    children: [
      { label: 'Invoices', href: '/invoicing/invoices' },
      { label: 'Payments', href: '/invoicing/payments' },
    ],
  },
  {
    label: 'Accounting',
    icon: Calculator,
    children: [
      { label: 'Chart of Accounts', href: '/accounting/chart-of-accounts' },
      { label: 'Journal Entries', href: '/accounting/journal-entries' },
      { label: 'Fiscal Years', href: '/accounting/fiscal-years' },
    ],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    children: [
      { label: 'Dashboard', href: '/reports' },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    children: [
      { label: 'Users', href: '/settings/users' },
      { label: 'Roles', href: '/settings/roles' },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    const active = navigation.find(
      (item) =>
        item.children?.some((child) => pathname.startsWith(child.href))
    );
    return active ? [active.label] : [];
  });

  const toggleSection = (label: string) => {
    setExpandedSections((prev) =>
      prev.includes(label)
        ? prev.filter((s) => s !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-secondary-200/60 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-600 text-white font-bold text-sm">
          E
        </div>
        {!isCollapsed && (
          <span className="text-lg font-bold text-secondary-900 tracking-tight">
            ERP Suite
          </span>
        )}
        <button
          onClick={onClose}
          className="ml-auto p-1 rounded-md text-secondary-400 hover:text-secondary-600 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navigation.map((item) => {
          if (item.href) {
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900'
                )}
              >
                <item.icon className={cn('h-5 w-5 shrink-0', active ? 'text-primary-600' : 'text-secondary-400')} />
                {!isCollapsed && item.label}
              </Link>
            );
          }

          const isExpanded = expandedSections.includes(item.label);
          const hasActiveChild = item.children?.some((child) => isActive(child.href));

          return (
            <div key={item.label}>
              <button
                onClick={() => toggleSection(item.label)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  hasActiveChild
                    ? 'text-primary-700'
                    : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900'
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 shrink-0',
                    hasActiveChild ? 'text-primary-600' : 'text-secondary-400'
                  )}
                />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-secondary-400 transition-transform duration-200',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </>
                )}
              </button>
              {!isCollapsed && isExpanded && item.children && (
                <div className="mt-1 ml-5 pl-4 border-l border-secondary-200 space-y-0.5">
                  {item.children.map((child) => {
                    const active = isActive(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={cn(
                          'block px-3 py-2 rounded-md text-sm transition-colors duration-150',
                          active
                            ? 'text-primary-700 font-medium bg-primary-50'
                            : 'text-secondary-500 hover:text-secondary-900 hover:bg-secondary-50'
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-secondary-200 transform transition-transform duration-300 lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-secondary-200 transition-all duration-300',
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export { Sidebar };
