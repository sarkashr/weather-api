// Simplified interface with only selected fields from the OpenWeatherMap response
export interface SimplifiedDayWeather {
  date: string; // Format: "YYYY-MM-DD"
  units: string; // e.g., "standard", "metric"
  temperature: {
    min: number;
    max: number;
  };
  humidity: {
    afternoon: number;
  };
  pressure: {
    afternoon: number;
  };
}
