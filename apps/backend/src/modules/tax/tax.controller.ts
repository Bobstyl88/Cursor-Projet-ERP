import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TaxService } from './tax.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('tax')
@ApiBearerAuth()
@Controller('tax-rules')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get()
  @RequirePermissions('accounting:read', '*')
  @ApiOperation({ summary: 'List tax rules' })
  findAll(
    @TenantId() tenantId: string,
    @Query('countryCode') countryCode?: string,
  ) {
    return this.taxService.findAll(tenantId, countryCode);
  }

  @Get(':id')
  @RequirePermissions('accounting:read', '*')
  @ApiOperation({ summary: 'Get tax rule' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.taxService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('accounting:write', '*')
  @ApiOperation({ summary: 'Create tax rule' })
  create(@TenantId() tenantId: string, @Body() body: any) {
    return this.taxService.create(tenantId, body);
  }

  @Patch(':id')
  @RequirePermissions('accounting:write', '*')
  @ApiOperation({ summary: 'Update tax rule' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.taxService.update(tenantId, id, body);
  }
}
