/**
 * MetricEnricher — Layer 5: Data enrichment
 * 
 * [DEF-004] Part of the over-engineered 8-layer ingestion pipeline.
 * This layer "enriches" data by adding metadata and defaults — which for
 * a simple metrics service means adding a source field and an ingestion timestamp.
 * A one-line operation stretched into its own class with error wrapping.
 */

import logger from '../utils/logger.js';

export interface EnrichedMetric {
  metric_name: string;
  value: number;
  timestamp: Date;
  metadata: {
    source: string;
    ingested_at: Date;
    version: string;
  };
}

export class MetricEnricher {
  private source: string;
  private version: string;

  constructor(source: string = 'api', version: string = '1.0.0') {
    this.source = source;
    this.version = version;
  }

  /**
   * Enrich a metric with metadata.
   * Adds source, ingestion timestamp, and API version.
   */
  enrich(data: {
    metric_name: string;
    value: number;
    timestamp: Date;
  }): EnrichedMetric {
    logger.debug(`MetricEnricher: Enriching metric '${data.metric_name}'`);

    try {
      const enriched: EnrichedMetric = {
        metric_name: data.metric_name,
        value: data.value,
        timestamp: data.timestamp,
        metadata: {
          source: this.source,
          ingested_at: new Date(),
          version: this.version,
        },
      };

      logger.debug(`MetricEnricher: Enriched metric '${data.metric_name}' with source='${this.source}'`);
      return enriched;
    } catch (error) {
      throw new MetricEnricherError(
        `Failed to enrich metric '${data.metric_name}': ${(error as Error).message}`,
        error as Error,
      );
    }
  }
}

/**
 * Custom error type for Layer 5.
 */
export class MetricEnricherError extends Error {
  public readonly cause: Error;

  constructor(message: string, cause: Error) {
    super(message);
    this.name = 'MetricEnricherError';
    this.cause = cause;
  }
}
