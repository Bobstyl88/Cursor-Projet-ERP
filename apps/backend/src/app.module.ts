import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import authConfig from './config/auth.config';
import redisConfig from './config/redis.config';
import { DatabaseModule } from './database/database.module';

import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { SalesModule } from './modules/sales/sales.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { InvoicingModule } from './modules/invoicing/invoicing.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { CurrenciesModule } from './modules/currencies/currencies.module';
import { ReportingModule } from './modules/reporting/reporting.module';

@Module({
  imports: [
    // ── Configuration ─────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, authConfig, redisConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Rate limiting ─────────────────────────────────────────────────
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // ── Event system (intra-process domain events) ────────────────────
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),

    // ── Database ──────────────────────────────────────────────────────
    DatabaseModule,

    // ── Job queues ────────────────────────────────────────────────────
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      }),
    }),

    // ── Domain Modules ────────────────────────────────────────────────
    AuthModule,
    TenantsModule,
    UsersModule,
    SalesModule,
    InventoryModule,
    PurchasesModule,
    InvoicingModule,
    AccountingModule,
    CurrenciesModule,
    ReportingModule,
  ],
})
export class AppModule {}
