export const PERMISSIONS = {
  WILDCARD: '*',

  SALES_READ: 'sales:read',
  SALES_WRITE: 'sales:write',
  CONTACTS_READ: 'contacts:read',
  CONTACTS_WRITE: 'contacts:write',
  PRODUCTS_READ: 'products:read',
  PRODUCTS_WRITE: 'products:write',
  INVENTORY_READ: 'inventory:read',
  INVENTORY_WRITE: 'inventory:write',
  PURCHASING_READ: 'purchasing:read',
  PURCHASING_WRITE: 'purchasing:write',
  INVOICES_READ: 'invoices:read',
  INVOICES_WRITE: 'invoices:write',
  ACCOUNTING_READ: 'accounting:read',
  ACCOUNTING_WRITE: 'accounting:write',
  REPORTING_READ: 'reporting:read',
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  AUDIT_READ: 'audit:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const DEFAULT_ROLES = {
  ADMIN: {
    name: 'Admin',
    permissions: [PERMISSIONS.WILDCARD],
  },
  SALES_MANAGER: {
    name: 'Sales Manager',
    permissions: [
      PERMISSIONS.SALES_READ,
      PERMISSIONS.SALES_WRITE,
      PERMISSIONS.CONTACTS_READ,
      PERMISSIONS.CONTACTS_WRITE,
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.INVOICES_READ,
      PERMISSIONS.INVOICES_WRITE,
    ],
  },
  ACCOUNTANT: {
    name: 'Accountant',
    permissions: [
      PERMISSIONS.ACCOUNTING_READ,
      PERMISSIONS.ACCOUNTING_WRITE,
      PERMISSIONS.INVOICES_READ,
      PERMISSIONS.INVOICES_WRITE,
      PERMISSIONS.REPORTING_READ,
    ],
  },
  WAREHOUSE_MANAGER: {
    name: 'Warehouse Manager',
    permissions: [
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_WRITE,
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.PRODUCTS_WRITE,
      PERMISSIONS.PURCHASING_READ,
    ],
  },
  VIEWER: {
    name: 'Viewer',
    permissions: [
      PERMISSIONS.SALES_READ,
      PERMISSIONS.CONTACTS_READ,
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVOICES_READ,
      PERMISSIONS.ACCOUNTING_READ,
      PERMISSIONS.REPORTING_READ,
    ],
  },
} as const;
