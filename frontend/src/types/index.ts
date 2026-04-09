export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  tenantId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  settings?: Record<string, unknown>;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  companyName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  type: 'GOODS' | 'SERVICE';
  category?: string;
  unitPrice: number;
  costPrice: number;
  unit: string;
  taxRate?: number;
  isActive: boolean;
  trackInventory: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationLine {
  id?: string;
  productId: string;
  product?: Product;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  subtotal: number;
}

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED' | 'EXPIRED';

export interface Quotation {
  id: string;
  number: string;
  customerId: string;
  customer?: Customer;
  date: string;
  validUntil: string;
  status: QuotationStatus;
  lines: QuotationLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  currencyCode: string;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
}

export type SaleOrderStatus = 'DRAFT' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface SaleOrder {
  id: string;
  number: string;
  customerId: string;
  customer?: Customer;
  quotationId?: string;
  date: string;
  status: SaleOrderStatus;
  lines: QuotationLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  currencyCode: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED';

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  supplier?: Supplier;
  date: string;
  expectedDate?: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  currencyCode: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderLine {
  id?: string;
  productId: string;
  product?: Product;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
}

export type InvoiceType = 'SALES' | 'PURCHASE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'VOID';

export interface Invoice {
  id: string;
  number: string;
  type: InvoiceType;
  customerId?: string;
  customer?: Customer;
  supplierId?: string;
  supplier?: Supplier;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currencyCode: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLine {
  id?: string;
  productId?: string;
  product?: Product;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
}

export type PaymentMethod = 'BANK_TRANSFER' | 'CASH' | 'CHECK' | 'CREDIT_CARD' | 'OTHER';

export interface Payment {
  id: string;
  number: string;
  invoiceId: string;
  invoice?: Invoice;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
  parent?: Account;
  children?: Account[];
  description?: string;
  isActive: boolean;
  balance: number;
  createdAt: string;
}

export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface JournalEntry {
  id: string;
  number: string;
  date: string;
  description: string;
  status: JournalEntryStatus;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  createdAt: string;
}

export interface JournalEntryLine {
  id?: string;
  accountId: string;
  account?: Account;
  description?: string;
  debit: number;
  credit: number;
}

export interface FiscalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export interface StockLevel {
  id: string;
  productId: string;
  product?: Product;
  warehouseId: string;
  warehouse?: Warehouse;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  updatedAt: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isDefault: boolean;
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  isActive: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  revenueChange: number;
  outstandingInvoices: number;
  outstandingChange: number;
  totalOrders: number;
  ordersChange: number;
  stockValue: number;
  stockChange: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  expenses: number;
}
