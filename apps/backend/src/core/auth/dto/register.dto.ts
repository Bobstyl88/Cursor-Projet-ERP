import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'ACME Corporation' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: 'acme-corp' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens',
  })
  companySlug: string;

  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;
}
