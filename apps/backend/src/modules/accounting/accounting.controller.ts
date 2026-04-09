import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('accounting')
@ApiBearerAuth()
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('chart-of-accounts')
  @RequirePermissions('accounting:read', '*')
  @ApiOperation({ summary: 'Get chart of accounts' })
  getChartOfAccounts(@TenantId() tenantId: string) {
    return this.accountingService.getChartOfAccounts(tenantId);
  }

  @Post('chart-of-accounts')
  @RequirePermissions('accounting:write', '*')
  @ApiOperation({ summary: 'Create account' })
  createAccount(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.accountingService.createAccount(tenantId, userId, body);
  }

  @Get('journal-entries')
  @RequirePermissions('accounting:read', '*')
  @ApiOperation({ summary: 'List journal entries' })
  getJournalEntries(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.accountingService.getJournalEntries(tenantId, {
      page,
      limit,
      search,
      status,
    });
  }

  @Post('journal-entries')
  @RequirePermissions('accounting:write', '*')
  @ApiOperation({ summary: 'Create manual journal entry' })
  createJournalEntry(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.accountingService.createJournalEntry(tenantId, userId, body);
  }

  @Post('journal-entries/:id/post')
  @RequirePermissions('accounting:write', '*')
  @ApiOperation({ summary: 'Post journal entry' })
  postJournalEntry(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountingService.postJournalEntry(tenantId, id, userId);
  }

  @Get('trial-balance')
  @RequirePermissions('accounting:read', 'reporting:read', '*')
  @ApiOperation({ summary: 'Get trial balance' })
  getTrialBalance(@TenantId() tenantId: string) {
    return this.accountingService.getTrialBalance(tenantId);
  }
}
