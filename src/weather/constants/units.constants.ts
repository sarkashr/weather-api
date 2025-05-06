/**
 * Measurement units supported by weather providers
 */
export enum MeasurementUnits {
  METRIC = 'metric',
  IMPERIAL = 'imperial',
  STANDARD = 'standard',
}

/**
 * Default measurement unit to use if not specified
 */
export const DEFAULT_MEASUREMENT_UNIT = MeasurementUnits.METRIC;
