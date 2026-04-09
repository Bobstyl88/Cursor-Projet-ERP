import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurchaseOrderService } from './purchase-order.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PurchaseOrderStatus } from '@prisma/client';

@ApiTags('purchasing')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrderController {
  constructor(private readonly poService: PurchaseOrderService) {}

  @Get()
  @RequirePermissions('purchasing:read', '*')
  @ApiOperation({ summary: 'List purchase orders' })
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: PurchaseOrderStatus,
  ) {
    return this.poService.findAll(tenantId, { page, limit, search, status });
  }

  @Get(':id')
  @RequirePermissions('purchasing:read', '*')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.poService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('purchasing:write', '*')
  @ApiOperation({ summary: 'Create purchase order' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.poService.create(tenantId, userId, body);
  }

  @Post(':id/receive')
  @RequirePermissions('purchasing:write', 'inventory:write', '*')
  @ApiOperation({ summary: 'Receive goods for purchase order' })
  receive(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('lines') lines: Array<{ lineId: string; receivedQty: number }>,
  ) {
    return this.poService.receive(tenantId, id, userId, lines);
  }
}
