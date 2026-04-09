import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument, TenantStatus } from './schemas/tenant.schema';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(@InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>) {}

  async create(dto: CreateTenantDto): Promise<TenantDocument> {
    const existing = await this.tenantModel.findOne({
      $or: [{ slug: dto.slug }, { domain: dto.domain }],
    });
    if (existing) throw new ConflictException('Tenant slug or domain already taken');

    const tenant = new this.tenantModel({
      ...dto,
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day trial
    });
    return tenant.save();
  }

  async findById(id: string): Promise<TenantDocument> {
    const tenant = await this.tenantModel.findById(id);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async findBySlug(slug: string): Promise<TenantDocument> {
    const tenant = await this.tenantModel.findOne({ slug });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async findAll(): Promise<TenantDocument[]> {
    return this.tenantModel.find().sort({ createdAt: -1 }).exec();
  }

  async suspend(id: string): Promise<TenantDocument> {
    const tenant = await this.findById(id);
    tenant.status = TenantStatus.SUSPENDED;
    tenant.suspendedAt = new Date();
    return tenant.save();
  }
}
