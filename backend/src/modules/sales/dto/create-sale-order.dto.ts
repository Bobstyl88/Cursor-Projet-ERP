import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SaleOrderLineDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId!: string;

  @ApiPropertyOptional({ description: 'Line description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Quantity', example: 10 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity!: number;

  @ApiProperty({ description: 'Unit price', example: 25.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ description: 'Discount percentage', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Tax rate percentage', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateSaleOrderDto {
  @ApiProperty({ description: 'Contact ID (customer)' })
  @IsString()
  contactId!: string;

  @ApiProperty({ description: 'Order date', example: '2026-04-09' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ description: 'Delivery date' })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  @IsString()
  @MaxLength(3)
  currencyCode!: string;

  @ApiPropertyOptional({ description: 'Exchange rate', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  exchangeRate?: number;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Order lines', type: [SaleOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleOrderLineDto)
  lines!: SaleOrderLineDto[];
}
