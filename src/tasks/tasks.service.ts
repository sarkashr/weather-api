import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class TasksService implements OnModuleInit {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
  ) {}

  /**
   * Run once when the application starts
   * Using NestJS lifecycle hook for initialization
   */
  async onModuleInit() {
    this.logger.log('Running initial weather update');
    try {
      await this.updateWeatherData();
    } catch (error) {
      this.logger.error(
        'Error during initial weather update',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Run at 30 minutes past every hour to update weather data
   */
  @Cron('30 * * * *', { name: 'hourlyUpdate', timeZone: 'Europe/Amsterdam' })
  async handleHourlyUpdate() {
    this.logger.log('Running scheduled weather update');
    try {
      await this.updateWeatherData();
    } catch (error) {
      this.logger.error(
        'Error during scheduled weather update',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Updates weather data for all cities in the database
   * This method is called every hour by the interval timer
   */
  private async updateWeatherData(): Promise<void> {
    this.logger.log('Starting hourly weather data update for all cities...');

    try {
      // Get all cities from the database
      const cities = await this.prisma.city.findMany();

      this.logger.log(`Found ${cities.length} cities to update`);

      // Update each city's weather data
      for (const city of cities) {
        try {
          // Get fresh weather data
          const weatherData = await this.weatherService.getCurrentWeather(city.name);

          // Update weather data for the city
          await this.prisma.city.update({
            where: { id: city.id },
            data: {
              weatherData: {
                delete: true, // Delete any existing record
                create: {
                  temp: weatherData.main.temp,
                  feels_like: weatherData.main.feels_like,
                  humidity: weatherData.main.humidity,
                  mainData: JSON.parse(JSON.stringify(weatherData)) as Prisma.InputJsonValue,
                },
              },
            },
          });

          this.logger.log(`Updated weather data for city: ${city.name} (ID: ${city.id})`);
        } catch (error: unknown) {
          // Log error but continue with other cities
          this.logger.error(
            `Failed to update weather for city: ${city.name} (ID: ${city.id})`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      this.logger.log('Completed hourly weather data update');
    } catch (error: unknown) {
      this.logger.error(
        'Error during hourly weather update',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
