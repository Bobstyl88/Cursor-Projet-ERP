import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument, UserRole, DEFAULT_ROLE_PERMISSIONS } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(tenantId: string, dto: CreateUserDto): Promise<UserDocument> {
    const exists = await this.userModel.findOne({ tenantId, email: dto.email.toLowerCase() });
    if (exists) throw new ConflictException('Email already registered for this tenant');

    const roles = dto.roles ?? [UserRole.VIEWER];

    // Derive permissions from roles (union set)
    const permissions = [...new Set(
      roles.flatMap((r) => DEFAULT_ROLE_PERMISSIONS[r] ?? []),
    )];

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = new this.userModel({
      tenantId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      passwordHash,
      roles,
      permissions,
      locale: dto.locale ?? 'fr',
    });
    return user.save();
  }

  async findByEmail(tenantId: string, email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ tenantId, email: email.toLowerCase(), isActive: true })
      .select('+passwordHash')
      .exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAllByTenant(tenantId: string): Promise<UserDocument[]> {
    return this.userModel.find({ tenantId, isActive: true }).select('-passwordHash').exec();
  }

  async updateRefreshToken(userId: string, token: string | null): Promise<void> {
    const hash = token ? await bcrypt.hash(token, 10) : undefined;
    await this.userModel.findByIdAndUpdate(userId, {
      refreshTokenHash: hash ?? null,
      lastLoginAt: new Date(),
    });
  }
}
