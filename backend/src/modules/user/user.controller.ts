import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { RolesGuard, PermissionsGuard } from '@/common/guards';
import { Roles, Permissions, CurrentTenant } from '@/common/decorators';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(RolesGuard, PermissionsGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles('Admin', 'Manager')
  @Permissions('User:READ')
  @ApiOperation({ summary: 'List all users in the current tenant' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.userService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @Permissions('User:READ')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.userService.findById(tenantId, id);
  }

  @Post()
  @Roles('Admin')
  @Permissions('User:CREATE')
  @ApiOperation({ summary: 'Create a new user in the current tenant' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.userService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles('Admin')
  @Permissions('User:UPDATE')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @Permissions('User:DELETE')
  @ApiOperation({ summary: 'Soft delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.userService.remove(tenantId, id);
  }
}
