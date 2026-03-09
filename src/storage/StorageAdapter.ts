/**
 * StorageAdapter — Layer 7: Storage abstraction interface
 * 
 * [DEF-004] Part of the over-engineered 8-layer ingestion pipeline.
 * This layer wraps the PostgresStorageProvider behind an interface —
 * despite there being no other storage implementation.
 */

import { MetricDataPoint } from '../models/MetricDataPoint.js';
import { PostgresStorageProvider, StorageResult, PostgresStorageError } from './PostgresStorageProvider.js';
import logger from '../utils/logger.js';

/**
 * StorageProvider interface — the "abstraction" that justifies this layer.
 * Only one implementation exists (PostgresStorageProvider).
 */
export interface StorageProvider {
  store(data: { metric_name: string; value: number; timestamp: Date }): Promise<StorageResult>;
  queryByTimeRange(metricName: string, start: Date, end: Date): Promise<MetricDataPoint[]>;
}

export class StorageAdapter {
  private provider: StorageProvider;

  constructor(provider: StorageProvider) {
    this.provider = provider;
  }

  /**
   * Delegate storage to the underlying provider.
   * Wraps provider errors in StorageAdapterError.
   */
  async persist(data: {
    metric_name: string;
    value: number;
    timestamp: Date;
  }): Promise<StorageResult> {
    logger.debug('StorageAdapter: Delegating persist to storage provider');

    try {
      return await this.provider.store(data);
    } catch (error) {
      throw new StorageAdapterError(
        `StorageAdapter failed to persist: ${(error as Error).message}`,
        error as Error,
      );
    }
  }

  /**
   * Delegate query to the underlying provider.
   */
  async query(
    metricName: string,
    start: Date,
    end: Date,
  ): Promise<MetricDataPoint[]> {
    logger.debug('StorageAdapter: Delegating query to storage provider');

    try {
      return await this.provider.queryByTimeRange(metricName, start, end);
    } catch (error) {
      throw new StorageAdapterError(
        `StorageAdapter failed to query: ${(error as Error).message}`,
        error as Error,
      );
    }
  }
}

/**
 * Custom error type for Layer 7.
 */
export class StorageAdapterError extends Error {
  public readonly cause: Error;

  constructor(message: string, cause: Error) {
    super(message);
    this.name = 'StorageAdapterError';
    this.cause = cause;
  }
}
