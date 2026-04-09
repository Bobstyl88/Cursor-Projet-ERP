import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TaxType } from '@prisma/client';

export class CreateTaxRateDto {
  @ApiProperty({ description: 'Tax rate name', example: 'Standard VAT' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Tax rate code', example: 'VAT-21' })
  @IsString()
  @MaxLength(20)
  code!: string;

  @ApiProperty({ description: 'Tax rate percentage', example: 21 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  rate!: number;

  @ApiProperty({ enum: TaxType, description: 'Tax type' })
  @IsEnum(TaxType)
  type!: TaxType;

  @ApiPropertyOptional({ description: 'Country code' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ description: 'Is default rate', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
