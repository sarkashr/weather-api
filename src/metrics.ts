import { Counter, collectDefaultMetrics, register } from 'prom-client';

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics();

// Cache hit counter
export const cacheHitCounter = new Counter({
  name: 'weather_cache_hits_total',
  help: 'Total number of cache hits for current weather',
});

// Cache miss counter
export const cacheMissCounter = new Counter({
  name: 'weather_cache_misses_total',
  help: 'Total number of cache misses for current weather',
});

// Export registry for metrics endpoint
export { register };
