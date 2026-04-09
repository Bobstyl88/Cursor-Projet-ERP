import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';

import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),

    ScheduleModule.forRoot(),

    DatabaseModule,

    AuthModule,
    TenantModule,
    UserModule,
    RoleModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: 'APP_INTERCEPTOR',
      useClass: AuditInterceptor,
    },
    {
      provide: 'APP_INTERCEPTOR',
      useClass: TenantContextInterceptor,
    },
  ],
})
export class AppModule {}
