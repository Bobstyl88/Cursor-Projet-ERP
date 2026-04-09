import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ReceiveGoodsLineDto {
  @ApiProperty({ description: 'Purchase order line ID (product ID)' })
  @IsString()
  productId!: string;

  @ApiProperty({ description: 'Quantity received', example: 50 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  receivedQuantity!: number;
}

export class ReceiveGoodsDto {
  @ApiProperty({ description: 'Warehouse ID to receive goods into' })
  @IsString()
  warehouseId!: string;

  @ApiPropertyOptional({ description: 'Reference number' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Lines to receive', type: [ReceiveGoodsLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveGoodsLineDto)
  lines!: ReceiveGoodsLineDto[];
}
