import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();

    // Skip file/stream responses
    if (
      response.headersSent ||
      response.getHeader('Content-Type')?.toString().includes('octet-stream')
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        success: true,
        message: 'OK',
        data: data ?? null,
      })),
    );
  }
}
