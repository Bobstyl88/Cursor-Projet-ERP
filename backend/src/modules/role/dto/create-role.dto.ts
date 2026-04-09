import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name', example: 'Sales Manager' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: 'Role description', example: 'Manages sales team and orders' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
