import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCountryDto {
  @ApiProperty({ description: 'Country code (ISO 3166-1 alpha-2)', example: 'US' })
  @IsString()
  @MaxLength(2)
  code!: string;

  @ApiProperty({ description: 'Country name', example: 'United States' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Default currency code', example: 'USD' })
  @IsString()
  @MaxLength(3)
  currencyCode!: string;

  @ApiProperty({ description: 'Tax label', example: 'Sales Tax', default: 'VAT' })
  @IsString()
  @MaxLength(50)
  taxLabel!: string;
}
