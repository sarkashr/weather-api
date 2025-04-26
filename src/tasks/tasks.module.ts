import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { WeatherModule } from '../weather/weather.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [WeatherModule, PrismaModule],
  providers: [TasksService],
})
export class TasksModule {}
