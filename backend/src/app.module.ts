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

const featureModules: any[] = [];

try {
  /* Feature modules are registered here as they are built out.
     Each module is self-contained and declares its own controllers,
     services, and providers. Stub imports keep the app bootable
     before the modules exist on disk. */
}
catch { /* ignored */ }

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

    ...featureModules,
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
