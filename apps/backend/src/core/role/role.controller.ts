import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermissions('users:read', '*')
  @ApiOperation({ summary: 'List all roles' })
  findAll(@TenantId() tenantId: string) {
    return this.roleService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('users:read', '*')
  @ApiOperation({ summary: 'Get role by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.roleService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('users:write', '*')
  @ApiOperation({ summary: 'Create a new role' })
  create(
    @TenantId() tenantId: string,
    @Body() body: { name: string; description?: string; permissions: string[] },
  ) {
    return this.roleService.create(tenantId, body);
  }

  @Patch(':id')
  @RequirePermissions('users:write', '*')
  @ApiOperation({ summary: 'Update role' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body()
    body: { name?: string; description?: string; permissions?: string[] },
  ) {
    return this.roleService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('users:write', '*')
  @ApiOperation({ summary: 'Delete role' })
  delete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.roleService.delete(tenantId, id);
  }
}
