import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get()
  @RequirePermissions('inventory:read', '*')
  @ApiOperation({ summary: 'List warehouses' })
  findAll(@TenantId() tenantId: string) {
    return this.warehouseService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('inventory:read', '*')
  @ApiOperation({ summary: 'Get warehouse with stock levels' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.warehouseService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('inventory:write', '*')
  @ApiOperation({ summary: 'Create warehouse' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { name: string; code: string; address?: any; isDefault?: boolean },
  ) {
    return this.warehouseService.create(tenantId, userId, body);
  }

  @Post('stock-adjustment')
  @RequirePermissions('inventory:write', '*')
  @ApiOperation({ summary: 'Adjust stock (in/out/transfer)' })
  adjustStock(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.warehouseService.adjustStock(tenantId, userId, body);
  }

  @Get('movements/history')
  @RequirePermissions('inventory:read', '*')
  @ApiOperation({ summary: 'Stock movement history' })
  getMovements(
    @TenantId() tenantId: string,
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.warehouseService.getStockMovements(tenantId, {
      productId,
      warehouseId,
      page,
      limit,
    });
  }
}
