import { Injectable, Logger, HttpException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import * as CircuitBreaker from 'opossum';
import { retryWithExponentialBackoff } from 'src/common/utils';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly apiKey: string;
  private readonly breaker = new CircuitBreaker((config: AxiosRequestConfig) => axios(config), {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 10000,
  });

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    const apiKey = this.configService.get<string>('OPENWEATHER_API_KEY');
    this.apiKey = apiKey || '';
    if (!apiKey) {
      this.logger.warn('OPENWEATHER_API_KEY not found. Geocoding API calls will fail.');
    }
  }

  async getCoordinates(cityName: string): Promise<{ lat: number; lon: number; country: string }> {
    const cacheKey = `geo:${cityName.toLowerCase()}`;
    const cached = await this.cacheManager.get<{ lat: number; lon: number; country: string }>(
      cacheKey,
    );
    if (cached) {
      this.logger.log(`Geocoding cache hit for ${cityName}`);
      return cached;
    }
    this.logger.log(`Geocoding cache miss for ${cityName}`);
    try {
      const maxRetries = this.configService.get<number>('API_MAX_RETRIES') ?? 3;
      const response = await retryWithExponentialBackoff(
        () =>
          this.breaker.fire({
            method: 'get',
            url: 'http://api.openweathermap.org/geo/1.0/direct',
            params: { q: cityName, limit: 1, appid: this.apiKey },
          }),
        maxRetries,
        500,
        2,
        this.logger,
      );
      const data = response.data as { lat: number; lon: number; country: string }[];
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`No geocoding data found for ${cityName}`);
      }
      const { lat, lon, country } = data[0]!;
      const ttl = this.configService.get<number>('CACHE_TTL_SECONDS') ?? 3600;
      await this.cacheManager.set(cacheKey, { lat, lon, country }, ttl);
      return { lat, lon, country };
    } catch (error) {
      const axiosError = error as AxiosError;
      const message = axiosError.message || 'Unknown error';
      this.logger.error(`Failed to geocode ${cityName}: ${message}`);
      throw new HttpException(`Failed to geocode ${cityName}`, axiosError.response?.status || 500);
    }
  }
}
