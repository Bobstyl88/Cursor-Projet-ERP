import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentTenant, CurrentUser, JwtPayload } from '@/common/decorators';
import { AccountingService } from './accounting.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  CreateJournalEntryDto,
  QueryJournalEntryDto,
  ReportPeriodDto,
} from './dto';

@ApiTags('Accounting')
@ApiBearerAuth()
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // ── Chart of Accounts ───────────────────────────────────────

  @Get('chart-of-accounts')
  @ApiOperation({ summary: 'List chart of accounts (tree structure)' })
  @ApiResponse({ status: 200, description: 'Chart of accounts tree' })
  getChartOfAccounts(@CurrentTenant() tenantId: string) {
    return this.accountingService.getChartOfAccounts(tenantId);
  }

  @Post('chart-of-accounts')
  @ApiOperation({ summary: 'Create a new account category' })
  @ApiResponse({ status: 201, description: 'Account created' })
  createAccount(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountingService.createAccount(tenantId, dto);
  }

  @Patch('chart-of-accounts/:id')
  @ApiOperation({ summary: 'Update an account category' })
  @ApiResponse({ status: 200, description: 'Account updated' })
  updateAccount(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountingService.updateAccount(tenantId, id, dto);
  }

  // ── Journal Entries ─────────────────────────────────────────

  @Get('journal-entries')
  @ApiOperation({ summary: 'List journal entries (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated journal entries' })
  findAllJournalEntries(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryJournalEntryDto,
  ) {
    return this.accountingService.findAllJournalEntries(tenantId, query);
  }

  @Get('journal-entries/:id')
  @ApiOperation({ summary: 'Get journal entry by ID' })
  @ApiResponse({ status: 200, description: 'Journal entry details' })
  findOneJournalEntry(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.accountingService.findOneJournalEntry(tenantId, id);
  }

  @Post('journal-entries')
  @ApiOperation({ summary: 'Create a manual journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry created' })
  createJournalEntry(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateJournalEntryDto,
  ) {
    return this.accountingService.createJournalEntry(tenantId, user.sub, dto);
  }

  @Post('journal-entries/:id/post')
  @ApiOperation({ summary: 'Post a journal entry' })
  @ApiResponse({ status: 200, description: 'Journal entry posted' })
  postJournalEntry(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.accountingService.postJournalEntry(tenantId, id);
  }

  @Post('journal-entries/:id/cancel')
  @ApiOperation({ summary: 'Cancel a journal entry' })
  @ApiResponse({ status: 200, description: 'Journal entry cancelled' })
  cancelJournalEntry(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.accountingService.cancelJournalEntry(tenantId, id);
  }

  // ── Fiscal Years ────────────────────────────────────────────

  @Get('fiscal-years')
  @ApiOperation({ summary: 'List fiscal years' })
  @ApiResponse({ status: 200, description: 'List of fiscal years' })
  findAllFiscalYears(@CurrentTenant() tenantId: string) {
    return this.accountingService.findAllFiscalYears(tenantId);
  }

  @Post('fiscal-years')
  @ApiOperation({ summary: 'Create a new fiscal year' })
  @ApiResponse({ status: 201, description: 'Fiscal year created' })
  createFiscalYear(
    @CurrentTenant() tenantId: string,
    @Body() body: { name: string; startDate: string; endDate: string },
  ) {
    return this.accountingService.createFiscalYear(tenantId, body);
  }

  @Post('fiscal-years/:id/close')
  @ApiOperation({ summary: 'Close a fiscal year' })
  @ApiResponse({ status: 200, description: 'Fiscal year closed' })
  closeFiscalYear(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.accountingService.closeFiscalYear(tenantId, id);
  }

  // ── Financial Reports ───────────────────────────────────────

  @Get('trial-balance')
  @ApiOperation({ summary: 'Generate trial balance report' })
  @ApiResponse({ status: 200, description: 'Trial balance data' })
  getTrialBalance(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportPeriodDto,
  ) {
    return this.accountingService.getTrialBalance(tenantId, query);
  }

  @Get('profit-loss')
  @ApiOperation({ summary: 'Generate profit & loss report' })
  @ApiResponse({ status: 200, description: 'P&L data' })
  getProfitAndLoss(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportPeriodDto,
  ) {
    return this.accountingService.getProfitAndLoss(tenantId, query);
  }

  @Get('balance-sheet')
  @ApiOperation({ summary: 'Generate balance sheet report' })
  @ApiResponse({ status: 200, description: 'Balance sheet data' })
  getBalanceSheet(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportPeriodDto,
  ) {
    return this.accountingService.getBalanceSheet(tenantId, query);
  }
}
