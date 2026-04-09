import { Controller, Get, Post, Param, Body, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'purchases', version: '1' })
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get('suppliers')
  @RequirePermissions('suppliers:read')
  listSuppliers(@TenantId() tenantId: string) {
    return this.purchasesService.findSuppliers(tenantId);
  }

  @Post('suppliers')
  @RequirePermissions('suppliers:write')
  createSupplier(@TenantId() tenantId: string, @Body() body: Record<string, unknown>) {
    return this.purchasesService.createSupplier(tenantId, body as any);
  }

  @Get('orders')
  @RequirePermissions('purchases:read')
  listOrders(@TenantId() tenantId: string) {
    return this.purchasesService.findOrders(tenantId);
  }

  @Post('orders')
  @RequirePermissions('purchases:write')
  createOrder(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.purchasesService.createOrder(tenantId, body as any, user.sub);
  }

  @Get('orders/:id')
  @RequirePermissions('purchases:read')
  getOrder(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.purchasesService.findOrderById(tenantId, id);
  }

  @Patch('orders/:id/receive')
  @RequirePermissions('purchases:write')
  receiveOrder(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.purchasesService.receiveOrder(tenantId, id);
  }
}
