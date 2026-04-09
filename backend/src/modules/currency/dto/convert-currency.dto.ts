import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ConvertCurrencyDto {
  @ApiProperty({ description: 'Amount to convert', example: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  amount!: number;

  @ApiProperty({ description: 'Source currency code', example: 'USD' })
  @IsString()
  @MaxLength(3)
  from!: string;

  @ApiProperty({ description: 'Target currency code', example: 'EUR' })
  @IsString()
  @MaxLength(3)
  to!: string;

  @ApiPropertyOptional({ description: 'Date for rate lookup (defaults to latest)' })
  @IsOptional()
  @IsDateString()
  date?: string;
}
