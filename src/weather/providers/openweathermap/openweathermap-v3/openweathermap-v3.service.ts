import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

import { BaseOpenWeatherMapProvider } from '..';
import { GeocodingService } from '../geocoding';
import { City } from 'generated/prisma';
import { UnifiedCurrentWeather, UnifiedDaySummary } from 'src/weather/interfaces';
import { OWMv3CurrentWeatherResponse, OWMv3DaySummaryResponse } from './interfaces';
import { MetricsService } from 'src/monitoring';
import { MeasurementUnits } from 'src/weather/constants';

@Injectable()
export class OpenWeatherMapV3Service extends BaseOpenWeatherMapProvider {
  protected override readonly baseUrl = 'https://api.openweathermap.org/data/3.0/onecall';

  constructor(
    private geocodingService: GeocodingService,
    configService: ConfigService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    metricsService: MetricsService,
  ) {
    super('OpenWeatherMapV3Service', configService, cacheManager, metricsService);
  }

  /**
   * Get current weather for a city
   */
  async getCurrentWeather(city: City): Promise<UnifiedCurrentWeather> {
    // Check cache first
    const cacheKey = this.createCacheKey('v3', city.name);
    const cached = await this.checkCache<UnifiedCurrentWeather>(cacheKey, city.name);
    if (cached) {
      return cached;
    }

    try {
      // Get geocoding data first using the geocoding service
      const geocodingData = await this.geocodingService.getCoordinates(city.name);

      // Use base class API request method
      const maxRetries = this.configService.get<number>('API_MAX_RETRIES') ?? 3;
      const response = await this.makeApiRequest<OWMv3CurrentWeatherResponse>(
        `${this.baseUrl}`,
        {
          lat: geocodingData.lat,
          lon: geocodingData.lon,
          appid: this.apiKey,
          exclude: 'minutely,hourly,daily,alerts',
          units: MeasurementUnits.METRIC,
        },
        maxRetries,
      );

      const v3Data = response.data;

      // Transform to UnifiedCurrentWeather format
      const data: UnifiedCurrentWeather = {
        lat: geocodingData.lat,
        lon: geocodingData.lon,
        location_name: city.name,
        location_id: city.id,
        country: geocodingData.country,
        timezone: v3Data.timezone,
        timezone_offset: v3Data.timezone_offset,
        date: new Date().toISOString().split('T')[0] || '',
        datetime: v3Data.current.dt,
        sunrise: v3Data.current.sunrise,
        sunset: v3Data.current.sunset,
        units: MeasurementUnits.METRIC,
        temp: v3Data.current.temp,
        feels_like: v3Data.current.feels_like,
        pressure: v3Data.current.pressure,
        humidity: v3Data.current.humidity,
        dew_point: v3Data.current.dew_point || 0,
        uvi: v3Data.current.uvi || 0,
        clouds: v3Data.current.clouds,
        visibility: v3Data.current.visibility,
        wind_speed: v3Data.current.wind_speed,
        wind_deg: v3Data.current.wind_deg,
        weather:
          v3Data.current.weather && v3Data.current.weather.length > 0
            ? v3Data.current.weather
            : [
                {
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
   * Uses OpenWeatherMap's One Call API 3.0 endpoint with day_summary feature
   */
  async getLast7DaysWeather(city: City): Promise<UnifiedDaySummary[]> {
    // Check cache first
    const cacheKey = this.createCacheKey('last7days', city.name);
    const cached = await this.checkCache<UnifiedDaySummary[]>(cacheKey, city.name);
    if (cached) {
      return cached;
    }

    try {
      // Get the dates for the last 7 days
      const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0]!;
      });

      // Get geocoding data first using the geocoding service
      const geocodingData = await this.geocodingService.getCoordinates(city.name);

      // Fetch data for each day in parallel with retry and backoff
      const maxRetries = this.configService.get<number>('API_MAX_RETRIES') ?? 3;
      const responses = await Promise.all(
        dates.map(async (date) => {
          try {
            const response = await this.makeApiRequest<OWMv3DaySummaryResponse>(
              `${this.baseUrl}/day_summary`,
              {
                lat: geocodingData.lat,
                lon: geocodingData.lon,
                appid: this.apiKey,
                date,
                units: MeasurementUnits.METRIC,
              },
              maxRetries,
            );
            if (response && response.data) {
              return response.data;
            }
            return null;
          } catch {
            this.logger.warn(`Failed to fetch weather for date ${date}`);
            return null; // Return null for failed requests
          }
        }),
      );

      // Build a response that combines 7 days of historical data
      const result: UnifiedDaySummary[] = [];

      // Process responses and add to result
      responses.forEach((data) => {
        if (data) {
          const transformedData: UnifiedDaySummary = {
            lat: geocodingData.lat,
            lon: geocodingData.lon,
            location_name: city.name,
            location_id: city.id,
            country: geocodingData.country,
            timezone: 'UTC',
            timezone_offset: 0,
            date: data.date,
            datetime: Math.floor(new Date(data.date).getTime() / 1000),
            sunrise: 0, // Not provided in day summary
            sunset: 0, // Not provided in day summary
            units: data.units,
            temperature: {
              min: data.temperature?.min || 0,
              max: data.temperature?.max || 0,
              afternoon: data.temperature?.afternoon || 0,
              night: data.temperature?.night || 0,
              evening: data.temperature?.afternoon || 0, // Using afternoon as fallback
              morning: data.temperature?.morning || 0,
            },
            pressure: {
              afternoon: data.pressure?.afternoon || 0,
            },
            humidity: {
              afternoon: data.humidity?.afternoon || 0,
            },
            cloud_cover: {
              afternoon: data.cloud_cover?.afternoon || 0,
            },
            precipitation: {
              total: data.precipitation?.total || 0,
            },
            wind: {
              max: {
                speed: data.wind?.max?.speed || 0,
                direction: data.wind?.max?.direction || 0,
              },
            },
          };
          result.push(transformedData);
        }
      });
      // Cache the data
      await this.cacheData(cacheKey, result);
      return result;
    } catch (error) {
      // Use base class error handling
      return this.handleApiError<UnifiedDaySummary[]>(
        error,
        city,
        cacheKey,
        this.getDefaultLast7DaysWeatherResponse.bind(this),
      );
    }
  }
}
