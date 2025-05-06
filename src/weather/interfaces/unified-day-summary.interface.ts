import { BaseInfo } from './base-info.interface';

export interface UnifiedDaySummary extends BaseInfo {
  cloud_cover: {
    afternoon: number; // Cloudiness, %
  };
  humidity: {
    afternoon: number; // Humidity, %
  };
  precipitation: {
    total: number; // Total precipitation, mm
  };
  pressure: {
    afternoon: number; // Atmospheric pressure on the sea level, hPa
  };
  temperature: {
    min: number;
    max: number;
    afternoon: number;
    night: number;
    evening: number;
    morning: number;
  };
  wind: {
    max: {
      speed: number; // Maximum wind speed, m/s
      direction: number; // Maximum wind direction, degrees (meteorological)
    };
  };
}
