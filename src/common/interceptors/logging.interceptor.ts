import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as crypto from 'crypto';
import { StructuredLoggerService } from '../logger/structured-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new StructuredLoggerService();
  private static readonly loggerContext = 'HTTP';

  constructor() {
    this.logger.setContext('LoggingInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();

    if (!req?.method || !req?.url) {
      return next.handle();
    }

    const { method, url, ip } = req as { method: string; url: string; ip?: string };
    const userAgent = req.headers?.['user-agent'] as string | undefined;

    const requestId: string =
      (req.headers?.['x-request-id'] as string | undefined) ??
      crypto.randomUUID();
    req.requestId = requestId;

    const now = Date.now();

    this.logger.log(
      `${method} ${url} - Started`,
      LoggingInterceptor.loggerContext,
      { method, url, ip, userAgent },
      requestId,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const response = ctx.getResponse();
          const delay = Date.now() - now;
          this.logger.log(
            `${method} ${url} - ${response?.statusCode ?? '?'} — ${delay}ms`,
            LoggingInterceptor.loggerContext,
            { method, url, statusCode: response?.statusCode, durationMs: delay, ip },
            requestId,
          );
        },
        error: (error: Error) => {
          const delay = Date.now() - now;
          this.logger.error(
            `${method} ${url} - ERROR — ${delay}ms`,
            error?.stack,
            LoggingInterceptor.loggerContext,
            { method, url, error: error?.message, durationMs: delay, ip },
            requestId,
          );
        },
      }),
    );
  }
}
