import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('admin12345', 12);

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Company',
      slug: 'demo',
      plan: 'PROFESSIONAL',
    },
  });

  const adminRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'Admin',
      description: 'Full system access',
      permissions: JSON.stringify(['*']),
      isSystem: true,
    },
  });

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@demo.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      userRoles: { create: { roleId: adminRole.id } },
    },
  });

  const accounts = [
    { code: '1000', name: 'Cash', type: 'ASSET' as const },
    { code: '1100', name: 'Bank Account', type: 'ASSET' as const },
    { code: '1200', name: 'Accounts Receivable', type: 'ASSET' as const },
    { code: '1300', name: 'Inventory', type: 'ASSET' as const },
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' as const },
    { code: '2100', name: 'Tax Payable', type: 'LIABILITY' as const },
    { code: '3000', name: 'Owner Equity', type: 'EQUITY' as const },
    { code: '3100', name: 'Retained Earnings', type: 'EQUITY' as const },
    { code: '4000', name: 'Sales Revenue', type: 'REVENUE' as const },
    { code: '4100', name: 'Service Revenue', type: 'REVENUE' as const },
    { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' as const },
    { code: '5100', name: 'Purchase Expenses', type: 'EXPENSE' as const },
    { code: '6000', name: 'Operating Expenses', type: 'EXPENSE' as const },
  ];

  for (const account of accounts) {
    await prisma.chartOfAccount.create({ data: { tenantId: tenant.id, ...account } });
  }

  await prisma.tenantCurrency.createMany({
    data: [
      { tenantId: tenant.id, code: 'EUR', name: 'Euro', symbol: '€', isBase: true },
      { tenantId: tenant.id, code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 1.08 },
      { tenantId: tenant.id, code: 'GBP', name: 'British Pound', symbol: '£', exchangeRate: 0.86 },
    ],
  });

  await prisma.taxRule.createMany({
    data: [
      { tenantId: tenant.id, name: 'TVA 20%', rate: 20, countryCode: 'FR', type: 'VAT', isDefault: true },
      { tenantId: tenant.id, name: 'TVA 10%', rate: 10, countryCode: 'FR', type: 'VAT' },
      { tenantId: tenant.id, name: 'TVA 5.5%', rate: 5.5, countryCode: 'FR', type: 'VAT' },
      { tenantId: tenant.id, name: 'VAT 0%', rate: 0, countryCode: 'FR', type: 'EXEMPT' },
    ],
  });

  const warehouse = await prisma.warehouse.create({
    data: {
      tenantId: tenant.id,
      name: 'Main Warehouse',
      code: 'WH-MAIN',
      isDefault: true,
    },
  });

  const customer = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      type: 'CUSTOMER',
      companyName: 'Client Example SA',
      email: 'contact@client-example.com',
      countryCode: 'FR',
      currencyCode: 'EUR',
    },
  });

  const supplier = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      type: 'SUPPLIER',
      companyName: 'Supplier Example SARL',
      email: 'info@supplier-example.com',
      countryCode: 'FR',
      currencyCode: 'EUR',
    },
  });

  const products = await Promise.all([
    prisma.product.create({
      data: {
        tenantId: tenant.id,
        sku: 'PROD-001',
        name: 'Product Alpha',
        description: 'High-quality product',
        type: 'STORABLE',
        unitPrice: 99.99,
        costPrice: 45.00,
        unit: 'unit',
      },
    }),
    prisma.product.create({
      data: {
        tenantId: tenant.id,
        sku: 'PROD-002',
        name: 'Product Beta',
        description: 'Premium product',
        type: 'STORABLE',
        unitPrice: 249.99,
        costPrice: 120.00,
        unit: 'unit',
      },
    }),
    prisma.product.create({
      data: {
        tenantId: tenant.id,
        sku: 'SVC-001',
        name: 'Consulting Service',
        description: 'Hourly consulting service',
        type: 'SERVICE',
        unitPrice: 150.00,
        costPrice: 0,
        unit: 'hour',
      },
    }),
  ]);

  await prisma.sequence.createMany({
    data: [
      { tenantId: tenant.id, type: 'quotation', prefix: 'QUO-', current: 0 },
      { tenantId: tenant.id, type: 'sales_order', prefix: 'SO-', current: 0 },
      { tenantId: tenant.id, type: 'purchase_order', prefix: 'PO-', current: 0 },
      { tenantId: tenant.id, type: 'invoice_sales', prefix: 'INV-', current: 0 },
      { tenantId: tenant.id, type: 'invoice_purchase', prefix: 'BILL-', current: 0 },
      { tenantId: tenant.id, type: 'journal_entry', prefix: 'JE-', current: 0 },
    ],
  });

  console.log('Seed completed!');
  console.log('Login credentials:');
  console.log('  Tenant slug: demo');
  console.log('  Email: admin@demo.com');
  console.log('  Password: admin12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
