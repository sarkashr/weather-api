import { Injectable, Logger, Inject } from '@nestjs/common';

import { City } from 'generated/prisma';
import { WEATHER_SERVICE } from './constants';
import { UnifiedCurrentWeather, UnifiedDaySummary } from './interfaces';
import { BaseWeatherProvider } from './providers';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(@Inject(WEATHER_SERVICE) private readonly weatherProvider: BaseWeatherProvider) {
    this.logger.log(`Weather service initialized with: ${weatherProvider.constructor.name}`);
  }

  /**
   * Get current weather for a city
   */
  async getCurrentWeather(city: City): Promise<UnifiedCurrentWeather> {
    this.logger.log(`Requesting current weather for ${city.name}`);
    return this.weatherProvider.getCurrentWeather(city);
  }

  /**
   * Get historical weather data for the last 7 days
   */
  async getLast7DaysWeather(city: City): Promise<UnifiedDaySummary[]> {
    this.logger.log(`Requesting last 7 days weather for ${city.name}`);
    return this.weatherProvider.getLast7DaysWeather(city);
  }
}
