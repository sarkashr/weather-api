import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { Prisma, City } from '../../generated/prisma';
import { WeatherService } from '../weather/weather.service';
import { Last7DaysWeatherResponse } from 'src/weather/interfaces/last-7-days-weather.interface';

@Injectable()
export class CitiesService {
  private readonly logger = new Logger(CitiesService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
  ) {}

  async create(name: string): Promise<City> {
    const existingCity = await this.prisma.city.findUnique({
      where: { name },
    });
    if (existingCity) {
      throw new ConflictException('City already exists');
    }

    // getCurrentWeather will throw HttpException if city not found
    const weatherData = await this.weatherService.getCurrentWeather(name);

    // If we got here, we have valid weather data
    return this.prisma.city.create({
      data: {
        id: weatherData.id, // Use OpenWeatherMap's city ID
        name,
        weatherData: {
          create: {
            temp: weatherData.main.temp,
            feels_like: weatherData.main.feels_like,
            humidity: weatherData.main.humidity,
            mainData: JSON.parse(JSON.stringify(weatherData)) as Prisma.InputJsonValue, // Convert to plain object for Prisma
          },
        },
      },
      include: {
        weatherData: {
          select: {
            temp: true,
            feels_like: true,
            humidity: true,
          },
        },
      },
    });
  }

  async findAll(options?: { fullWeatherData?: boolean }): Promise<City[]> {
    return await this.prisma.city.findMany({
      include: {
        weatherData: options?.fullWeatherData
          ? {
              select: {
                timestamp: true,
                mainData: true,
              },
            }
          : {
              select: {
                temp: true,
                feels_like: true,
                humidity: true,
              },
            }, // Only return basic weather data when fullWeatherData option is not set
      },
    });
  }

  private async findOne(id: number): Promise<City | null> {
    return this.prisma.city.findUnique({
      where: { id },
    });
  }

  async remove(id: number): Promise<City> {
    if (!(await this.findOne(id))) {
      throw new NotFoundException(`City with ID ${id} not found`);
    }

    return this.prisma.city.delete({
      where: { id },
    });
  }

  async findOneWithLast7DaysWeather(name: string): Promise<Last7DaysWeatherResponse> {
    try {
      // First check if the city exists in our database
      let city = await this.prisma.city.findUnique({ where: { name } });

      // If city doesn't exist in database then create a new city object using
      // getCurrentWeather() and pass it as parameter to getLast7DaysWeather()
      if (!city) {
        // getCurrentWeather will throw HttpException if city not found
        const weatherData = await this.weatherService.getCurrentWeather(name);
        city = { id: weatherData.id, name };
      }

      return await this.weatherService.getLast7DaysWeather(city);
    } catch (error) {
      this.logger.error(`Failed to get weather data for ${name}`, error);
      throw error;
    }
  }
}
