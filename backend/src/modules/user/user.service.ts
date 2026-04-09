import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { buildPaginatedResult, PaginatedResult } from '@/common/interfaces/pagination.interface';
import { hashPassword } from '@/common/utils/hash.util';
import { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Omit<User, 'passwordHash'>>> {
    const where = { tenantId, deletedAt: null };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          tenantId: true,
          roleId: true,
          role: {
            select: { id: true, name: true },
          },
        },
        skip: pagination.skip,
        take: pagination.take,
        orderBy: pagination.orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResult(users as any, total, pagination);
  }

  async findById(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        tenantId: true,
        roleId: true,
        role: {
          select: { id: true, name: true, description: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  async create(tenantId: string, dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const role = await this.prisma.role.findFirst({
      where: { id: dto.roleId, tenantId },
    });

    if (!role) {
      throw new BadRequestException('Invalid role ID for this tenant');
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        tenantId,
        roleId: dto.roleId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        tenantId: true,
        roleId: true,
        role: {
          select: { id: true, name: true },
        },
      },
    });

    return user;
  }

  async update(tenantId: string, userId: string, dto: UpdateUserDto) {
    await this.findById(tenantId, userId);

    if (dto.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          id: { not: userId },
          deletedAt: null,
        },
      });

      if (existingUser) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    if (dto.roleId) {
      const role = await this.prisma.role.findFirst({
        where: { id: dto.roleId, tenantId },
      });

      if (!role) {
        throw new BadRequestException('Invalid role ID for this tenant');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.email && { email: dto.email }),
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
        ...(dto.roleId && { roleId: dto.roleId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        tenantId: true,
        roleId: true,
        role: {
          select: { id: true, name: true },
        },
      },
    });

    return user;
  }

  async remove(tenantId: string, userId: string): Promise<{ message: string }> {
    await this.findById(tenantId, userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return { message: 'User deleted successfully' };
  }
}
