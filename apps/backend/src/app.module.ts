import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './core/auth/auth.module';
import { TenantModule } from './core/tenant/tenant.module';
import { UserModule } from './core/user/user.module';
import { RoleModule } from './core/role/role.module';
import { AuditModule } from './core/audit/audit.module';

import { ContactModule } from './modules/sales/contact.module';
import { ProductModule } from './modules/inventory/product.module';
import { WarehouseModule } from './modules/inventory/warehouse.module';
import { QuotationModule } from './modules/sales/quotation.module';
import { SalesOrderModule } from './modules/sales/sales-order.module';
import { PurchaseOrderModule } from './modules/purchasing/purchase-order.module';
import { InvoiceModule } from './modules/invoicing/invoice.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { TaxModule } from './modules/tax/tax.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { ReportingModule } from './modules/reporting/reporting.module';

import { JwtAuthGuard } from './core/auth/guards/jwt-auth.guard';
import { TenantGuard } from './core/tenant/guards/tenant.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,

    // Core
    AuthModule,
    TenantModule,
    UserModule,
    RoleModule,
    AuditModule,

    // Business Modules
    ContactModule,
    ProductModule,
    WarehouseModule,
    QuotationModule,
    SalesOrderModule,
    PurchaseOrderModule,
    InvoiceModule,
    AccountingModule,
    TaxModule,
    CurrencyModule,
    ReportingModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
  ],
})
export class AppModule {}
