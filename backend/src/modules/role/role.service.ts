import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { buildPaginatedResult, PaginatedResult } from '@/common/interfaces/pagination.interface';
import { Role } from '@prisma/client';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Role>> {
    const where = { tenantId };

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        include: {
          rolePermissions: {
            include: { permission: true },
          },
          _count: { select: { users: true } },
        },
        skip: pagination.skip,
        take: pagination.take,
        orderBy: pagination.orderBy,
      }),
      this.prisma.role.count({ where }),
    ]);

    return buildPaginatedResult(roles as any, total, pagination);
  }

  async findById(tenantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    return role;
  }

  async create(tenantId: string, dto: CreateRoleDto) {
    const existingRole = await this.prisma.role.findFirst({
      where: { tenantId, name: dto.name },
    });

    if (existingRole) {
      throw new ConflictException(`Role "${dto.name}" already exists in this tenant`);
    }

    return this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        tenantId,
        isSystem: false,
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
  }

  async update(tenantId: string, roleId: string, dto: UpdateRoleDto) {
    const role = await this.findById(tenantId, roleId);

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be modified');
    }

    if (dto.name) {
      const existingRole = await this.prisma.role.findFirst({
        where: {
          tenantId,
          name: dto.name,
          id: { not: roleId },
        },
      });

      if (existingRole) {
        throw new ConflictException(`Role "${dto.name}" already exists in this tenant`);
      }
    }

    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
  }

  async remove(tenantId: string, roleId: string): Promise<{ message: string }> {
    const role = await this.findById(tenantId, roleId);

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    const usersWithRole = await this.prisma.user.count({
      where: { roleId, tenantId, deletedAt: null },
    });

    if (usersWithRole > 0) {
      throw new BadRequestException(
        `Cannot delete role: ${usersWithRole} user(s) are still assigned to this role`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.role.delete({ where: { id: roleId } }),
    ]);

    return { message: 'Role deleted successfully' };
  }

  async assignPermissions(
    tenantId: string,
    roleId: string,
    dto: AssignPermissionsDto,
  ) {
    await this.findById(tenantId, roleId);

    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: dto.permissionIds } },
    });

    if (permissions.length !== dto.permissionIds.length) {
      const foundIds = new Set(permissions.map((p) => p.id));
      const missing = dto.permissionIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(`Invalid permission IDs: ${missing.join(', ')}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });

      await tx.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
        skipDuplicates: true,
      });
    });

    return this.findById(tenantId, roleId);
  }

  async removePermission(
    tenantId: string,
    roleId: string,
    permissionId: string,
  ): Promise<{ message: string }> {
    await this.findById(tenantId, roleId);

    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });

    if (!rolePermission) {
      throw new NotFoundException('Permission is not assigned to this role');
    }

    await this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });

    return { message: 'Permission removed from role successfully' };
  }

  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }
}
