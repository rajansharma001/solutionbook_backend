import { Module, Global } from '@nestjs/common';
import { PrometheusMetricsService } from './prometheus.metrics';
import { PrometheusMetricsInterceptor } from './prometheus-metrics.interceptor';
import { MetricsController } from './metrics.controller';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Global()
@Module({
  providers: [
    PrometheusMetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PrometheusMetricsInterceptor,
    },
  ],
  controllers: [MetricsController],
  exports: [PrometheusMetricsService],
})
export class PrometheusMetricsModule {}