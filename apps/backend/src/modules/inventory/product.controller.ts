import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @RequirePermissions('products:read', '*')
  @ApiOperation({ summary: 'List products' })
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    return this.productService.findAll(tenantId, { page, limit, search, type });
  }

  @Get(':id')
  @RequirePermissions('products:read', '*')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.productService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('products:write', '*')
  @ApiOperation({ summary: 'Create product' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.productService.create(tenantId, userId, body);
  }

  @Patch(':id')
  @RequirePermissions('products:write', '*')
  @ApiOperation({ summary: 'Update product' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.productService.update(tenantId, id, userId, body);
  }
}
