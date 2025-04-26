import { Injectable, Logger, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

import { CurrentWeatherResponse } from './interfaces/current-weather.interface';
import { DaySummaryResponse } from './interfaces/day-summary.interface';
import { Last7DaysWeatherResponse } from './interfaces/last-7-days-weather.interface';
import { SimplifiedDayWeather } from './interfaces/simplified-day-weather.interface';
import { City } from 'generated/prisma';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';
  private readonly oneCallBaseUrl = 'https://api.openweathermap.org/data/3.0/onecall';

  constructor(private readonly configService: ConfigService) {
    // Get API key from environment variables with fallback to empty string
    const apiKey = this.configService.get<string>('OPENWEATHER_API_KEY');
    this.apiKey = apiKey || '';

    if (!apiKey) {
      this.logger.warn(
        'OPENWEATHER_API_KEY not found in environment variables. Weather API calls will fail.',
      );
    }
  }

  /**
   * Get current weather for a city
   */
  async getCurrentWeather(cityName: string): Promise<CurrentWeatherResponse> {
    try {
      const response = await axios.get<CurrentWeatherResponse>(`${this.baseUrl}/weather`, {
        params: {
          q: cityName,
          appid: this.apiKey,
          units: 'metric', // Use metric units by default
        },
      });

      return response.data;
    } catch (error) {
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
          this.logger.error(`City not found: ${cityName}`);
          throw new HttpException(`City not found: ${cityName}`, 404);
        }
      }

      // Handle other errors
      const errorMsg = axiosError.message || 'Unknown error';
      this.logger.error(`Failed to fetch weather for ${cityName}: ${errorMsg}`);
      throw new HttpException(
        `Failed to get weather for ${cityName}: ${errorMsg}`,
        axiosError.response?.status || 500,
      );
    }
  }

  /**
   * Get coordinates for a city name
   * This is useful for APIs that require lat/lon instead of city name
   */
  async getCoordinatesForCity(cityName: string): Promise<{ lat: number; lon: number }> {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: cityName,
          appid: this.apiKey,
        },
      });

      const weatherData = response.data as CurrentWeatherResponse;

      if (!weatherData?.coord?.lat || !weatherData?.coord?.lon) {
        throw new Error(`Invalid response format for city ${cityName}`);
      }

      return {
        lat: weatherData.coord.lat,
        lon: weatherData.coord.lon,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMsg = axiosError.message || 'Unknown error';
      this.logger.error(`Failed to fetch coordinates for ${cityName}: ${errorMsg}`);
      throw new HttpException(
        `Failed to get coordinates for ${cityName}: ${errorMsg}`,
        axiosError.response?.status || 500,
      );
    }
  }

  /**
   * Get historical weather data for the last 7 days
   * Uses OpenWeatherMap's One Call API 3.0 endpoint with day_summary feature
   */
  async getLast7DaysWeather(city: City): Promise<Last7DaysWeatherResponse> {
    try {
      // Get the dates for the last 7 days
      const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0]!;
      });

      // Get coordinates for the city
      const coords = await this.getCoordinatesForCity(city.name);

      // Fetch data for each day in parallel
      const responses = await Promise.all(
        dates.map((date) =>
          axios
            .get<DaySummaryResponse>(`${this.oneCallBaseUrl}/day_summary`, {
              params: {
                lat: coords.lat,
                lon: coords.lon,
                date,
                units: 'metric',
                appid: this.apiKey,
              },
            })
            .catch(() => {
              this.logger.warn(`Failed to fetch weather for date ${date}`);
              return null; // Return null for failed requests
            }),
        ),
      );

      // Build a response that combines 7 days of historical data
      const result: Last7DaysWeatherResponse = {
        id: city.id,
        name: city.name,
        dailyData: [],
      };

      // Process responses and add to result
      responses.forEach((response) => {
        if (response && response.data) {
          // Create a SimplifiedDayWeather object with only the requested fields
          const simplifiedData: SimplifiedDayWeather = {
            date: response.data.date,
            units: response.data.units,
            temperature: {
              min: response.data.temperature.min,
              max: response.data.temperature.max,
            },
            humidity: {
              afternoon: response.data.humidity.afternoon,
            },
            pressure: {
              afternoon: response.data.pressure.afternoon,
            },
          };
          result.dailyData.push(simplifiedData);
        }
      });

      return result;
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMsg = axiosError.message || 'Unknown error';

      this.logger.error(`Failed to fetch weekly weather summary: ${errorMsg}`);
      throw new HttpException(
        `Failed to get weekly weather summary: ${errorMsg}`,
        axiosError.response?.status || 500,
      );
    }
  }
}
