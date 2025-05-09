// Interface for the OpenWeatherMap One Call API 3.0 Day Summary response
export interface OWMv3DaySummaryResponse {
  lat: number;
  lon: number;
  tz: string; // Time zone like "+02:00"
  date: string; // Format: "YYYY-MM-DD"
  units: string; // e.g., "standard", "metric"
  cloud_cover: {
    afternoon: number;
  };
  humidity: {
    afternoon: number;
  };
  precipitation: {
    total: number;
  };
  pressure: {
    afternoon: number;
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
      speed: number;
      direction: number;
    };
  };
}
