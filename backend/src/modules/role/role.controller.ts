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
import { RoleService } from './role.service';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from './dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(RolesGuard, PermissionsGuard)
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @Roles('Admin', 'Manager')
  @Permissions('Role:READ')
  @ApiOperation({ summary: 'List all roles in the current tenant' })
  @ApiResponse({ status: 200, description: 'Paginated list of roles' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.roleService.findAll(tenantId, pagination);
  }

  @Get('permissions')
  @Roles('Admin')
  @ApiOperation({ summary: 'List all available permissions' })
  @ApiResponse({ status: 200, description: 'List of all permissions' })
  async getAllPermissions() {
    return this.roleService.getAllPermissions();
  }

  @Get(':id')
  @Roles('Admin', 'Manager')
  @Permissions('Role:READ')
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role details with permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.roleService.findById(tenantId, id);
  }

  @Post()
  @Roles('Admin')
  @Permissions('Role:CREATE')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateRoleDto,
  ) {
    return this.roleService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles('Admin')
  @Permissions('Role:UPDATE')
  @ApiOperation({ summary: 'Update a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 400, description: 'System roles cannot be modified' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roleService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  @Permissions('Role:DELETE')
  @ApiOperation({ summary: 'Delete a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 400, description: 'System roles cannot be deleted or role has assigned users' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.roleService.remove(tenantId, id);
  }

  @Post(':id/permissions')
  @Roles('Admin')
  @Permissions('Role:UPDATE')
  @ApiOperation({ summary: 'Assign permissions to a role (replaces existing)' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Permissions assigned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid permission IDs' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async assignPermissions(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.roleService.assignPermissions(tenantId, id, dto);
  }

  @Delete(':id/permissions/:permissionId')
  @Roles('Admin')
  @Permissions('Role:UPDATE')
  @ApiOperation({ summary: 'Remove a permission from a role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiParam({ name: 'permissionId', description: 'Permission ID' })
  @ApiResponse({ status: 200, description: 'Permission removed from role' })
  @ApiResponse({ status: 404, description: 'Role or permission assignment not found' })
  async removePermission(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.roleService.removePermission(tenantId, id, permissionId);
  }
}
