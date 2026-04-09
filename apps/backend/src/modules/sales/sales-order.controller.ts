import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SalesOrderService } from './sales-order.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { SalesOrderStatus } from '@prisma/client';

@ApiTags('sales')
@ApiBearerAuth()
@Controller('sales-orders')
export class SalesOrderController {
  constructor(private readonly salesOrderService: SalesOrderService) {}

  @Get()
  @RequirePermissions('sales:read', '*')
  @ApiOperation({ summary: 'List sales orders' })
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: SalesOrderStatus,
  ) {
    return this.salesOrderService.findAll(tenantId, { page, limit, search, status });
  }

  @Get(':id')
  @RequirePermissions('sales:read', '*')
  @ApiOperation({ summary: 'Get sales order by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.salesOrderService.findById(tenantId, id);
  }

  @Post(':id/confirm')
  @RequirePermissions('sales:write', '*')
  @ApiOperation({ summary: 'Confirm sales order' })
  confirm(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesOrderService.confirm(tenantId, id, userId);
  }

  @Post(':id/invoice')
  @RequirePermissions('sales:write', 'invoices:write', '*')
  @ApiOperation({ summary: 'Generate invoice from sales order' })
  generateInvoice(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesOrderService.generateInvoice(tenantId, id, userId);
  }
}
