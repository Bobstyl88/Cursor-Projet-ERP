import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Prisma, Contact } from '@prisma/client';
import { buildPaginatedResult, PaginatedResult } from '@/common/interfaces/pagination.interface';
import { CreateContactDto, UpdateContactDto, QueryContactDto } from './dto';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateContactDto): Promise<Contact> {
    const code = await this.generateCode(tenantId, dto.type);
    return this.prisma.contact.create({
      data: {
        tenantId,
        code,
        type: dto.type,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        taxId: dto.taxId,
        notes: dto.notes,
        billingAddress: dto.billingAddress as Prisma.InputJsonValue,
        shippingAddress: dto.shippingAddress as Prisma.InputJsonValue,
        creditLimit: dto.creditLimit,
        paymentTermDays: dto.paymentTermDays,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: QueryContactDto,
  ): Promise<PaginatedResult<Contact>> {
    const where: Prisma.ContactWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: query.orderBy,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  async findOne(tenantId: string, id: string): Promise<Contact> {
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID "${id}" not found`);
    }

    return contact;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateContactDto,
  ): Promise<Contact> {
    await this.findOne(tenantId, id);

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.taxId !== undefined && { taxId: dto.taxId }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.billingAddress !== undefined && {
          billingAddress: dto.billingAddress as Prisma.InputJsonValue,
        }),
        ...(dto.shippingAddress !== undefined && {
          shippingAddress: dto.shippingAddress as Prisma.InputJsonValue,
        }),
        ...(dto.creditLimit !== undefined && { creditLimit: dto.creditLimit }),
        ...(dto.paymentTermDays !== undefined && {
          paymentTermDays: dto.paymentTermDays,
        }),
      },
    });
  }

  async remove(tenantId: string, id: string): Promise<Contact> {
    await this.findOne(tenantId, id);

    return this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async generateCode(tenantId: string, type: string): Promise<string> {
    const prefix = type === 'SUPPLIER' ? 'SUP' : 'CUS';

    const sequence = await this.prisma.sequence.upsert({
      where: { tenantId_prefix: { tenantId, prefix } },
      update: { currentValue: { increment: 1 } },
      create: { tenantId, prefix, currentValue: 1, padding: 5 },
    });

    return `${prefix}-${String(sequence.currentValue).padStart(5, '0')}`;
  }
}
