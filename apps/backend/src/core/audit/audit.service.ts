import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationParams, PaginatedResult } from '../../common/interfaces/pagination.interface';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    tenantId: string;
    userId?: string;
    action: string;
    entity: string;
    entityId: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({ data: params });
  }

  async findAll(
    tenantId: string,
    params: PaginationParams & { entity?: string; entityId?: string },
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 50, entity, entityId } = params;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
