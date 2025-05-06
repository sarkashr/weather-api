import { Logger } from '@nestjs/common';

import { City } from 'generated/prisma';
import { UnifiedCurrentWeather, UnifiedDaySummary } from '../interfaces';

/**
 * Base abstract class for weather providers with shared functionality.
 * This serves as the primary abstraction for all weather provider implementations.
 */
export abstract class BaseWeatherProvider {
  protected readonly logger: Logger;

  constructor(serviceName: string) {
    this.logger = new Logger(serviceName);
  }

  /**
   * Get current weather for a city
   */
  abstract getCurrentWeather(city: City): Promise<UnifiedCurrentWeather>;

  /**
   * Get historical weather data for the last 7 days
   */
  abstract getLast7DaysWeather(city: City): Promise<UnifiedDaySummary[]>;

  /**
   * Returns a static default weather response for fallback purposes
   */
  protected getDefaultCurrentWeatherResponse(city: City): UnifiedCurrentWeather {
    return {
      lat: 0,
      lon: 0,
      location_name: city.name,
      country: 'N/A',
      timezone: 'UTC',
      timezone_offset: 0,
      date: new Date().toISOString().split('T')[0] || '',
      datetime: Math.floor(Date.now() / 1000),
      sunrise: 0,
      sunset: 0,
      units: 'metric',
      temp: 0,
      feels_like: 0,
      pressure: 0,
      humidity: 0,
      dew_point: 0,
      uvi: 0,
      clouds: 0,
      visibility: 0,
      wind_speed: 0,
      wind_deg: 0,
      weather: [
        {
          id: 0,
          main: 'Unavailable',
          description: 'Weather data unavailable',
          icon: '01d',
        },
      ],
    };
  }

  /**
   * Returns a default 7 day weather response for fallback purposes
   */
  protected getDefaultLast7DaysWeatherResponse(city: City): UnifiedDaySummary[] {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0] || '';
    });

    return last7Days.map((date) => {
      return {
        lat: 0,
        lon: 0,
        location_name: city.name,
        location_id: city.id,
        country: 'N/A',
        timezone: 'UTC',
        timezone_offset: 0,
        date: date,
        datetime: Math.floor(new Date(date || '').getTime() / 1000),
        sunrise: 0,
        sunset: 0,
        units: 'metric',
        cloud_cover: {
          afternoon: 0,
        },
        humidity: {
          afternoon: 0,
        },
        precipitation: {
          total: 0,
        },
        pressure: {
          afternoon: 0,
        },
        temperature: {
          min: 0,
          max: 0,
          afternoon: 0,
          night: 0,
          evening: 0,
          morning: 0,
        },
        wind: {
          max: {
            speed: 0,
            direction: 0,
          },
        },
      };
    });
  }
}
