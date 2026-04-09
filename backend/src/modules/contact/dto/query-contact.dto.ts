import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContactType } from '@prisma/client';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class QueryContactDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ContactType, description: 'Filter by contact type' })
  @IsOptional()
  @IsEnum(ContactType)
  type?: ContactType;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;
}
