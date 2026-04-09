import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import {
  PaginationParams,
  PaginatedResult,
} from '../../common/interfaces/pagination.interface';
import { ContactType } from '@prisma/client';

@Injectable()
export class ContactService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(
    tenantId: string,
    params: PaginationParams & { type?: ContactType },
  ): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      type,
    } = params;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async create(
    tenantId: string,
    userId: string,
    data: {
      type: ContactType;
      companyName?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      vatNumber?: string;
      address?: any;
      countryCode?: string;
      currencyCode?: string;
    },
  ) {
    const contact = await this.prisma.contact.create({
      data: { tenantId, ...data },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'CREATE',
      entity: 'Contact',
      entityId: contact.id,
      newValues: data,
    });

    return contact;
  }

  async update(
    tenantId: string,
    id: string,
    userId: string,
    data: Partial<{
      companyName: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      vatNumber: string;
      address: any;
      countryCode: string;
      currencyCode: string;
      isActive: boolean;
    }>,
  ) {
    const existing = await this.findById(tenantId, id);

    const contact = await this.prisma.contact.update({
      where: { id },
      data,
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'UPDATE',
      entity: 'Contact',
      entityId: id,
      oldValues: existing,
      newValues: data,
    });

    return contact;
  }
}
