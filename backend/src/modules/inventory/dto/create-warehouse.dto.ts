import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarehouseDto {
  @ApiProperty({ description: 'Warehouse code', example: 'WH-MAIN' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ description: 'Warehouse name', example: 'Main Warehouse' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Warehouse address as JSON object' })
  @IsOptional()
  @IsObject()
  address?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Set as default warehouse', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
