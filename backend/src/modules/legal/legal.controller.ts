import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentTenant } from '@/common/decorators';
import { LegalService } from './legal.service';
import { CreateCountryDto, CreateTaxRateDto, UpdateTaxRateDto } from './dto';

@ApiTags('Legal')
@ApiBearerAuth()
@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get('countries')
  @ApiOperation({ summary: 'List all countries' })
  @ApiResponse({ status: 200, description: 'List of countries' })
  findAllCountries() {
    return this.legalService.findAllCountries();
  }

  @Post('countries')
  @ApiOperation({ summary: 'Create a new country' })
  @ApiResponse({ status: 201, description: 'Country created' })
  createCountry(@Body() dto: CreateCountryDto) {
    return this.legalService.createCountry(dto);
  }

  @Get('tax-rates')
  @ApiOperation({ summary: 'List tax rates' })
  @ApiResponse({ status: 200, description: 'List of tax rates' })
  findAllTaxRates(@CurrentTenant() tenantId: string) {
    return this.legalService.findAllTaxRates(tenantId);
  }

  @Post('tax-rates')
  @ApiOperation({ summary: 'Create a new tax rate' })
  @ApiResponse({ status: 201, description: 'Tax rate created' })
  createTaxRate(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateTaxRateDto,
  ) {
    return this.legalService.createTaxRate(tenantId, dto);
  }

  @Patch('tax-rates/:id')
  @ApiOperation({ summary: 'Update a tax rate' })
  @ApiResponse({ status: 200, description: 'Tax rate updated' })
  updateTaxRate(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaxRateDto,
  ) {
    return this.legalService.updateTaxRate(tenantId, id, dto);
  }

  @Delete('tax-rates/:id')
  @ApiOperation({ summary: 'Deactivate a tax rate' })
  @ApiResponse({ status: 200, description: 'Tax rate deactivated' })
  removeTaxRate(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.legalService.removeTaxRate(tenantId, id);
  }
}
