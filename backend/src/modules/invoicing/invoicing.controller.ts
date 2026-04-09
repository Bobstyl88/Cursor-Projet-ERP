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
import { InvoicingService } from './invoicing.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  CreatePaymentDto,
  QueryInvoiceDto,
} from './dto';

@ApiTags('Invoicing')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicingController {
  constructor(private readonly invoicingService: InvoicingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice (or from sale/purchase order)' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInvoiceDto,
  ) {
    if (dto.saleOrderId && dto.type === 'SALE') {
      return this.invoicingService.createFromSaleOrder(
        tenantId,
        user.sub,
        dto.saleOrderId,
      );
    }

    if (dto.purchaseOrderId && dto.type === 'PURCHASE') {
      return this.invoicingService.createFromPurchaseOrder(
        tenantId,
        user.sub,
        dto.purchaseOrderId,
      );
    }

    return this.invoicingService.create(tenantId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List invoices (filterable by type, status, contact, date range)' })
  @ApiResponse({ status: 200, description: 'Paginated invoices' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryInvoiceDto,
  ) {
    return this.invoicingService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.invoicingService.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an invoice (DRAFT only)' })
  @ApiResponse({ status: 200, description: 'Invoice updated' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicingService.update(tenantId, id, dto);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Mark invoice as sent' })
  @ApiResponse({ status: 200, description: 'Invoice marked as sent' })
  send(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.invoicingService.send(tenantId, id);
  }

  @Post(':id/void')
  @ApiOperation({ summary: 'Void an invoice' })
  @ApiResponse({ status: 200, description: 'Invoice voided' })
  voidInvoice(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.invoicingService.void(tenantId, id);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Record a payment for an invoice' })
  @ApiResponse({ status: 201, description: 'Payment recorded' })
  recordPayment(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.invoicingService.recordPayment(tenantId, user.sub, id, dto);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'List payments for an invoice' })
  @ApiResponse({ status: 200, description: 'Invoice payments' })
  getPayments(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.invoicingService.getPayments(tenantId, id);
  }
}
