import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { CitiesModule } from './cities/cities.module';
import { WeatherModule } from './weather/weather.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    CitiesModule,
    WeatherModule,
    TasksModule,
  ],
})
export class AppModule {}
