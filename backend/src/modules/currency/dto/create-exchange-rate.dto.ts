import {
  IsString,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateExchangeRateDto {
  @ApiProperty({ description: 'Base currency code', example: 'USD' })
  @IsString()
  @MaxLength(3)
  baseCurrencyCode!: string;

  @ApiProperty({ description: 'Target currency code', example: 'EUR' })
  @IsString()
  @MaxLength(3)
  targetCurrencyCode!: string;

  @ApiProperty({ description: 'Exchange rate', example: 0.92 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  rate!: number;

  @ApiProperty({ description: 'Rate date', example: '2026-04-09' })
  @IsDateString()
  date!: string;
}
