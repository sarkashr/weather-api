import { SimplifiedDayWeather } from './simplified-day-weather.interface';

// Combined results from multiple day summaries
export interface Last7DaysWeatherResponse {
  id: number;
  name: string;
  dailyData: SimplifiedDayWeather[];
}
