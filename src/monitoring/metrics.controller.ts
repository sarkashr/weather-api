import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';

/**
 * Controller that exposes Prometheus metrics endpoint
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Endpoint that returns Prometheus metrics
   */
  @Get()
  @Header('Content-Type', 'text/plain')
  async getMetrics(@Res() res: Response): Promise<void> {
    const metrics = await this.metricsService.getMetricsRegistry().metrics();
    res.send(metrics);
  }
}
