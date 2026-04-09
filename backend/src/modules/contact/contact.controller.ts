import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { CurrentTenant } from '@/common/decorators';
import { ContactService } from './contact.service';
import { CreateContactDto, UpdateContactDto, QueryContactDto } from './dto';

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiResponse({ status: 201, description: 'Contact created' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List contacts (paginated, filterable by type)' })
  @ApiResponse({ status: 200, description: 'Paginated list of contacts' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryContactDto,
  ) {
    return this.contactService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a contact by ID' })
  @ApiResponse({ status: 200, description: 'Contact details' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.contactService.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a contact' })
  @ApiResponse({ status: 200, description: 'Contact updated' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a contact' })
  @ApiResponse({ status: 200, description: 'Contact deleted' })
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.contactService.remove(tenantId, id);
  }
}
