/**
 * PostgresStorageProvider — Layer 8: Actual database persistence
 * 
 * [DEF-004] Part of the over-engineered 8-layer ingestion pipeline.
 * This layer does the actual INSERT query — everything above it is indirection.
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { MetricDataPoint } from '../models/MetricDataPoint.js';
import logger from '../utils/logger.js';

export interface StorageResult {
  success: boolean;
  dataPoint: MetricDataPoint;
}

export class PostgresStorageProvider {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Insert a metric data point into PostgreSQL.
   * Returns the persisted record with generated id and created_at.
   */
  async store(data: {
    metric_name: string;
    value: number;
    timestamp: Date;
  }): Promise<StorageResult> {
    const id = uuidv4();
    logger.debug(`PostgresStorageProvider: Storing data point ${id}`);

    try {
      const result = await this.pool.query(
        `INSERT INTO metric_data_points (id, metric_name, value, timestamp)
         VALUES ($1, $2, $3, $4)
         RETURNING id, metric_name, value, timestamp, created_at`,
        [id, data.metric_name, data.value, data.timestamp],
      );

      const row = result.rows[0];
      const dataPoint: MetricDataPoint = {
        id: row.id,
        metric_name: row.metric_name,
        value: row.value,
        timestamp: row.timestamp,
        created_at: row.created_at,
      };

      logger.debug(`PostgresStorageProvider: Stored data point ${id} successfully`);
      return { success: true, dataPoint };
    } catch (error) {
      logger.error('PostgresStorageProvider: Failed to store data point:', (error as Error).message);
      throw new PostgresStorageError(
        `Failed to store metric data point: ${(error as Error).message}`,
        error as Error,
      );
    }
  }

  /**
   * Query metric data points by name and time range.
   * Used by the aggregation query path (US2).
   */
  async queryByTimeRange(
    metricName: string,
    start: Date,
    end: Date,
  ): Promise<MetricDataPoint[]> {
    logger.debug(`PostgresStorageProvider: Querying ${metricName} from ${start.toISOString()} to ${end.toISOString()}`);

    try {
      const result = await this.pool.query(
        `SELECT id, metric_name, value, timestamp, created_at
         FROM metric_data_points
         WHERE metric_name = $1 AND timestamp >= $2 AND timestamp <= $3
         ORDER BY timestamp ASC`,
        [metricName, start, end],
      );

      return result.rows.map((row) => ({
        id: row.id,
        metric_name: row.metric_name,
        value: row.value,
        timestamp: row.timestamp,
        created_at: row.created_at,
      }));
    } catch (error) {
      logger.error('PostgresStorageProvider: Query failed:', (error as Error).message);
      throw new PostgresStorageError(
        `Failed to query metric data points: ${(error as Error).message}`,
        error as Error,
      );
    }
  }
}

/**
 * Custom error type for Layer 8.
 * Each layer wraps errors from below in its own type [DEF-004].
 */
export class PostgresStorageError extends Error {
  public readonly cause: Error;

  constructor(message: string, cause: Error) {
    super(message);
    this.name = 'PostgresStorageError';
    this.cause = cause;
  }
}
