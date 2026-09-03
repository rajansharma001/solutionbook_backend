import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  requestId: string;
  timestamp: string;
  [key: string]: unknown;
}

const ERROR_TYPES: Record<number, { type: string; title: string }> = {
  [HttpStatus.BAD_REQUEST]: {
    type: 'https://httpstatuses.com/400',
    title: 'Bad Request',
  },
  [HttpStatus.UNAUTHORIZED]: {
    type: 'https://httpstatuses.com/401',
    title: 'Unauthorized',
  },
  [HttpStatus.FORBIDDEN]: {
    type: 'https://httpstatuses.com/403',
    title: 'Forbidden',
  },
  [HttpStatus.NOT_FOUND]: {
    type: 'https://httpstatuses.com/404',
    title: 'Not Found',
  },
  [HttpStatus.CONFLICT]: {
    type: 'https://httpstatuses.com/409',
    title: 'Conflict',
  },
  [HttpStatus.UNPROCESSABLE_ENTITY]: {
    type: 'https://httpstatuses.com/422',
    title: 'Unprocessable Entity',
  },
  [HttpStatus.TOO_MANY_REQUESTS]: {
    type: 'https://httpstatuses.com/429',
    title: 'Too Many Requests',
  },
  [HttpStatus.INTERNAL_SERVER_ERROR]: {
    type: 'https://httpstatuses.com/500',
    title: 'Internal Server Error',
  },
  [HttpStatus.SERVICE_UNAVAILABLE]: {
    type: 'https://httpstatuses.com/503',
    title: 'Service Unavailable',
  },
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    if (ctx.getResponse == null) return;

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (!response || !response.status) return;

    const requestId = crypto.randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let detail = 'Internal server error';
    let title = 'Internal Server Error';
    let type = 'https://httpstatuses.com/500';
    let errorCode: string | undefined;
    let validationErrors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      const errorConfig = ERROR_TYPES[status] || ERROR_TYPES[HttpStatus.INTERNAL_SERVER_ERROR];
      type = errorConfig.type;
      title = errorConfig.title;

      if (typeof exceptionResponse === 'string') {
        detail = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        const rawMessage = resp.message ?? exception.message;
        detail = Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage);
        errorCode = resp.errorCode as string | undefined;
        
        if (resp.errors && typeof resp.errors === 'object') {
          validationErrors = resp.errors as Record<string, string[]>;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `[${requestId}] Unhandled error: ${exception.message}`,
        IS_PRODUCTION ? undefined : exception.stack,
      );
    } else {
      this.logger.error(`[${requestId}] Unknown exception`, exception);
    }

    this.logger.error(
      `[${requestId}] ${request?.method ?? 'UNKNOWN'} ${request?.url ?? ''} → ${status}`,
      IS_PRODUCTION
        ? undefined
        : exception instanceof Error
          ? exception.stack
          : String(exception),
    );

    const problemDetails: ProblemDetails = {
      type,
      title,
      status,
      detail: Array.isArray(detail) ? detail.join(', ') : detail,
      instance: request?.url ?? '',
      requestId,
      timestamp: new Date().toISOString(),
    };

    if (errorCode) {
      problemDetails.errorCode = errorCode;
    }

    if (validationErrors) {
      problemDetails.validationErrors = validationErrors;
    }

    if (!IS_PRODUCTION && exception instanceof Error) {
      problemDetails.stack = exception.stack;
    }

    response.status(status).json(problemDetails);
  }
}
