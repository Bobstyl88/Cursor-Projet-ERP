import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentTenant } from '@/common/decorators';
import { ReportingService } from './reporting.service';
import { ReportQueryDto } from './dto';

@ApiTags('Reporting')
@ApiBearerAuth()
@Controller('reports')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get main dashboard KPIs' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  getDashboard(@CurrentTenant() tenantId: string) {
    return this.reportingService.getDashboard(tenantId);
  }

  @Get('sales')
  @ApiOperation({ summary: 'Sales report (by period, product, customer)' })
  @ApiResponse({ status: 200, description: 'Sales report data' })
  getSalesReport(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportingService.getSalesReport(tenantId, query);
  }

  @Get('purchases')
  @ApiOperation({ summary: 'Purchase report' })
  @ApiResponse({ status: 200, description: 'Purchase report data' })
  getPurchasesReport(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportingService.getPurchasesReport(tenantId, query);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Inventory report (stock valuation, movement summary)' })
  @ApiResponse({ status: 200, description: 'Inventory report data' })
  getInventoryReport(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportingService.getInventoryReport(tenantId, query);
  }

  @Get('receivables')
  @ApiOperation({ summary: 'Accounts receivable aging report' })
  @ApiResponse({ status: 200, description: 'Receivables aging data' })
  getReceivablesAging(@CurrentTenant() tenantId: string) {
    return this.reportingService.getReceivablesAging(tenantId);
  }

  @Get('payables')
  @ApiOperation({ summary: 'Accounts payable aging report' })
  @ApiResponse({ status: 200, description: 'Payables aging data' })
  getPayablesAging(@CurrentTenant() tenantId: string) {
    return this.reportingService.getPayablesAging(tenantId);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue by period report' })
  @ApiResponse({ status: 200, description: 'Revenue by period data' })
  getRevenueByPeriod(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportingService.getRevenueByPeriod(tenantId, query);
  }
}
