import {
  Controller,
  Get,
  Patch,
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
import { RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { CurrentTenant } from '@/common/decorators';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { TenantService } from './tenant.service';
import { UpdateTenantDto, UpdateTenantSettingsDto } from './dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @Roles('Admin')
  @ApiOperation({ summary: 'List tenants (scoped to current tenant)' })
  @ApiResponse({ status: 200, description: 'Paginated list of tenants' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.tenantService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findById(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    if (id !== tenantId) {
      return this.tenantService.findById(tenantId);
    }
    return this.tenantService.findById(id);
  }

  @Patch(':id')
  @Roles('Admin')
  @ApiOperation({ summary: 'Update tenant details' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantService.update(tenantId, dto);
  }

  @Patch(':id/settings')
  @Roles('Admin')
  @ApiOperation({ summary: 'Update tenant-specific settings (currency, fiscal year, etc.)' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant settings updated successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async updateSettings(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    return this.tenantService.updateSettings(tenantId, dto);
  }
}
