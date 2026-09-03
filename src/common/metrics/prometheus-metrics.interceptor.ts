import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrometheusMetricsService } from './prometheus.metrics';

@Injectable()
export class PrometheusMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: PrometheusMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    if (!req?.method || !req?.url) {
      return next.handle();
    }

    const method = req.method;
    const route = this.normalizeRoute(req.route?.path || req.url);

    this.metrics.incrementHttpInFlight(method, route);
    const startTime = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = res?.statusCode || 200;
          const durationSeconds = Number(process.hrtime.bigint() - startTime) / 1e9;
          this.metrics.incrementHttpRequest(method, route, statusCode);
          this.metrics.observeHttpRequestDuration(method, route, statusCode, durationSeconds);
          this.metrics.decrementHttpInFlight(method, route);
        },
        error: (error) => {
          const statusCode = error?.status || 500;
          const durationSeconds = Number(process.hrtime.bigint() - startTime) / 1e9;
          this.metrics.incrementHttpRequest(method, route, statusCode);
          this.metrics.observeHttpRequestDuration(method, route, statusCode, durationSeconds);
          this.metrics.decrementHttpInFlight(method, route);
          this.metrics.incrementErrors('http_error', route);
        },
      }),
    );
  }

  private normalizeRoute(path: string): string {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9]{24}/gi, '/:id');
  }
}