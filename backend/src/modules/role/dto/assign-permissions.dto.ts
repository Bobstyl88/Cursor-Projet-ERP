import { IsArray, IsNotEmpty, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPermissionsDto {
  @ApiProperty({
    description: 'Array of permission IDs to assign to the role',
    example: ['perm_abc123', 'perm_def456'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissionIds!: string[];
}
