import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../domain/errors';

const STATUS: Record<DomainError['kind'], number> = {
  validation: HttpStatus.BAD_REQUEST,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
};

const ERROR_NAME: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

/** Normaliza todos os erros para { statusCode, message, error }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno';
    let error: string | undefined;

    if (exception instanceof DomainError) {
      statusCode = STATUS[exception.kind];
      message = exception.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const b = body as { message?: unknown; error?: unknown };
        if (Array.isArray(b.message)) message = b.message.join('; ');
        else if (typeof b.message === 'string') message = b.message;
        if (typeof b.error === 'string') error = b.error;
      }
    } else {
      this.logger.error(exception);
    }

    res.status(statusCode).json({
      statusCode,
      message,
      error: error ?? ERROR_NAME[statusCode] ?? 'Error',
    });
  }
}
