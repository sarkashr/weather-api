import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as CircuitBreaker from 'opossum';

import { BaseWeatherProvider } from '..';
import { City } from 'generated/prisma';
import { MetricsService } from 'src/monitoring';
import { retryWithExponentialBackoff } from 'src/common/utils';

/**
 * Base class for OpenWeatherMap API providers with shared functionality
 */
export abstract class BaseOpenWeatherMapProvider extends BaseWeatherProvider {
  protected readonly apiKey: string;
  protected readonly baseUrl: string;

  // Opossum circuit breaker for all axios API calls
  protected readonly breaker: CircuitBreaker;

  constructor(
    serviceName: string,
    protected readonly configService: ConfigService,
    protected readonly cacheManager: Cache,
    protected readonly metricsService: MetricsService,
  ) {
    super(serviceName);

    // Get API key from environment variables with fallback to empty string
    const apiKey = this.configService.get<string>('OPENWEATHER_API_KEY');
    this.apiKey = apiKey || '';

    if (!this.apiKey) {
      this.logger.warn(
        'OPENWEATHER_API_KEY not found in environment variables. Weather API calls will fail.',
      );
    }

    // Initialize circuit breaker with standard configuration
    this.breaker = new CircuitBreaker((config: AxiosRequestConfig) => axios(config), {
      timeout: 5000, // 5 seconds
      errorThresholdPercentage: 50, // Open if 50% fail
      resetTimeout: 10000, // Try again after 10 seconds
    });
  }

  /**
   * Makes an API request with retry and circuit breaker protection
   */
  protected async makeApiRequest<T>(
    url: string,
    params: Record<string, any>,
    maxRetries: number = 3,
  ): Promise<AxiosResponse<T>> {
    // Use an explicit cast to handle the type issue with circuit breaker
    const response = await retryWithExponentialBackoff(
      () =>
        this.breaker.fire({
          method: 'get',
          url,
          params,
        }),
      maxRetries,
      500, // Initial retry delay in ms
      2, // Backoff factor
      this.logger,
    );

    // Cast the response to the expected type
    return response as AxiosResponse<T>;
  }

  /**
   * Creates a standardized cache key
   */
  protected createCacheKey(prefix: string, cityName: string): string {
    return `weather:${prefix}:${cityName.toLowerCase()}`;
  }

  /**
   * Handles cache lookup with metrics tracking
   */
  protected async checkCache<T>(cacheKey: string, cityName: string): Promise<T | null> {
    const cached = await this.cacheManager.get<T>(cacheKey);

    if (cached) {
      this.logger.log(`Cache hit for ${cityName}`);
      this.metricsService.cacheHitCounter.inc();
      return cached;
    }

    this.logger.log(`Cache miss for ${cityName}`);
    this.metricsService.cacheMissCounter.inc();
    return null;
  }

  /**
   * Stores data in cache with TTL from config
   */
  protected async cacheData<T>(cacheKey: string, data: T): Promise<void> {
    const ttl = this.configService.get<number>('CACHE_TTL_SECONDS')!;
    await this.cacheManager.set(cacheKey, data, ttl);
  }

  /**
   * Common error handling logic for API requests
   */
  protected async handleApiError<T>(
    error: any,
    city: City,
    cacheKey: string,
    getDefaultResponse: (city: City) => T,
  ): Promise<T> {
    const axiosError = error as AxiosError;

    // Check if this is a 'city not found' error
    if (axiosError.response?.status === 404) {
      interface ErrorResponse {
        cod?: string;
        message?: string;
      }

      const responseData = axiosError.response.data as ErrorResponse;
      if (
        typeof responseData.message === 'string' &&
        responseData.message.toLowerCase().includes('city not found')
      ) {
        this.logger.error(`City not found: ${city.name}`);
        throw new HttpException(`City not found: ${city.name}`, 404);
      }
    }

    // Handle other errors
    const errorMsg = axiosError.message || 'Unknown error';
    this.logger.error(`Failed to fetch weather for ${city.name}: ${errorMsg}`);

    // Fallback 1: Try to return stale cache if available
    const stale = await this.cacheManager.get<T>(cacheKey);
    if (stale) {
      this.logger.warn(`Returning stale cache for ${city.name} due to API failure.`);
      return stale;
    }

    // Fallback 2: Return static default response
    this.logger.warn(
      `Returning static default weather for ${city.name} due to API and cache failure.`,
    );
    return getDefaultResponse(city);
  }
}
