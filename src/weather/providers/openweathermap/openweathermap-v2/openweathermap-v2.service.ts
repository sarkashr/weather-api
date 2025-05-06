import { Injectable, Inject, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

import { BaseOpenWeatherMapProvider } from '..';
import { City } from 'generated/prisma';
import { UnifiedCurrentWeather, UnifiedDaySummary } from 'src/weather/interfaces';
import { OWMv2CurrentWeatherResponse } from './interfaces';
import { MetricsService } from 'src/monitoring';
import { MeasurementUnits } from 'src/weather/constants';

@Injectable()
export class OpenWeatherMapV2Service extends BaseOpenWeatherMapProvider {
  protected override readonly baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(
    configService: ConfigService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    metricsService: MetricsService,
  ) {
    super('OpenWeatherMapV2Service', configService, cacheManager, metricsService);
  }

  /**
   * Get current weather for a city
   */
  async getCurrentWeather(city: City): Promise<UnifiedCurrentWeather> {
    // Check cache first
    const cacheKey = this.createCacheKey('v2', city.name);
    const cached = await this.checkCache<UnifiedCurrentWeather>(cacheKey, city.name);
    if (cached) {
      return cached;
    }

    try {
      // Use base class API request method
      const maxRetries = this.configService.get<number>('API_MAX_RETRIES') ?? 3;
      const response = await this.makeApiRequest<OWMv2CurrentWeatherResponse>(
        `${this.baseUrl}/weather`,
        {
          q: city.name,
          appid: this.apiKey,
          units: MeasurementUnits.METRIC,
        },
        maxRetries,
      );

      const v2Data = response.data;

      // Transform to UnifiedCurrentWeather format
      const data: UnifiedCurrentWeather = {
        lat: v2Data.coord.lat,
        lon: v2Data.coord.lon,
        location_name: city.name,
        location_id: city.id,
        country: v2Data.sys.country,
        timezone: 'N/A',
        timezone_offset: 0,
        date: new Date().toISOString().split('T')[0] || '',
        datetime: v2Data.dt,
        sunrise: v2Data.sys.sunrise,
        sunset: v2Data.sys.sunset,
        units: MeasurementUnits.METRIC,
        temp: v2Data.main.temp,
        feels_like: v2Data.main.feels_like,
        pressure: v2Data.main.pressure,
        humidity: v2Data.main.humidity,
        dew_point: 0,
        uvi: 0,
        clouds: v2Data.clouds.all,
        visibility: v2Data.visibility,
        wind_speed: v2Data.wind.speed,
        wind_deg: v2Data.wind.deg,
        weather: [
          v2Data.weather && v2Data.weather.length > 0
            ? v2Data.weather[0]!
            : {
                id: 0,
                main: 'Unknown',
                description: 'Weather data unavailable',
                icon: '01d',
              },
        ],
      };

      // Cache the data
      await this.cacheData(cacheKey, data);
      return data;
    } catch (error) {
      // Use base class error handling
      return this.handleApiError<UnifiedCurrentWeather>(
        error,
        city,
        cacheKey,
        this.getDefaultCurrentWeatherResponse.bind(this),
      );
    }
  }

  /**
   * Get historical weather data for the last 7 days
   * Note: OpenWeatherMap v2.5 doesn't support historical data directly,
   * but we're keeping this interface consistent with the abstract class.
   * This implementation will throw an error since it's not supported
   * in the v2.5 API.
   */
  // Using underscore prefix to indicate intentionally unused parameter
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getLast7DaysWeather(_city: City): Promise<UnifiedDaySummary[]> {
    this.logger.error(`getLast7DaysWeather not supported in OpenWeatherMap v2.5 API`);
    // We need to use await here to satisfy the linter, even though we're just throwing an error
    await Promise.resolve();
    throw new HttpException(
      'Historical weather data not available in this API version',
      501, // Not Implemented
    );
  }
}
