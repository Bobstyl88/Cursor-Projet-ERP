export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Tenant ───────────────────────────────────────────────────────────────────
export interface Tenant {
  _id: string;
  slug: string;
  name: string;
  domain: string;
  status: 'active' | 'suspended' | 'trial';
  plan: 'starter' | 'professional' | 'enterprise';
  defaultCurrency: string;
  defaultLocale: string;
  timezone: string;
}

// ── User ──────────────────────────────────────────────────────────────────────
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  locale: string;
}

// ── Customer ──────────────────────────────────────────────────────────────────
export interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  currency: string;
  paymentTermDays: number;
  isActive: boolean;
}

// ── Quote ─────────────────────────────────────────────────────────────────────
export interface QuoteLine {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface Quote {
  _id: string;
  number: string;
  customerId: Customer | string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'converted';
  currency: string;
  issueDate: string;
  expiryDate: string;
  lines: QuoteLine[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  notes?: string;
  createdAt: string;
}

// ── Sale Order ────────────────────────────────────────────────────────────────
export interface SaleOrder {
  _id: string;
  number: string;
  customerId: Customer | string;
  status: 'draft' | 'confirmed' | 'in_delivery' | 'delivered' | 'invoiced' | 'cancelled';
  currency: string;
  orderDate: string;
  grandTotal: number;
  createdAt: string;
}

// ── Invoice ───────────────────────────────────────────────────────────────────
export interface Invoice {
  _id: string;
  number: string;
  type: 'sale' | 'purchase' | 'credit_note';
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  partyId: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  createdAt: string;
}

// ── Dashboard KPIs ────────────────────────────────────────────────────────────
export interface DashboardKpis {
  totalRevenue: number;
  totalOutstanding: number;
  totalPurchases: number;
  lowStockProducts: number;
  openQuotes: number;
  openInvoices: number;
}

// ── Revenue by month ──────────────────────────────────────────────────────────
export interface RevenueByMonth {
  _id: { month: number };
  revenue: number;
  count: number;
}
