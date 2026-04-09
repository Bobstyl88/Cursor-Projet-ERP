import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '@prisma/client';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class QueryPurchaseOrderDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PurchaseOrderStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({ description: 'Filter by supplier contact ID' })
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Search by number' })
  @IsOptional()
  @IsString()
  search?: string;
}
