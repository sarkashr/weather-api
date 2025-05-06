import { Injectable } from '@nestjs/common';
import { Counter, collectDefaultMetrics, register } from 'prom-client';

/**
 * Service for managing application metrics using Prometheus
 */
@Injectable()
export class MetricsService {
  // Cache hit counter
  public readonly cacheHitCounter = new Counter({
    name: 'weather_cache_hits_total',
    help: 'Total number of cache hits for current weather',
  });

  // Cache miss counter
  public readonly cacheMissCounter = new Counter({
    name: 'weather_cache_misses_total',
    help: 'Total number of cache misses for current weather',
  });

  constructor() {
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics();
  }

  /**
   * Get the Prometheus metrics registry
   */
  getMetricsRegistry() {
    return register;
  }
}
