import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuotationStatus, SaleOrderStatus } from '@prisma/client';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class QueryQuotationDto extends PaginationDto {
  @ApiPropertyOptional({ enum: QuotationStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(QuotationStatus)
  status?: QuotationStatus;

  @ApiPropertyOptional({ description: 'Filter by contact ID' })
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Search by number' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class QuerySaleOrderDto extends PaginationDto {
  @ApiPropertyOptional({ enum: SaleOrderStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(SaleOrderStatus)
  status?: SaleOrderStatus;

  @ApiPropertyOptional({ description: 'Filter by contact ID' })
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Search by number' })
  @IsOptional()
  @IsString()
  search?: string;
}
