import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCurrencyDto {
  @ApiProperty({ description: 'Currency code (ISO 4217)', example: 'USD' })
  @IsString()
  @MaxLength(3)
  code!: string;

  @ApiProperty({ description: 'Currency name', example: 'US Dollar' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Currency symbol', example: '$' })
  @IsString()
  @MaxLength(5)
  symbol!: string;

  @ApiPropertyOptional({ description: 'Decimal places', default: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(4)
  decimalPlaces?: number;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
