'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FileText, ShoppingCart, Package, Truck, Receipt,
  BookOpen, TrendingUp, Settings, Users, ChevronDown, ChevronRight, DollarSign,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string }[];
}

const navigation: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Commercial',
    icon: FileText,
    children: [
      { label: 'Devis', href: '/sales/quotes' },
      { label: 'Commandes', href: '/sales/orders' },
      { label: 'Clients', href: '/sales/customers' },
    ],
  },
  {
    label: 'Stock',
    icon: Package,
    children: [
      { label: 'Produits', href: '/inventory/products' },
      { label: 'Dépôts', href: '/inventory/warehouses' },
      { label: 'Mouvements', href: '/inventory/movements' },
    ],
  },
  {
    label: 'Achats',
    icon: Truck,
    children: [
      { label: 'Commandes', href: '/purchases/orders' },
      { label: 'Fournisseurs', href: '/purchases/suppliers' },
    ],
  },
  {
    label: 'Facturation',
    icon: Receipt,
    children: [
      { label: 'Factures', href: '/invoicing/invoices' },
      { label: 'Règles TVA', href: '/invoicing/tax-rules' },
    ],
  },
  {
    label: 'Comptabilité',
    icon: BookOpen,
    children: [
      { label: 'Journal', href: '/accounting/journal' },
      { label: 'Plan comptable', href: '/accounting/accounts' },
      { label: 'Balance', href: '/accounting/trial-balance' },
    ],
  },
  { label: 'Devises', href: '/currencies', icon: DollarSign },
  { label: 'Reporting', href: '/reporting', icon: TrendingUp },
  { label: 'Utilisateurs', href: '/users', icon: Users },
  { label: 'Paramètres', href: '/settings', icon: Settings },
];

interface SidebarProps { isOpen: boolean; onClose: () => void; }

export function Sidebar({ isOpen }: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>(['Commercial']);

  const toggleExpand = (label: string) =>
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );

  return (
    <aside
      className={cn(
        'flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 overflow-hidden',
        !isOpen && 'w-0',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-700">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          E
        </div>
        <span className="font-bold text-gray-900 dark:text-white text-lg">SaaS ERP</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {navigation.map((item) => (
            <li key={item.label}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700',
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => toggleExpand(item.label)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {expanded.includes(item.label) ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                  {expanded.includes(item.label) && item.children && (
                    <ul className="mt-0.5 ml-7 space-y-0.5">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={cn(
                              'flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors',
                              pathname === child.href
                                ? 'text-brand-700 font-medium dark:text-brand-300'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                            )}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
