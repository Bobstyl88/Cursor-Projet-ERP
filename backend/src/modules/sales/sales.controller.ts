import {
  Controller,
  Get,
  Post,
  Patch,
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
import { SalesService } from './sales.service';
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  CreateSaleOrderDto,
  UpdateSaleOrderDto,
  QueryQuotationDto,
  QuerySaleOrderDto,
} from './dto';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // ── Quotations ──────────────────────────────────────────────

  @Post('quotations')
  @ApiOperation({ summary: 'Create a new quotation' })
  @ApiResponse({ status: 201, description: 'Quotation created' })
  createQuotation(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateQuotationDto,
  ) {
    return this.salesService.createQuotation(tenantId, user.sub, dto);
  }

  @Get('quotations')
  @ApiOperation({ summary: 'List quotations (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated quotations' })
  findAllQuotations(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryQuotationDto,
  ) {
    return this.salesService.findAllQuotations(tenantId, query);
  }

  @Get('quotations/:id')
  @ApiOperation({ summary: 'Get quotation by ID' })
  @ApiResponse({ status: 200, description: 'Quotation details' })
  findOneQuotation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.salesService.findOneQuotation(tenantId, id);
  }

  @Patch('quotations/:id')
  @ApiOperation({ summary: 'Update a quotation (DRAFT only)' })
  @ApiResponse({ status: 200, description: 'Quotation updated' })
  updateQuotation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
  ) {
    return this.salesService.updateQuotation(tenantId, id, dto);
  }

  @Post('quotations/:id/send')
  @ApiOperation({ summary: 'Mark quotation as SENT' })
  @ApiResponse({ status: 200, description: 'Quotation sent' })
  sendQuotation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.salesService.sendQuotation(tenantId, id);
  }

  @Post('quotations/:id/accept')
  @ApiOperation({ summary: 'Mark quotation as ACCEPTED' })
  @ApiResponse({ status: 200, description: 'Quotation accepted' })
  acceptQuotation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.salesService.acceptQuotation(tenantId, id);
  }

  @Post('quotations/:id/reject')
  @ApiOperation({ summary: 'Mark quotation as REJECTED' })
  @ApiResponse({ status: 200, description: 'Quotation rejected' })
  rejectQuotation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.salesService.rejectQuotation(tenantId, id);
  }

  @Post('quotations/:id/convert')
  @ApiOperation({ summary: 'Convert accepted quotation to sale order' })
  @ApiResponse({ status: 201, description: 'Sale order created from quotation' })
  convertQuotation(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.salesService.convertQuotationToOrder(tenantId, user.sub, id);
  }

  // ── Sale Orders ─────────────────────────────────────────────

  @Post('orders')
  @ApiOperation({ summary: 'Create a new sale order' })
  @ApiResponse({ status: 201, description: 'Sale order created' })
  createSaleOrder(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSaleOrderDto,
  ) {
    return this.salesService.createSaleOrder(tenantId, user.sub, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List sale orders (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated sale orders' })
  findAllSaleOrders(
    @CurrentTenant() tenantId: string,
    @Query() query: QuerySaleOrderDto,
  ) {
    return this.salesService.findAllSaleOrders(tenantId, query);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get sale order by ID' })
  @ApiResponse({ status: 200, description: 'Sale order details' })
  findOneSaleOrder(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.salesService.findOneSaleOrder(tenantId, id);
  }

  @Patch('orders/:id')
  @ApiOperation({ summary: 'Update a sale order (DRAFT only)' })
  @ApiResponse({ status: 200, description: 'Sale order updated' })
  updateSaleOrder(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSaleOrderDto,
  ) {
    return this.salesService.updateSaleOrder(tenantId, id, dto);
  }

  @Post('orders/:id/confirm')
  @ApiOperation({ summary: 'Confirm a sale order' })
  @ApiResponse({ status: 200, description: 'Sale order confirmed' })
  confirmSaleOrder(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.salesService.confirmSaleOrder(tenantId, id);
  }

  @Post('orders/:id/cancel')
  @ApiOperation({ summary: 'Cancel a sale order' })
  @ApiResponse({ status: 200, description: 'Sale order cancelled' })
  cancelSaleOrder(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.salesService.cancelSaleOrder(tenantId, id);
  }
}
