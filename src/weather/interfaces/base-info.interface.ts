export interface BaseInfo {
  // Location information
  lat: number; // e.g., 52.37
  lon: number; // e.g., 4.9
  location_name?: string; // e.g., "Rotterdam"
  location_id?: number; // e.g., "1234567890"
  country?: string; // Country code
  timezone?: string; // Time zone like "Europe/Amsterdam"
  timezone_offset?: number; // Timezone offset in seconds

  // Date and time information
  date: string; // Format: "YYYY-MM-DD"
  datetime?: number; // Unix timestamp
  sunrise?: number; // Unix timestamp
  sunset?: number; // Unix timestamp

  // Units
  units: string; // e.g., "metric", "imperial", "standard"
}
