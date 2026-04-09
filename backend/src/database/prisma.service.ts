import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });

    this.setupMiddleware();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  private setupMiddleware() {
    this.$use(this.softDeleteMiddleware());
    this.$use(this.auditLogMiddleware());
  }

  /**
   * Soft-delete middleware: intercepts delete operations and converts them
   * to updates that set a deletedAt timestamp. Also filters out soft-deleted
   * records on find operations unless explicitly including them.
   */
  private softDeleteMiddleware(): Prisma.Middleware {
    return async (
      params: Prisma.MiddlewareParams,
      next: (params: Prisma.MiddlewareParams) => Promise<any>,
    ) => {
      if (params.action === 'delete') {
        params.action = 'update';
        params.args['data'] = { deletedAt: new Date() };
      }

      if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        if (params.args.data) {
          params.args.data['deletedAt'] = new Date();
        } else {
          params.args['data'] = { deletedAt: new Date() };
        }
      }

      if (params.action === 'findUnique' || params.action === 'findFirst') {
        params.action = 'findFirst';
        if (params.args.where) {
          if (params.args.where['deletedAt'] === undefined) {
            params.args.where['deletedAt'] = null;
          }
        }
      }

      if (params.action === 'findMany') {
        if (params.args?.where) {
          if (params.args.where['deletedAt'] === undefined) {
            params.args.where['deletedAt'] = null;
          }
        } else {
          if (!params.args) params.args = {};
          if (!params.args.where) params.args.where = {};
          params.args.where['deletedAt'] = null;
        }
      }

      return next(params);
    };
  }

  /**
   * Audit log middleware: logs all write operations for traceability.
   */
  private auditLogMiddleware(): Prisma.Middleware {
    const writeActions = new Set([
      'create',
      'update',
      'delete',
      'createMany',
      'updateMany',
      'deleteMany',
      'upsert',
    ]);

    return async (
      params: Prisma.MiddlewareParams,
      next: (params: Prisma.MiddlewareParams) => Promise<any>,
    ) => {
      if (params.action && writeActions.has(params.action)) {
        const before = Date.now();
        const result = await next(params);
        const after = Date.now();

        this.logger.debug(
          `Prisma ${params.action} on ${params.model} took ${after - before}ms`,
        );

        return result;
      }

      return next(params);
    };
  }

  /**
   * Clean the database — only for use in test environments.
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase is only available in test environment');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$'),
    );

    return Promise.all(
      models.map((modelKey) => {
        const model = (this as any)[modelKey];
        if (model?.deleteMany) {
          return model.deleteMany();
        }
        return Promise.resolve();
      }),
    );
  }
}
