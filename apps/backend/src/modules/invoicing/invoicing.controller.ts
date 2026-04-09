import { Controller, Get, Post, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicingService } from './invoicing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { InvoiceStatus } from './schemas/invoice.schema';

@ApiTags('Invoicing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'invoicing', version: '1' })
export class InvoicingController {
  constructor(private readonly invoicingService: InvoicingService) {}

  @Get('tax-rules')
  @RequirePermissions('invoicing:read')
  listTaxRules(@TenantId() tenantId: string) {
    return this.invoicingService.findTaxRules(tenantId);
  }

  @Post('tax-rules')
  @RequirePermissions('invoicing:write')
  createTaxRule(@TenantId() tenantId: string, @Body() body: Record<string, unknown>) {
    return this.invoicingService.createTaxRule(tenantId, body as any);
  }

  @Get('invoices')
  @RequirePermissions('invoicing:read')
  listInvoices(@TenantId() tenantId: string, @Query('status') status?: InvoiceStatus) {
    return this.invoicingService.findInvoices(tenantId, status);
  }

  @Get('invoices/:id')
  @RequirePermissions('invoicing:read')
  getInvoice(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.invoicingService.findById(tenantId, id);
  }

  @Post('invoices/from-order')
  @RequirePermissions('invoicing:write')
  createFromOrder(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoicingService.createFromSaleOrder({ tenantId, ...(body as any), userId: user.sub });
  }

  @Patch('invoices/:id/payment')
  @RequirePermissions('invoicing:write')
  recordPayment(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { amount: number; currency: string },
  ) {
    return this.invoicingService.recordPayment(tenantId, id, body.amount, body.currency);
  }
}
