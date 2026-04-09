import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType, JournalEntryStatus } from '@prisma/client';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class QueryAccountDto extends PaginationDto {
  @ApiPropertyOptional({ enum: AccountType, description: 'Filter by account type' })
  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @ApiPropertyOptional({ description: 'Search by name or code' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class QueryJournalEntryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: JournalEntryStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(JournalEntryStatus)
  status?: JournalEntryStatus;

  @ApiPropertyOptional({ description: 'Filter by fiscal year ID' })
  @IsOptional()
  @IsString()
  fiscalYearId?: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Search by number or description' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class ReportPeriodDto {
  @ApiPropertyOptional({ description: 'Start date', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Fiscal year ID' })
  @IsOptional()
  @IsString()
  fiscalYearId?: string;
}
