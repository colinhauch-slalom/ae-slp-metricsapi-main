/**
 * MetricDataPoint — Core entity interface
 * 
 * Represents a single time-series observation that has been ingested
 * via the POST /v1/metrics endpoint.
 */

export interface MetricDataPoint {
  /** UUID primary key, auto-generated on insert */
  id: string;

  /** Dot-notation metric identifier (e.g., "cpu.usage", "http.requests.count") */
  metric_name: string;

  /** Numeric observation value (must be finite) */
  value: number;

  /** When the observation was recorded (ISO 8601 or epoch ms on input) */
  timestamp: Date;

  /** When the record was persisted to the database */
  created_at: Date;
}

/**
 * Input shape for creating a new data point.
 * The id and created_at fields are generated server-side.
 */
export interface CreateMetricDataPointInput {
  name: string;
  value: number;
  timestamp: string | number;
}

export default MetricDataPoint;
