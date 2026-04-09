import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: 'Role name', example: 'Sales Manager' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Role description', example: 'Manages sales team and orders' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
