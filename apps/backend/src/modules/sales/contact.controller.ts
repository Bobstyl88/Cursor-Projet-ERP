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
import { ContactService } from './contact.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ContactType } from '@prisma/client';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @RequirePermissions('contacts:read', '*')
  @ApiOperation({ summary: 'List contacts' })
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('type') type?: ContactType,
  ) {
    return this.contactService.findAll(tenantId, {
      page,
      limit,
      search,
      type,
    });
  }

  @Get(':id')
  @RequirePermissions('contacts:read', '*')
  @ApiOperation({ summary: 'Get contact by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.contactService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('contacts:write', '*')
  @ApiOperation({ summary: 'Create contact' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.contactService.create(tenantId, userId, body);
  }

  @Patch(':id')
  @RequirePermissions('contacts:write', '*')
  @ApiOperation({ summary: 'Update contact' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.contactService.update(tenantId, id, userId, body);
  }
}
