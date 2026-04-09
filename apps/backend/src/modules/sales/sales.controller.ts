import {
  Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { QuoteStatus } from './schemas/quote.schema';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'sales', version: '1' })
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // ── Customers ─────────────────────────────────────────────────────────

  @Get('customers')
  @RequirePermissions('customers:read')
  listCustomers(@TenantId() tenantId: string) {
    return this.salesService.findCustomers(tenantId);
  }

  @Post('customers')
  @RequirePermissions('customers:write')
  createCustomer(@TenantId() tenantId: string, @Body() body: Record<string, unknown>) {
    return this.salesService.createCustomer(tenantId, body as any);
  }

  // ── Quotes ────────────────────────────────────────────────────────────

  @Get('quotes')
  @RequirePermissions('sales:read')
  @ApiQuery({ name: 'status', enum: QuoteStatus, required: false })
  listQuotes(@TenantId() tenantId: string, @Query('status') status?: QuoteStatus) {
    return this.salesService.findQuotes(tenantId, status);
  }

  @Post('quotes')
  @RequirePermissions('sales:write')
  createQuote(
    @TenantId() tenantId: string,
    @Body() dto: CreateQuoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.salesService.createQuote(tenantId, dto, user.sub);
  }

  @Get('quotes/:id')
  @RequirePermissions('sales:read')
  getQuote(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.salesService.findQuoteById(tenantId, id);
  }

  @Post('quotes/:id/convert')
  @RequirePermissions('sales:write')
  @HttpCode(HttpStatus.CREATED)
  convertQuote(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.salesService.convertQuoteToOrder(tenantId, id, user.sub);
  }

  // ── Orders ────────────────────────────────────────────────────────────

  @Get('orders')
  @RequirePermissions('sales:read')
  listOrders(@TenantId() tenantId: string) {
    return this.salesService.findOrders(tenantId);
  }
}
