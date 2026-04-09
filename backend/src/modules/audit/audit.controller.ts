import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { RolesGuard } from '@/common/guards';
import { Roles, CurrentTenant } from '@/common/decorators';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('Admin')
  @ApiOperation({ summary: 'List audit logs (paginated and filterable)' })
  @ApiResponse({ status: 200, description: 'Paginated list of audit logs' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryAuditDto,
  ) {
    return this.auditService.findAll(tenantId, query);
  }
}
