import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JournalEntryDocument = JournalEntry & Document;

export enum JournalEntryStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  CANCELLED = 'cancelled',
}

export class JournalLine {
  @Prop({ required: true })
  accountCode: string;

  @Prop({ required: true })
  accountName: string;

  @Prop({ required: true, min: 0 })
  debit: number;

  @Prop({ required: true, min: 0 })
  credit: number;

  @Prop({ type: String })
  description?: string;
}

/**
 * Double-entry journal. Every financial event creates exactly one entry.
 * The sum of debits MUST equal the sum of credits before posting.
 */
@Schema({ timestamps: true, collection: 'journal_entries' })
export class JournalEntry {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, unique: true })
  number: string;

  @Prop({ required: true, type: Date })
  date: Date;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: JournalEntryStatus, default: JournalEntryStatus.DRAFT })
  status: JournalEntryStatus;

  @Prop({ type: [Object], default: [] })
  lines: JournalLine[];

  @Prop({ required: true, default: 'EUR' })
  currency: string;

  @Prop({ default: 1 })
  exchangeRate: number;

  /** Source document reference */
  @Prop({ type: String })
  referenceId?: string;

  @Prop({ type: String })
  referenceType?: string;

  @Prop({ type: String })
  createdBy: string;
}

export const JournalEntrySchema = SchemaFactory.createForClass(JournalEntry);
JournalEntrySchema.index({ tenantId: 1, date: -1 });
JournalEntrySchema.index({ tenantId: 1, referenceId: 1 });
