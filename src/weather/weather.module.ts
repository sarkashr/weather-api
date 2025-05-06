import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { WeatherService } from './weather.service';
import { WEATHER_SERVICE } from './constants';
import { MonitoringModule } from '../monitoring';

// Import provider implementations
// CHANGE THIS LINE to select a different provider:
// import { OpenWeatherMapV2Service, GeocodingService } from './providers/openweathermap';
import { OpenWeatherMapV3Service, GeocodingService } from './providers/openweathermap';

@Module({
  imports: [ConfigModule, MonitoringModule],
  providers: [
    // Regular service exports
    WeatherService,
    GeocodingService,
    // Weather provider registration
    // To change providers, simply change the useClass value
    {
      provide: WEATHER_SERVICE,
      // useClass: OpenWeatherMapV2Service,
      useClass: OpenWeatherMapV3Service,
    },
  ],
  exports: [WeatherService, GeocodingService],
})
export class WeatherModule {}
