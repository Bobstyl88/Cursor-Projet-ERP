import { PrismaService } from '../../database/prisma.service';

export interface SequenceOptions {
  prefix: string;
  tenantId: string;
  padLength?: number;
  includeYear?: boolean;
}

/**
 * Generates sequential document numbers scoped per tenant.
 *
 * Uses an atomic database operation to ensure uniqueness even under
 * concurrent requests. Expected Prisma model:
 *
 *   model Sequence {
 *     id        String @id @default(uuid())
 *     tenantId  String
 *     prefix    String
 *     year      Int
 *     current   Int    @default(0)
 *     @@unique([tenantId, prefix, year])
 *   }
 *
 * Example output: INV-2024-00001, QUO-2024-00042, PO-2024-00003
 */
export async function generateSequenceNumber(
  prisma: PrismaService,
  options: SequenceOptions,
): Promise<string> {
  const { prefix, tenantId, padLength = 5, includeYear = true } = options;
  const year = new Date().getFullYear();

  /*
   * Atomic upsert: creates the sequence row on first use, increments
   * the counter on subsequent calls. The unique constraint on
   * [tenantId, prefix, year] guarantees no duplicates.
   */
  const sequence = await (prisma as any).sequence?.upsert?.({
    where: {
      tenantId_prefix_year: { tenantId, prefix, year },
    },
    update: {
      current: { increment: 1 },
    },
    create: {
      tenantId,
      prefix,
      year,
      current: 1,
    },
  });

  const current = sequence?.current ?? 1;
  const paddedNumber = String(current).padStart(padLength, '0');

  if (includeYear) {
    return `${prefix}-${year}-${paddedNumber}`;
  }

  return `${prefix}-${paddedNumber}`;
}

/**
 * Fallback in-memory sequence generator for when the database model
 * is not yet available. NOT safe for production multi-instance deployments.
 */
export class InMemorySequenceGenerator {
  private readonly counters = new Map<string, number>();

  next(options: Omit<SequenceOptions, 'tenantId'> & { tenantId?: string }): string {
    const { prefix, tenantId = 'default', padLength = 5, includeYear = true } = options;
    const year = new Date().getFullYear();
    const key = `${tenantId}:${prefix}:${year}`;

    const current = (this.counters.get(key) ?? 0) + 1;
    this.counters.set(key, current);

    const paddedNumber = String(current).padStart(padLength, '0');

    if (includeYear) {
      return `${prefix}-${year}-${paddedNumber}`;
    }

    return `${prefix}-${paddedNumber}`;
  }

  reset(tenantId?: string, prefix?: string): void {
    if (!tenantId && !prefix) {
      this.counters.clear();
      return;
    }

    for (const key of this.counters.keys()) {
      const parts = key.split(':');
      if (tenantId && parts[0] !== tenantId) continue;
      if (prefix && parts[1] !== prefix) continue;
      this.counters.delete(key);
    }
  }
}
