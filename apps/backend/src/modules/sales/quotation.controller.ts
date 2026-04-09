import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuotationService } from './quotation.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { QuotationStatus } from '@prisma/client';

@ApiTags('sales')
@ApiBearerAuth()
@Controller('quotations')
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Get()
  @RequirePermissions('sales:read', '*')
  @ApiOperation({ summary: 'List quotations' })
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: QuotationStatus,
  ) {
    return this.quotationService.findAll(tenantId, { page, limit, search, status });
  }

  @Get(':id')
  @RequirePermissions('sales:read', '*')
  @ApiOperation({ summary: 'Get quotation by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.quotationService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('sales:write', '*')
  @ApiOperation({ summary: 'Create quotation' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.quotationService.create(tenantId, userId, body);
  }

  @Patch(':id/status')
  @RequirePermissions('sales:write', '*')
  @ApiOperation({ summary: 'Update quotation status' })
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('status') status: QuotationStatus,
  ) {
    return this.quotationService.updateStatus(tenantId, id, userId, status);
  }

  @Post(':id/convert')
  @RequirePermissions('sales:write', '*')
  @ApiOperation({ summary: 'Convert quotation to sales order' })
  convert(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.quotationService.convertToSalesOrder(tenantId, id, userId);
  }
}
