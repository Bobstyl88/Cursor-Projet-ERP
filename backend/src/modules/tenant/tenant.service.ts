import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { buildPaginatedResult, PaginatedResult } from '@/common/interfaces/pagination.interface';
import { Tenant, Prisma } from '@prisma/client';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Tenant>> {
    const where = { id: tenantId, deletedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: pagination.orderBy,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return buildPaginatedResult(data, total, pagination);
  }

  async findById(tenantId: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    return tenant;
  }

  async update(tenantId: string, dto: UpdateTenantDto): Promise<Tenant> {
    await this.findById(tenantId);

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
    });
  }

  async updateSettings(
    tenantId: string,
    dto: UpdateTenantSettingsDto,
  ): Promise<Tenant> {
    const tenant = await this.findById(tenantId);

    const currentSettings =
      typeof tenant.settings === 'object' && tenant.settings !== null
        ? (tenant.settings as Record<string, unknown>)
        : {};

    const updatedSettings = { ...currentSettings };
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        updatedSettings[key] = value;
      }
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings as Prisma.InputJsonValue },
    });
  }
}
