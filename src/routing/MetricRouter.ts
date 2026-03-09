/**
 * MetricRouter — Layer 6: Storage strategy picker
 * 
 * [DEF-004] Part of the over-engineered 8-layer ingestion pipeline.
 * This layer "picks" which storage backend to use — except there is only one
 * (Postgres) and it always picks it. The strategy pattern with one strategy.
 * 
 * NOTE: This is NOT an Express router. It's a "routing" layer that decides
 * where data goes (always Postgres).
 */

import { MetricDataPoint } from '../models/MetricDataPoint.js';
import { StorageAdapter, StorageAdapterError } from '../storage/StorageAdapter.js';
import { StorageResult } from '../storage/PostgresStorageProvider.js';
import logger from '../utils/logger.js';

export type StorageStrategy = 'postgres' | 'timescaledb' | 'influxdb';

export class MetricRouter {
  private storageAdapter: StorageAdapter;
  private strategy: StorageStrategy;

  constructor(storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter;
    // Always picks Postgres — the other strategies are phantom options
    this.strategy = 'postgres';
  }

  /**
   * Route the metric data to the appropriate storage backend.
   * (Always routes to Postgres via StorageAdapter.)
   */
  async route(data: {
    metric_name: string;
    value: number;
    timestamp: Date;
  }): Promise<StorageResult> {
    logger.debug(`MetricRouter: Routing to storage strategy '${this.strategy}'`);

    try {
      // "Select" the strategy — there's only one
      switch (this.strategy) {
        case 'postgres':
          return await this.storageAdapter.persist(data);
        case 'timescaledb':
        case 'influxdb':
        default:
          // These strategies don't exist but the code path is here
          logger.warn(`MetricRouter: Unknown strategy '${this.strategy}', falling back to postgres`);
          return await this.storageAdapter.persist(data);
      }
    } catch (error) {
      throw new MetricRouterError(
        `MetricRouter failed to route metric: ${(error as Error).message}`,
        error as Error,
      );
    }
  }

  /**
   * Query metrics through the storage adapter.
   */
  async query(
    metricName: string,
    start: Date,
    end: Date,
  ): Promise<MetricDataPoint[]> {
    logger.debug(`MetricRouter: Routing query for '${metricName}' to '${this.strategy}'`);

    try {
      return await this.storageAdapter.query(metricName, start, end);
    } catch (error) {
      throw new MetricRouterError(
        `MetricRouter failed to route query: ${(error as Error).message}`,
        error as Error,
      );
    }
  }

  /**
   * Get the current storage strategy.
   */
  getStrategy(): StorageStrategy {
    return this.strategy;
  }
}

/**
 * Custom error type for Layer 6.
 */
export class MetricRouterError extends Error {
  public readonly cause: Error;

  constructor(message: string, cause: Error) {
    super(message);
    this.name = 'MetricRouterError';
    this.cause = cause;
  }
}
