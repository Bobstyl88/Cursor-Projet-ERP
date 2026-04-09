import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { PaginationParams, PaginatedResult } from '../../common/interfaces/pagination.interface';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(
    tenantId: string,
    params: PaginationParams & { type?: string },
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'name', sortOrder = 'asc', type } = params;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          taxRule: { select: { id: true, name: true, rate: true } },
          inventoryLevels: {
            include: { warehouse: { select: { id: true, name: true, code: true } } },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        taxRule: true,
        inventoryLevels: {
          include: { warehouse: true },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(
    tenantId: string,
    userId: string,
    data: {
      sku: string;
      name: string;
      description?: string;
      type?: string;
      unitPrice: number;
      costPrice?: number;
      taxRuleId?: string;
      unit?: string;
      metadata?: any;
    },
  ) {
    const product = await this.prisma.product.create({
      data: { tenantId, ...data } as any,
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'CREATE',
      entity: 'Product',
      entityId: product.id,
      newValues: { sku: product.sku, name: product.name },
    });

    return product;
  }

  async update(tenantId: string, id: string, userId: string, data: any) {
    const existing = await this.findById(tenantId, id);

    const product = await this.prisma.product.update({
      where: { id },
      data,
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'UPDATE',
      entity: 'Product',
      entityId: id,
      oldValues: existing,
      newValues: data,
    });

    return product;
  }
}
