import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { userRoles: true } } },
    });
  }

  async findById(tenantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
      include: { _count: { select: { userRoles: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(
    tenantId: string,
    data: { name: string; description?: string; permissions: string[] },
  ) {
    return this.prisma.role.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        permissions: JSON.stringify(data.permissions),
      },
    });
  }

  async update(
    tenantId: string,
    roleId: string,
    data: { name?: string; description?: string; permissions?: string[] },
  ) {
    const role = await this.findById(tenantId, roleId);
    if (role.isSystem) {
      throw new BadRequestException('Cannot modify system roles');
    }

    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissions
          ? JSON.stringify(data.permissions)
          : undefined,
      },
    });
  }

  async delete(tenantId: string, roleId: string) {
    const role = await this.findById(tenantId, roleId);
    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    return this.prisma.role.delete({ where: { id: roleId } });
  }
}
