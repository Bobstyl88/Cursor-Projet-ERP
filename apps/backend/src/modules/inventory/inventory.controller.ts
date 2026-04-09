import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { MovementType, MovementReason } from './schemas/stock-movement.schema';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'inventory', version: '1' })
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products')
  @RequirePermissions('inventory:read')
  listProducts(@TenantId() tenantId: string) {
    return this.inventoryService.findProducts(tenantId);
  }

  @Post('products')
  @RequirePermissions('inventory:write')
  createProduct(@TenantId() tenantId: string, @Body() body: Record<string, unknown>) {
    return this.inventoryService.createProduct(tenantId, body as any);
  }

  @Get('warehouses')
  @RequirePermissions('inventory:read')
  listWarehouses(@TenantId() tenantId: string) {
    return this.inventoryService.findWarehouses(tenantId);
  }

  @Post('warehouses')
  @RequirePermissions('inventory:write')
  createWarehouse(@TenantId() tenantId: string, @Body() body: Record<string, unknown>) {
    return this.inventoryService.createWarehouse(tenantId, body as any);
  }

  @Get('stock')
  @RequirePermissions('inventory:read')
  getStockLevels(@TenantId() tenantId: string, @Query('warehouseId') warehouseId?: string) {
    return this.inventoryService.getStockLevels(tenantId, warehouseId);
  }

  @Post('movements')
  @RequirePermissions('inventory:write')
  recordMovement(
    @TenantId() tenantId: string,
    @Body() body: {
      productId: string;
      warehouseId: string;
      type: MovementType;
      reason: MovementReason;
      quantity: number;
      unitCost?: number;
      note?: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.recordMovement({ tenantId, createdBy: user.sub, ...body });
  }
}
