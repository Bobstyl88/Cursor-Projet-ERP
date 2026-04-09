import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { buildPaginatedResult, PaginatedResult } from '@/common/interfaces/pagination.interface';
import { AuditLog, Prisma } from '@prisma/client';
import { QueryAuditDto } from './dto/query-audit.dto';

interface CreateAuditLogData {
  action: string;
  resource: string;
  resourceId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  tenantId: string;
  userId: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAuditLogData): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        oldData: data.oldData as Prisma.InputJsonValue,
        newData: data.newData as Prisma.InputJsonValue,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        tenantId: data.tenantId,
        userId: data.userId,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: QueryAuditDto,
  ): Promise<PaginatedResult<AuditLog>> {
    const where: Prisma.AuditLogWhereInput = { tenantId };

    if (query.resource) {
      where.resource = query.resource;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.resourceId) {
      where.resourceId = query.resourceId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        skip: query.skip,
        take: query.take,
        orderBy: query.orderBy,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return buildPaginatedResult(logs as any, total, query);
  }
}
