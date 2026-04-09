import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

/**
 * Every document in the ERP shares these fields.
 * Extend with @Schema() + @InheritableSchema() pattern in modules.
 */
@Schema({ timestamps: true })
export abstract class BaseDocument {
  /** Populated automatically by Mongoose */
  _id: Types.ObjectId;

  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: String })
  deletedBy?: string;

  /** Timestamps added by { timestamps: true } option */
  createdAt: Date;
  updatedAt: Date;
}
