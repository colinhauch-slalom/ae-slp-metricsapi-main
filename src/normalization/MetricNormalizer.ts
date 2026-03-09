/**
 * MetricNormalizer — Layer 4: Data normalization
 * 
 * [DEF-004] Part of the over-engineered 8-layer ingestion pipeline.
 * This layer normalizes timestamps (parsing ISO 8601 and epoch milliseconds)
 * and ensures values are stored as standard doubles. A few lines of parsing
 * elevated to an architectural layer with its own class and error type.
 */

import logger from '../utils/logger.js';

export interface NormalizedMetric {
  metric_name: string;
  value: number;
  timestamp: Date;
}

export class MetricNormalizer {
  /**
   * Normalize a raw metric input into a standard internal format.
   * - Converts timestamp strings/numbers to Date objects
   * - Ensures value is a standard number
   * - Trims and lowercases metric names
   */
  normalize(data: {
    name: string;
    value: number;
    timestamp: string | number;
  }): NormalizedMetric {
    logger.debug(`MetricNormalizer: Normalizing metric '${data.name}'`);

    try {
      // Normalize metric name
      const metricName = data.name.trim().toLowerCase();

      // Normalize timestamp
      const timestamp = this.normalizeTimestamp(data.timestamp);

      // Normalize value (ensure it's a plain number)
      const value = Number(data.value);

      const normalized: NormalizedMetric = {
        metric_name: metricName,
        value,
        timestamp,
      };

      logger.debug(`MetricNormalizer: Normalized metric '${metricName}' successfully`);
      return normalized;
    } catch (error) {
      if (error instanceof MetricNormalizerError) throw error;
      throw new MetricNormalizerError(
        `Failed to normalize metric '${data.name}': ${(error as Error).message}`,
        error as Error,
      );
    }
  }

  /**
   * Parse a timestamp string (ISO 8601) or number (epoch ms) into a Date.
   */
  private normalizeTimestamp(timestamp: string | number): Date {
    if (typeof timestamp === 'number') {
      // Assume epoch milliseconds
      if (timestamp <= 0) {
        throw new MetricNormalizerError(
          `Invalid epoch timestamp: ${timestamp} (must be positive)`,
        );
      }
      return new Date(timestamp);
    }

    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp);
      if (isNaN(parsed.getTime())) {
        throw new MetricNormalizerError(
          `Invalid timestamp format: '${timestamp}' (expected ISO 8601)`,
        );
      }
      return parsed;
    }

    throw new MetricNormalizerError(`Unsupported timestamp type: ${typeof timestamp}`);
  }
}

/**
 * Custom error type for Layer 4.
 */
export class MetricNormalizerError extends Error {
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'MetricNormalizerError';
    if (cause) this.cause = cause;
  }
}
