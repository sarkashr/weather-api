import { Module } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { CitiesController } from './cities.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [PrismaModule, WeatherModule],
  controllers: [CitiesController],
  providers: [CitiesService],
})
export class CitiesModule {}
