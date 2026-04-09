import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error } = this.mapPrismaError(exception);

    this.logger.warn(
      `Prisma error ${exception.code} on ${request.method} ${request.url}: ${message}`,
    );

    response.status(status).json({
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
    error: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[]) ?? [];
        const fields = target.length > 0 ? target.join(', ') : 'unknown field';
        return {
          status: HttpStatus.CONFLICT,
          message: `A record with this ${fields} already exists`,
          error: 'Unique Constraint Violation',
        };
      }

      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message:
            (exception.meta?.cause as string) ??
            'The requested record was not found',
          error: 'Record Not Found',
        };

      case 'P2003': {
        const field = (exception.meta?.field_name as string) ?? 'unknown';
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `Foreign key constraint failed on field: ${field}`,
          error: 'Foreign Key Violation',
        };
      }

      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          message:
            'The change you are trying to make would violate a required relation',
          error: 'Required Relation Violation',
        };

      case 'P2021':
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'The table does not exist in the current database',
          error: 'Table Not Found',
        };

      case 'P2022':
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'The column does not exist in the current database',
          error: 'Column Not Found',
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Database error: ${exception.message}`,
          error: `Prisma Error (${exception.code})`,
        };
    }
  }
}
