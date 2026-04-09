import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'accounting', version: '1' })
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('accounts')
  @RequirePermissions('accounting:read')
  listAccounts(@TenantId() tenantId: string) {
    return this.accountingService.findAccounts(tenantId);
  }

  @Post('accounts')
  @RequirePermissions('accounting:write')
  createAccount(@TenantId() tenantId: string, @Body() body: Record<string, unknown>) {
    return this.accountingService.createAccount(tenantId, body as any);
  }

  @Post('accounts/seed')
  @RequirePermissions('accounting:write')
  seedChart(@TenantId() tenantId: string) {
    return this.accountingService.seedDefaultChart(tenantId);
  }

  @Get('journal')
  @RequirePermissions('accounting:read')
  listEntries(
    @TenantId() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.accountingService.findEntries(
      tenantId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Post('journal')
  @RequirePermissions('accounting:write')
  createEntry(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountingService.createEntry({ tenantId, ...(body as any), createdBy: user.sub });
  }

  @Get('trial-balance')
  @RequirePermissions('accounting:read')
  trialBalance(@TenantId() tenantId: string) {
    return this.accountingService.getTrialBalance(tenantId);
  }
}
