import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('reporting')
@ApiBearerAuth()
@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('dashboard')
  @RequirePermissions('reporting:read', '*')
  @ApiOperation({ summary: 'Get dashboard KPIs' })
  getDashboard(@TenantId() tenantId: string) {
    return this.reportingService.getDashboard(tenantId);
  }

  @Get('sales')
  @RequirePermissions('reporting:read', 'sales:read', '*')
  @ApiOperation({ summary: 'Sales report' })
  getSalesReport(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingService.getSalesReport(tenantId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
