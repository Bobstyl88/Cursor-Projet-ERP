import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermissions('users:read', '*')
  @ApiOperation({ summary: 'List all users' })
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.userService.findAll(tenantId, { page, limit, search });
  }

  @Get(':id')
  @RequirePermissions('users:read', '*')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.userService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('users:write', '*')
  @ApiOperation({ summary: 'Create a new user' })
  create(
    @TenantId() tenantId: string,
    @Body()
    body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      roleIds?: string[];
    },
  ) {
    return this.userService.create(tenantId, body);
  }

  @Patch(':id')
  @RequirePermissions('users:write', '*')
  @ApiOperation({ summary: 'Update user' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      isActive?: boolean;
      roleIds?: string[];
    },
  ) {
    return this.userService.update(tenantId, id, body);
  }
}
