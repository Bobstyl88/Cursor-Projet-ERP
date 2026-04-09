import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { InvoiceStatus, InvoiceType } from '@prisma/client';

@ApiTags('invoicing')
@ApiBearerAuth()
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @RequirePermissions('invoices:read', '*')
  @ApiOperation({ summary: 'List invoices' })
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: InvoiceStatus,
    @Query('type') type?: InvoiceType,
  ) {
    return this.invoiceService.findAll(tenantId, { page, limit, search, status, type });
  }

  @Get(':id')
  @RequirePermissions('invoices:read', '*')
  @ApiOperation({ summary: 'Get invoice by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.invoiceService.findById(tenantId, id);
  }

  @Post(':id/validate')
  @RequirePermissions('invoices:write', '*')
  @ApiOperation({ summary: 'Validate invoice and create journal entry' })
  validate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.invoiceService.validate(tenantId, id, userId);
  }

  @Post(':id/payments')
  @RequirePermissions('invoices:write', 'accounting:write', '*')
  @ApiOperation({ summary: 'Record payment for invoice' })
  recordPayment(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.invoiceService.recordPayment(tenantId, id, userId, body);
  }
}
