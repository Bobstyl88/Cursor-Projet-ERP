import {
  PrismaClient,
  Plan,
  Action,
  AccountType,
  TaxType,
  FiscalYearStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ── Currencies ──
  console.log('💱 Creating currencies...');
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2 },
    { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
    { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2 },
    { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD', decimalPlaces: 2 },
    { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA', decimalPlaces: 0 },
    { code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA', decimalPlaces: 0 },
  ];

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: {},
      create: currency,
    });
  }
  console.log(`  ✓ ${currencies.length} currencies created`);

  // ── Countries ──
  console.log('🌍 Creating countries...');
  const countries = [
    { code: 'US', name: 'United States', currencyCode: 'USD', taxLabel: 'Sales Tax' },
    { code: 'GB', name: 'United Kingdom', currencyCode: 'GBP', taxLabel: 'VAT' },
    { code: 'FR', name: 'France', currencyCode: 'EUR', taxLabel: 'TVA' },
    { code: 'DE', name: 'Germany', currencyCode: 'EUR', taxLabel: 'MwSt' },
    { code: 'MA', name: 'Morocco', currencyCode: 'MAD', taxLabel: 'TVA' },
    { code: 'SN', name: 'Senegal', currencyCode: 'XOF', taxLabel: 'TVA' },
    { code: 'CI', name: "Côte d'Ivoire", currencyCode: 'XOF', taxLabel: 'TVA' },
    { code: 'CM', name: 'Cameroon', currencyCode: 'XAF', taxLabel: 'TVA' },
    { code: 'GA', name: 'Gabon', currencyCode: 'XAF', taxLabel: 'TVA' },
    { code: 'ES', name: 'Spain', currencyCode: 'EUR', taxLabel: 'IVA' },
  ];

  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: {},
      create: country,
    });
  }
  console.log(`  ✓ ${countries.length} countries created`);

  // ── Demo Tenant ──
  console.log('🏢 Creating demo tenant...');
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo-company',
      plan: Plan.PROFESSIONAL,
      settings: {
        defaultCurrency: 'USD',
        defaultLanguage: 'en',
        dateFormat: 'YYYY-MM-DD',
        timezone: 'UTC',
        fiscalYearStart: '01-01',
        invoicePrefix: 'INV',
        quotationPrefix: 'QUO',
        saleOrderPrefix: 'SO',
        purchaseOrderPrefix: 'PO',
      },
      isActive: true,
    },
  });
  console.log(`  ✓ Tenant "${tenant.name}" created (ID: ${tenant.id})`);

  // ── Permissions ──
  console.log('🔐 Creating permissions...');
  const resources = [
    'tenant',
    'user',
    'role',
    'contact',
    'product',
    'warehouse',
    'stock',
    'quotation',
    'sale_order',
    'purchase_order',
    'invoice',
    'payment',
    'journal_entry',
    'fiscal_year',
    'account',
    'tax_rate',
    'report',
    'settings',
  ];

  const actions: Action[] = [
    Action.CREATE,
    Action.READ,
    Action.UPDATE,
    Action.DELETE,
    Action.EXPORT,
    Action.APPROVE,
  ];

  const permissionMap: Record<string, string> = {};

  for (const resource of resources) {
    for (const action of actions) {
      const permission = await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: { resource, action },
      });
      permissionMap[`${resource}:${action}`] = permission.id;
    }
  }
  console.log(`  ✓ ${Object.keys(permissionMap).length} permissions created`);

  // ── Roles ──
  console.log('👥 Creating roles...');

  const roleDefinitions = [
    {
      name: 'Admin',
      description: 'Full system access with all permissions',
      isSystem: true,
      permissions: resources.flatMap((r) => actions.map((a) => `${r}:${a}`)),
    },
    {
      name: 'Manager',
      description: 'Management access with approval rights',
      isSystem: true,
      permissions: resources.flatMap((r) =>
        [Action.CREATE, Action.READ, Action.UPDATE, Action.EXPORT, Action.APPROVE].map(
          (a) => `${r}:${a}`,
        ),
      ),
    },
    {
      name: 'Accountant',
      description: 'Accounting and financial operations access',
      isSystem: true,
      permissions: [
        ...['invoice', 'payment', 'journal_entry', 'fiscal_year', 'account', 'tax_rate', 'report'].flatMap(
          (r) => actions.map((a) => `${r}:${a}`),
        ),
        ...['contact', 'product', 'sale_order', 'purchase_order', 'quotation'].flatMap((r) =>
          [Action.READ, Action.EXPORT].map((a) => `${r}:${a}`),
        ),
      ],
    },
    {
      name: 'Salesperson',
      description: 'Sales operations access',
      isSystem: true,
      permissions: [
        ...['quotation', 'sale_order', 'contact'].flatMap((r) =>
          [Action.CREATE, Action.READ, Action.UPDATE, Action.EXPORT].map((a) => `${r}:${a}`),
        ),
        ...['product', 'invoice', 'stock'].flatMap((r) =>
          [Action.READ, Action.EXPORT].map((a) => `${r}:${a}`),
        ),
      ],
    },
    {
      name: 'Warehouse Manager',
      description: 'Inventory and warehouse operations access',
      isSystem: true,
      permissions: [
        ...['warehouse', 'stock', 'product'].flatMap((r) =>
          actions.map((a) => `${r}:${a}`),
        ),
        ...['sale_order', 'purchase_order', 'contact'].flatMap((r) =>
          [Action.READ, Action.EXPORT].map((a) => `${r}:${a}`),
        ),
      ],
    },
  ];

  const roleIds: Record<string, string> = {};

  for (const roleDef of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: roleDef.name } },
      update: { description: roleDef.description },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        tenantId: tenant.id,
      },
    });
    roleIds[roleDef.name] = role.id;

    const validPermissions = roleDef.permissions.filter((p) => permissionMap[p]);
    for (const perm of validPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permissionMap[perm],
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permissionMap[perm],
        },
      });
    }

    console.log(`  ✓ Role "${roleDef.name}" with ${validPermissions.length} permissions`);
  }

  // ── Demo Admin User ──
  console.log('👤 Creating demo admin user...');
  const passwordHash = await bcrypt.hash('Demo@2024', 12);

  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890',
      isActive: true,
      emailVerified: true,
      tenantId: tenant.id,
      roleId: roleIds['Admin'],
    },
  });
  console.log('  ✓ Admin user created (admin@demo.com / Demo@2024)');

  // ── Chart of Accounts ──
  console.log('📊 Creating chart of accounts...');

  const accountCategories = [
    // Assets (1xxx)
    { code: '1000', name: 'Assets', type: AccountType.ASSET, isSystem: true, children: [
      { code: '1100', name: 'Current Assets', type: AccountType.ASSET, children: [
        { code: '1110', name: 'Cash and Cash Equivalents', type: AccountType.ASSET },
        { code: '1120', name: 'Bank Accounts', type: AccountType.ASSET },
        { code: '1130', name: 'Accounts Receivable', type: AccountType.ASSET },
        { code: '1140', name: 'Inventory', type: AccountType.ASSET },
        { code: '1150', name: 'Prepaid Expenses', type: AccountType.ASSET },
      ]},
      { code: '1200', name: 'Non-Current Assets', type: AccountType.ASSET, children: [
        { code: '1210', name: 'Property, Plant & Equipment', type: AccountType.ASSET },
        { code: '1220', name: 'Accumulated Depreciation', type: AccountType.ASSET },
        { code: '1230', name: 'Intangible Assets', type: AccountType.ASSET },
      ]},
    ]},
    // Liabilities (2xxx)
    { code: '2000', name: 'Liabilities', type: AccountType.LIABILITY, isSystem: true, children: [
      { code: '2100', name: 'Current Liabilities', type: AccountType.LIABILITY, children: [
        { code: '2110', name: 'Accounts Payable', type: AccountType.LIABILITY },
        { code: '2120', name: 'Accrued Expenses', type: AccountType.LIABILITY },
        { code: '2130', name: 'Tax Payable', type: AccountType.LIABILITY },
        { code: '2140', name: 'Short-term Loans', type: AccountType.LIABILITY },
      ]},
      { code: '2200', name: 'Non-Current Liabilities', type: AccountType.LIABILITY, children: [
        { code: '2210', name: 'Long-term Loans', type: AccountType.LIABILITY },
        { code: '2220', name: 'Deferred Revenue', type: AccountType.LIABILITY },
      ]},
    ]},
    // Equity (3xxx)
    { code: '3000', name: 'Equity', type: AccountType.EQUITY, isSystem: true, children: [
      { code: '3100', name: 'Share Capital', type: AccountType.EQUITY },
      { code: '3200', name: 'Retained Earnings', type: AccountType.EQUITY },
      { code: '3300', name: 'Current Year Earnings', type: AccountType.EQUITY },
    ]},
    // Revenue (4xxx)
    { code: '4000', name: 'Revenue', type: AccountType.REVENUE, isSystem: true, children: [
      { code: '4100', name: 'Sales Revenue', type: AccountType.REVENUE },
      { code: '4200', name: 'Service Revenue', type: AccountType.REVENUE },
      { code: '4300', name: 'Other Income', type: AccountType.REVENUE },
      { code: '4400', name: 'Interest Income', type: AccountType.REVENUE },
    ]},
    // Expenses (5xxx)
    { code: '5000', name: 'Expenses', type: AccountType.EXPENSE, isSystem: true, children: [
      { code: '5100', name: 'Cost of Goods Sold', type: AccountType.EXPENSE },
      { code: '5200', name: 'Salaries & Wages', type: AccountType.EXPENSE },
      { code: '5300', name: 'Rent & Utilities', type: AccountType.EXPENSE },
      { code: '5400', name: 'Marketing & Advertising', type: AccountType.EXPENSE },
      { code: '5500', name: 'Office Supplies', type: AccountType.EXPENSE },
      { code: '5600', name: 'Depreciation Expense', type: AccountType.EXPENSE },
      { code: '5700', name: 'Insurance', type: AccountType.EXPENSE },
      { code: '5800', name: 'Professional Services', type: AccountType.EXPENSE },
      { code: '5900', name: 'Other Expenses', type: AccountType.EXPENSE },
    ]},
  ];

  type AccountDef = {
    code: string;
    name: string;
    type: AccountType;
    isSystem?: boolean;
    children?: AccountDef[];
  };

  async function createAccounts(accounts: AccountDef[], parentId: string | null = null): Promise<void> {
    for (const acct of accounts) {
      const account = await prisma.accountCategory.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: acct.code } },
        update: {},
        create: {
          code: acct.code,
          name: acct.name,
          type: acct.type,
          isSystem: acct.isSystem || false,
          tenantId: tenant.id,
          parentId,
        },
      });

      if (acct.children) {
        await createAccounts(acct.children, account.id);
      }
    }
  }

  await createAccounts(accountCategories);
  console.log('  ✓ Chart of accounts created');

  // ── Tax Rates ──
  console.log('📋 Creating tax rates...');
  const taxRates = [
    { code: 'VAT20', name: 'VAT 20%', rate: 20, type: TaxType.VAT, country: 'GB', isDefault: true },
    { code: 'VAT10', name: 'VAT 10%', rate: 10, type: TaxType.VAT, country: 'GB', isDefault: false },
    { code: 'VAT0', name: 'VAT 0% (Exempt)', rate: 0, type: TaxType.VAT, country: 'GB', isDefault: false },
  ];

  for (const tax of taxRates) {
    await prisma.taxRate.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: tax.code } },
      update: {},
      create: {
        ...tax,
        tenantId: tenant.id,
      },
    });
  }
  console.log(`  ✓ ${taxRates.length} tax rates created`);

  // ── Default Warehouse ──
  console.log('🏭 Creating default warehouse...');
  await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'WH-MAIN' } },
    update: {},
    create: {
      code: 'WH-MAIN',
      name: 'Main Warehouse',
      address: {
        street: '123 Industrial Blvd',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
      },
      isDefault: true,
      isActive: true,
      tenantId: tenant.id,
    },
  });
  console.log('  ✓ Default warehouse created');

  // ── Fiscal Year ──
  console.log('📅 Creating fiscal year...');
  await prisma.fiscalYear.upsert({
    where: { id: `fy-2024-${tenant.id}` },
    update: {},
    create: {
      id: `fy-2024-${tenant.id}`,
      name: 'Fiscal Year 2024',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      status: FiscalYearStatus.OPEN,
      tenantId: tenant.id,
    },
  });
  console.log('  ✓ Fiscal Year 2024 created');

  // ── Sequences ──
  console.log('🔢 Creating sequences...');
  const sequences = [
    { prefix: 'INV', currentValue: 0, padding: 5 },
    { prefix: 'QUO', currentValue: 0, padding: 5 },
    { prefix: 'SO', currentValue: 0, padding: 5 },
    { prefix: 'PO', currentValue: 0, padding: 5 },
    { prefix: 'PAY', currentValue: 0, padding: 5 },
    { prefix: 'JE', currentValue: 0, padding: 5 },
  ];

  for (const seq of sequences) {
    await prisma.sequence.upsert({
      where: { tenantId_prefix: { tenantId: tenant.id, prefix: seq.prefix } },
      update: {},
      create: {
        ...seq,
        tenantId: tenant.id,
      },
    });
  }
  console.log(`  ✓ ${sequences.length} sequences created`);

  console.log('\n✅ Database seeded successfully!\n');
  console.log('Demo credentials:');
  console.log('  Email:    admin@demo.com');
  console.log('  Password: Demo@2024');
  console.log(`  Tenant:   ${tenant.name} (${tenant.slug})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('\n❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
