import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrometheusMetricsService } from './prometheus.metrics';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: PrometheusMetricsService) {}

  @Get()
  async getMetrics(@Res() res: Response): Promise<void> {
    try {
      const metrics = await this.metrics.getMetrics();
      const contentType = await this.metrics.getContentType();
      res.set('Content-Type', contentType);
      res.send(metrics);
    } catch (error) {
      res.status(500).send('Failed to generate metrics');
    }
  }
}