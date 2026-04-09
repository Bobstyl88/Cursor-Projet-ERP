import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('tenant')
@ApiBearerAuth()
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @ApiOperation({ summary: 'Get current tenant info' })
  getTenant(@TenantId() tenantId: string) {
    return this.tenantService.findById(tenantId);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get tenant settings' })
  getSettings(@TenantId() tenantId: string) {
    return this.tenantService.getSettings(tenantId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update tenant settings' })
  updateSettings(
    @TenantId() tenantId: string,
    @Body() settings: Record<string, any>,
  ) {
    return this.tenantService.updateSettings(tenantId, settings);
  }
}
