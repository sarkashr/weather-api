import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { redisStore } from 'cache-manager-redis-store';

import { CitiesModule } from './cities/cities.module';
import { WeatherModule } from './weather/weather.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>('REDIS_HOST'),
        port: configService.get<number>('REDIS_PORT'),
        ttl: configService.get<number>('CACHE_TTL_SECONDS')!,
      }),
      inject: [ConfigService],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    CitiesModule,
    WeatherModule,
    TasksModule,
  ],
})
export class AppModule {}
