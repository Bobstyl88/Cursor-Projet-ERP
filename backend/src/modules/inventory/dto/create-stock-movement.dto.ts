import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StockMovementType } from '@prisma/client';

export class CreateStockMovementDto {
  @ApiProperty({ enum: StockMovementType, description: 'Movement type' })
  @IsEnum(StockMovementType)
  type!: StockMovementType;

  @ApiProperty({ description: 'Warehouse ID (for IN, OUT, ADJUSTMENT)' })
  @IsString()
  warehouseId!: string;

  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId!: string;

  @ApiProperty({ description: 'Quantity', example: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Source warehouse ID (for TRANSFER)' })
  @ValidateIf((o) => o.type === 'TRANSFER')
  @IsString()
  sourceWarehouseId?: string;

  @ApiPropertyOptional({ description: 'Destination warehouse ID (for TRANSFER)' })
  @ValidateIf((o) => o.type === 'TRANSFER')
  @IsString()
  destinationWarehouseId?: string;

  @ApiPropertyOptional({ description: 'Reference document number' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
