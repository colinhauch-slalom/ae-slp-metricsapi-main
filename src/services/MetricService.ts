/**
 * MetricService — Layer 2: Business logic orchestration
 * 
 * [DEF-004] Part of the over-engineered 8-layer ingestion pipeline.
 * Orchestrates ingestion through layers 3–8:
 *   MetricValidator → MetricNormalizer → MetricEnricher → MetricRouter → StorageAdapter → PostgresStorageProvider
 * 
 * [DEF-006] Query path includes 3-tier cache (L1→L2→L3) that is always stale.
 * 
 * Each layer call is wrapped in try/catch to re-wrap errors.
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import { MetricDataPoint, CreateMetricDataPointInput } from '../models/MetricDataPoint.js';
import { MetricValidator, MetricValidationError } from '../validation/MetricValidator.js';
import { MetricNormalizer } from '../normalization/MetricNormalizer.js';
import { MetricEnricher } from '../enrichment/MetricEnricher.js';
import { MetricRouter } from '../routing/MetricRouter.js';
import { StorageAdapter } from '../storage/StorageAdapter.js';
import { PostgresStorageProvider } from '../storage/PostgresStorageProvider.js';
import { CacheManager } from '../cache/CacheManager.js';
import logger from '../utils/logger.js';

export class MetricService {
  private validator: MetricValidator;
  private normalizer: MetricNormalizer;
  private enricher: MetricEnricher;
  private metricRouter: MetricRouter;
  private cacheManager: CacheManager | null;

  constructor(pool: Pool, redisClient?: Redis) {
    // Wire up the pipeline: layers 3-8
    this.validator = new MetricValidator();
    this.normalizer = new MetricNormalizer();
    this.enricher = new MetricEnricher();

    const storageProvider = new PostgresStorageProvider(pool);
    const storageAdapter = new StorageAdapter(storageProvider);
    this.metricRouter = new MetricRouter(storageAdapter);

    // [DEF-006] Cache manager with aggressive TTLs (L1: 1s, L2: 2s)
    this.cacheManager = redisClient ? new CacheManager(redisClient) : null;
  }

  /**
   * Ingest a metric data point through the full 8-layer pipeline.
   * 
   * Flow: validate → normalize → enrich → route → adapt → store
   */
  async ingest(input: unknown): Promise<MetricDataPoint> {
    logger.debug('MetricService: Starting ingestion pipeline');

    try {
      // Layer 3: Validate
      const validationResult = this.validator.validate(input);
      if (!validationResult.valid) {
        throw new MetricValidationError(validationResult.errors);
      }
      const validInput = input as CreateMetricDataPointInput;

      // Layer 4: Normalize
      const normalized = this.normalizer.normalize({
        name: validInput.name,
        value: validInput.value,
        timestamp: validInput.timestamp,
      });

      // Layer 5: Enrich (result includes metadata, but we only persist core fields)
      const enriched = this.enricher.enrich({
        metric_name: normalized.metric_name,
        value: normalized.value,
        timestamp: normalized.timestamp,
      });

      // Layer 6 → 7 → 8: Route → Adapt → Store
      const storageResult = await this.metricRouter.route({
        metric_name: enriched.metric_name,
        value: enriched.value,
        timestamp: enriched.timestamp,
      });

      logger.debug(`MetricService: Ingestion pipeline completed for ${storageResult.dataPoint.id}`);
      return storageResult.dataPoint;
    } catch (error) {
      logger.error('MetricService: Ingestion pipeline failed:', (error as Error).message);
      throw new MetricServiceError(
        `Ingestion pipeline failed: ${(error as Error).message}`,
        error as Error,
      );
    }
  }

  /**
   * Query metrics by name and time range (used by US2).
   * Returns raw data points for aggregation.
   * 
   * [DEF-006] Checks L1→L2→L3 cache on every read, but L1 (1s) and L2 (2s)
   * TTLs are so short that the cache is always stale. Every query hits the database.
   */
  async queryByTimeRange(
    metricName: string,
    start: Date,
    end: Date,
  ): Promise<MetricDataPoint[]> {
    logger.debug(`MetricService: Querying '${metricName}' from ${start.toISOString()} to ${end.toISOString()}`);

    try {
      // [DEF-006] Check cache first (will almost always miss due to tiny TTLs)
      const cacheKey = `query:${metricName}:${start.toISOString()}:${end.toISOString()}`;
      if (this.cacheManager) {
        const cached = await this.cacheManager.get<MetricDataPoint[]>(cacheKey);
        if (cached) {
          logger.debug('MetricService: Cache HIT (unlikely with 1-2s TTLs)');
          return cached;
        }
        logger.debug('MetricService: Cache MISS — falling through to database');
      }

      // L3: Database query (always reached)
      const dataPoints = await this.metricRouter.query(metricName, start, end);

      // Populate cache (will expire in 1-2 seconds) [DEF-006]
      if (this.cacheManager) {
        await this.cacheManager.set(cacheKey, dataPoints);
      }

      return dataPoints;
    } catch (error) {
      logger.error('MetricService: Query failed:', (error as Error).message);
      throw new MetricServiceError(
        `Query failed: ${(error as Error).message}`,
        error as Error,
      );
    }
  }
}

/**
 * Custom error type for Layer 2.
 */
export class MetricServiceError extends Error {
  public readonly cause: Error;

  constructor(message: string, cause: Error) {
    super(message);
    this.name = 'MetricServiceError';
    this.cause = cause;
  }
}
