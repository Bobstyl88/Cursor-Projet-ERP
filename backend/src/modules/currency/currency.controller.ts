import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentTenant } from '@/common/decorators';
import { CurrencyService } from './currency.service';
import { CreateCurrencyDto, CreateExchangeRateDto, ConvertCurrencyDto } from './dto';

@ApiTags('Currency')
@ApiBearerAuth()
@Controller()
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('currencies')
  @ApiOperation({ summary: 'List all active currencies' })
  @ApiResponse({ status: 200, description: 'List of currencies' })
  findAllCurrencies() {
    return this.currencyService.findAllCurrencies();
  }

  @Post('currencies')
  @ApiOperation({ summary: 'Create a new currency' })
  @ApiResponse({ status: 201, description: 'Currency created' })
  createCurrency(@Body() dto: CreateCurrencyDto) {
    return this.currencyService.createCurrency(dto);
  }

  @Get('exchange-rates')
  @ApiOperation({ summary: 'List exchange rates (filterable by date, currencies)' })
  @ApiResponse({ status: 200, description: 'List of exchange rates' })
  findExchangeRates(
    @CurrentTenant() tenantId: string,
    @Query('baseCurrencyCode') baseCurrencyCode?: string,
    @Query('targetCurrencyCode') targetCurrencyCode?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.currencyService.findExchangeRates(tenantId, {
      baseCurrencyCode,
      targetCurrencyCode,
      dateFrom,
      dateTo,
    });
  }

  @Post('exchange-rates')
  @ApiOperation({ summary: 'Create or update an exchange rate' })
  @ApiResponse({ status: 201, description: 'Exchange rate created/updated' })
  createExchangeRate(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateExchangeRateDto,
  ) {
    return this.currencyService.createExchangeRate(tenantId, dto);
  }

  @Get('exchange-rates/convert')
  @ApiOperation({ summary: 'Convert an amount between currencies' })
  @ApiResponse({ status: 200, description: 'Conversion result' })
  convert(
    @CurrentTenant() tenantId: string,
    @Query() dto: ConvertCurrencyDto,
  ) {
    return this.currencyService.convert(tenantId, dto);
  }
}
