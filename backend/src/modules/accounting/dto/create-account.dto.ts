import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';

export class CreateAccountDto {
  @ApiProperty({ description: 'Account code', example: '1000' })
  @IsString()
  @MaxLength(20)
  code!: string;

  @ApiProperty({ description: 'Account name', example: 'Cash and Bank' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ enum: AccountType, description: 'Account type' })
  @IsEnum(AccountType)
  type!: AccountType;

  @ApiPropertyOptional({ description: 'Parent account category ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'System account (non-deletable)', default: false })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}
