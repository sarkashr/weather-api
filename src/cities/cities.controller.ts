import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { City } from '../../generated/prisma';
import { CreateCityDto } from './dto/create-city.dto';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Post()
  create(@Body() createCityDto: CreateCityDto): Promise<City> {
    return this.citiesService.create(createCityDto.name);
  }

  @Get()
  findAll(): Promise<City[]> {
    // Basic data for city listing
    return this.citiesService.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: number): Promise<City> {
    // Parse the ID to ensure it's a number
    return this.citiesService.remove(id);
  }

  @Get('weather')
  findAllWithWeather(): Promise<City[]> {
    // Full weather data for detailed weather information
    return this.citiesService.findAll({ fullWeatherData: true });
  }

  @Get(':name/weather')
  findOneWithWeather(@Param('name') name: string): Promise<City | null> {
    return this.citiesService.findOneWithLast7DaysWeather(name);
  }
}
