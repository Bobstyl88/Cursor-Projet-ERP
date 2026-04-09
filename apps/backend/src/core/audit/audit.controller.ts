import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit:read', '*')
  @ApiOperation({ summary: 'List audit logs' })
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.auditService.findAll(tenantId, {
      page,
      limit,
      entity,
      entityId,
    });
  }
}
