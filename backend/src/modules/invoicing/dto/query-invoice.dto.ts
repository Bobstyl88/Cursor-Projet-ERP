import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceType, InvoiceStatus } from '@prisma/client';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class QueryInvoiceDto extends PaginationDto {
  @ApiPropertyOptional({ enum: InvoiceType, description: 'Filter by invoice type' })
  @IsOptional()
  @IsEnum(InvoiceType)
  type?: InvoiceType;

  @ApiPropertyOptional({ enum: InvoiceStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ description: 'Filter by contact ID' })
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Search by number' })
  @IsOptional()
  @IsString()
  search?: string;
}
