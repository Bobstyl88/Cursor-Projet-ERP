import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentTenant, CurrentUser, JwtPayload } from '@/common/decorators';
import { InventoryService } from './inventory.service';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateStockMovementDto,
  QueryStockLevelDto,
  QueryStockMovementDto,
} from './dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ── Warehouses ──────────────────────────────────────────────

  @Post('warehouses')
  @ApiOperation({ summary: 'Create a new warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created' })
  createWarehouse(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateWarehouseDto,
  ) {
    return this.inventoryService.createWarehouse(tenantId, dto);
  }

  @Get('warehouses')
  @ApiOperation({ summary: 'List all warehouses' })
  @ApiResponse({ status: 200, description: 'List of warehouses' })
  findAllWarehouses(@CurrentTenant() tenantId: string) {
    return this.inventoryService.findAllWarehouses(tenantId);
  }

  @Patch('warehouses/:id')
  @ApiOperation({ summary: 'Update a warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse updated' })
  updateWarehouse(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.inventoryService.updateWarehouse(tenantId, id, dto);
  }

  @Delete('warehouses/:id')
  @ApiOperation({ summary: 'Soft-delete a warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse deleted' })
  removeWarehouse(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.inventoryService.removeWarehouse(tenantId, id);
  }

  // ── Stock Levels ────────────────────────────────────────────

  @Get('inventory/stock-levels')
  @ApiOperation({ summary: 'List stock levels (filterable by warehouse and product)' })
  @ApiResponse({ status: 200, description: 'Paginated stock levels' })
  getStockLevels(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryStockLevelDto,
  ) {
    return this.inventoryService.getStockLevels(tenantId, query);
  }

  @Get('inventory/stock-levels/:productId')
  @ApiOperation({ summary: 'Get stock levels for a product across all warehouses' })
  @ApiResponse({ status: 200, description: 'Stock levels by warehouse' })
  getProductStockLevels(
    @CurrentTenant() tenantId: string,
    @Param('productId') productId: string,
  ) {
    return this.inventoryService.getProductStockLevels(tenantId, productId);
  }

  // ── Stock Movements ─────────────────────────────────────────

  @Post('inventory/movements')
  @ApiOperation({ summary: 'Create a stock movement (IN, OUT, TRANSFER, ADJUSTMENT)' })
  @ApiResponse({ status: 201, description: 'Stock movement created' })
  createStockMovement(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateStockMovementDto,
  ) {
    return this.inventoryService.createStockMovement(tenantId, user.sub, dto);
  }

  @Get('inventory/movements')
  @ApiOperation({ summary: 'List stock movements (paginated, filterable)' })
  @ApiResponse({ status: 200, description: 'Paginated stock movements' })
  findAllMovements(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryStockMovementDto,
  ) {
    return this.inventoryService.findAllMovements(tenantId, query);
  }

  @Get('inventory/valuation')
  @ApiOperation({ summary: 'Get stock valuation report' })
  @ApiResponse({ status: 200, description: 'Stock valuation data' })
  getStockValuation(
    @CurrentTenant() tenantId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getStockValuation(tenantId, warehouseId);
  }
}
