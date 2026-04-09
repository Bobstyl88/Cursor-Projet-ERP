import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('currency')
@ApiBearerAuth()
@Controller('currencies')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get()
  @RequirePermissions('accounting:read', '*')
  @ApiOperation({ summary: 'List currencies' })
  findAll(@TenantId() tenantId: string) {
    return this.currencyService.findAll(tenantId);
  }

  @Post()
  @RequirePermissions('accounting:write', '*')
  @ApiOperation({ summary: 'Add currency' })
  create(@TenantId() tenantId: string, @Body() body: any) {
    return this.currencyService.create(tenantId, body);
  }

  @Patch(':code/rate')
  @RequirePermissions('accounting:write', '*')
  @ApiOperation({ summary: 'Update exchange rate' })
  updateRate(
    @TenantId() tenantId: string,
    @Param('code') code: string,
    @Body('exchangeRate') exchangeRate: number,
  ) {
    return this.currencyService.updateRate(tenantId, code, exchangeRate);
  }

  @Get('convert')
  @RequirePermissions('accounting:read', '*')
  @ApiOperation({ summary: 'Convert amount between currencies' })
  convert(
    @TenantId() tenantId: string,
    @Query('amount') amount: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.currencyService.convert(tenantId, amount, from, to);
  }
}
