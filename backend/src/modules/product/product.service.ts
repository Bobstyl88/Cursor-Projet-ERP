import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Prisma, Product } from '@prisma/client';
import { buildPaginatedResult, PaginatedResult } from '@/common/interfaces/pagination.interface';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateProductDto): Promise<Product> {
    const existing = await this.prisma.product.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });

    if (existing) {
      throw new ConflictException(`Product with code "${dto.code}" already exists`);
    }

    return this.prisma.product.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        type: dto.type ?? 'GOODS',
        category: dto.category,
        unit: dto.unit ?? 'pcs',
        purchasePrice: dto.purchasePrice ?? 0,
        salePrice: dto.salePrice ?? 0,
        taxRate: dto.taxRate ?? 0,
        trackInventory: dto.trackInventory ?? true,
        minStock: dto.minStock,
        maxStock: dto.maxStock,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: QueryProductDto,
  ): Promise<PaginatedResult<Product>> {
    const where: Prisma.ProductWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: query.orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  async findOne(tenantId: string, id: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateProductDto,
  ): Promise<Product> {
    await this.findOne(tenantId, id);

    if (dto.code) {
      const existing = await this.prisma.product.findFirst({
        where: {
          tenantId,
          code: dto.code,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (existing) {
        throw new ConflictException(`Product with code "${dto.code}" already exists`);
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.purchasePrice !== undefined && { purchasePrice: dto.purchasePrice }),
        ...(dto.salePrice !== undefined && { salePrice: dto.salePrice }),
        ...(dto.taxRate !== undefined && { taxRate: dto.taxRate }),
        ...(dto.trackInventory !== undefined && { trackInventory: dto.trackInventory }),
        ...(dto.minStock !== undefined && { minStock: dto.minStock }),
        ...(dto.maxStock !== undefined && { maxStock: dto.maxStock }),
      },
    });
  }

  async remove(tenantId: string, id: string): Promise<Product> {
    await this.findOne(tenantId, id);

    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
