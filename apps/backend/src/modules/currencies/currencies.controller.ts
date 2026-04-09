import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrenciesService } from './currencies.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('Currencies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'currencies', version: '1' })
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.currenciesService.findAll(tenantId);
  }

  @Post()
  upsert(@TenantId() tenantId: string, @Body() body: Record<string, unknown>) {
    return this.currenciesService.upsertCurrency(tenantId, body as any);
  }

  @Get('convert')
  convert(
    @TenantId() tenantId: string,
    @Query('amount') amount: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.currenciesService.convert(tenantId, Number(amount), from, to);
  }
}
