import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('Reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'reporting', version: '1' })
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('dashboard')
  @RequirePermissions('reporting:read')
  dashboard(@TenantId() tenantId: string, @Query('year') year?: number) {
    return this.reportingService.getDashboardKpis(tenantId, year ? Number(year) : undefined);
  }

  @Get('revenue-by-month')
  @RequirePermissions('reporting:read')
  revenueByMonth(@TenantId() tenantId: string, @Query('year') year?: number) {
    return this.reportingService.getRevenueByMonth(tenantId, year ? Number(year) : undefined);
  }

  @Get('ar-aging')
  @RequirePermissions('reporting:read')
  arAging(@TenantId() tenantId: string) {
    return this.reportingService.getAccountsReceivableAging(tenantId);
  }

  @Get('income-statement')
  @RequirePermissions('reporting:read')
  incomeStatement(@TenantId() tenantId: string, @Query('year') year?: number) {
    return this.reportingService.getIncomeStatement(tenantId, year ? Number(year) : undefined);
  }
}
