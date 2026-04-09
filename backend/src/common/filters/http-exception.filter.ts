import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
  correlationId?: string;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[];
    let error: string;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as Record<string, any>;
      message = resp.message || exception.message;
      error = resp.error || HttpStatus[status] || 'Error';
    } else {
      message = exception.message;
      error = HttpStatus[status] || 'Error';
    }

    const errorBody: ErrorResponse = {
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    const correlationId = request.headers['x-correlation-id'] as string;
    if (correlationId) {
      errorBody.correlationId = correlationId;
    }

    this.logger.warn(
      `HTTP ${status} ${request.method} ${request.url} - ${JSON.stringify(message)}`,
    );

    response.status(status).json(errorBody);
  }
}
