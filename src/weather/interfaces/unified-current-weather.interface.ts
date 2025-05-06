import { BaseInfo } from './base-info.interface';

export interface UnifiedCurrentWeather extends BaseInfo {
  // Temperature data
  temp: number; // Temperature
  feels_like: number; // Human perception of temperature

  // Atmospheric conditions
  pressure: number; // Atmospheric pressure on the sea level, hPa
  humidity: number; // Humidity, %
  dew_point?: number; // Atmospheric temperature below which water droplets begin to condense, °C or °F
  uvi?: number; // UV index
  clouds?: number; // Cloudiness, %
  visibility?: number; // Average visibility, metres

  // Wind information
  wind_speed?: number; // Wind speed
  wind_deg?: number; // Wind direction, degrees (meteorological)
  wind_gust?: number; // Wind gust speed

  // Weather conditions
  weather?: {
    id: number; // Weather condition id
    main: string; // Group of weather parameters (Rain, Snow, Clouds etc.)
    description: string; // Weather condition within the group
    icon: string; // Weather icon id
  }[];
}
