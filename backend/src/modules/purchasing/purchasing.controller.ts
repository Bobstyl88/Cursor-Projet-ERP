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
import { PurchasingService } from './purchasing.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ReceiveGoodsDto,
  QueryPurchaseOrderDto,
} from './dto';

@ApiTags('Purchasing')
@ApiBearerAuth()
@Controller('purchasing')
export class PurchasingController {
  constructor(private readonly purchasingService: PurchasingService) {}

  @Post('orders')
  @ApiOperation({ summary: 'Create a new purchase order' })
  @ApiResponse({ status: 201, description: 'Purchase order created' })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchasingService.create(tenantId, user.sub, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List purchase orders (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated purchase orders' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryPurchaseOrderDto,
  ) {
    return this.purchasingService.findAll(tenantId, query);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  @ApiResponse({ status: 200, description: 'Purchase order details' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.purchasingService.findOne(tenantId, id);
  }

  @Patch('orders/:id')
  @ApiOperation({ summary: 'Update a purchase order (DRAFT only)' })
  @ApiResponse({ status: 200, description: 'Purchase order updated' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchasingService.update(tenantId, id, dto);
  }

  @Post('orders/:id/send')
  @ApiOperation({ summary: 'Send purchase order to supplier' })
  @ApiResponse({ status: 200, description: 'Purchase order sent' })
  send(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.purchasingService.sendToSupplier(tenantId, id);
  }

  @Post('orders/:id/confirm')
  @ApiOperation({ summary: 'Confirm purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order confirmed' })
  confirm(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.purchasingService.confirm(tenantId, id);
  }

  @Post('orders/:id/receive')
  @ApiOperation({ summary: 'Record received goods (partial or full)' })
  @ApiResponse({ status: 200, description: 'Goods received, stock updated' })
  receive(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReceiveGoodsDto,
  ) {
    return this.purchasingService.receiveGoods(tenantId, user.sub, id, dto);
  }

  @Post('orders/:id/cancel')
  @ApiOperation({ summary: 'Cancel purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order cancelled' })
  cancel(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.purchasingService.cancel(tenantId, id);
  }
}
