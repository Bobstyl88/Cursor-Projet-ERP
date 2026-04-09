import { IsOptional, IsString, IsBoolean, IsEnum, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Plan } from '@prisma/client';

export class UpdateTenantDto {
  @ApiPropertyOptional({ description: 'Tenant name', example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Custom domain', example: 'erp.acme.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional({ description: 'Subscription plan', enum: Plan })
  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;

  @ApiPropertyOptional({ description: 'Whether the tenant is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
