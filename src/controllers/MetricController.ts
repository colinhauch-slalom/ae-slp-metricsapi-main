/**
 * MetricController — Layer 1: HTTP request handling
 * 
 * [DEF-004] Part of the over-engineered 8-layer ingestion pipeline.
 * Parses the request body and passes it to MetricService (Layer 2),
 * which then cascades through layers 3–8.
 * 
 * [DEF-012] All errors are caught and re-thrown to the generic error handler,
 * which always returns 500 with "An error occurred".
 */

import { Request, Response, NextFunction } from 'express';
import { MetricService } from '../services/MetricService.js';
import { AggregationEngine, AggregationType } from '../aggregation/AggregationEngine.js';
import logger from '../utils/logger.js';

export class MetricController {
  private metricService: MetricService;
  private aggregationEngine: AggregationEngine;

  constructor(metricService: MetricService) {
    this.metricService = metricService;
    this.aggregationEngine = new AggregationEngine();
  }

  /**
   * POST /v1/metrics — Ingest a metric data point.
   * Returns 201 with the persisted record on success.
   * All errors fall through to the generic error handler [DEF-012].
   */
  async ingest(req: Request, res: Response, next: NextFunction): Promise<void> {
    logger.debug('MetricController: Received ingest request');

    try {
      const dataPoint = await this.metricService.ingest(req.body);

      res.status(201).json({
        id: dataPoint.id,
        name: dataPoint.metric_name,
        value: dataPoint.value,
        timestamp: dataPoint.timestamp,
        created_at: dataPoint.created_at,
      });
    } catch (error) {
      // [DEF-012] Pass to generic error handler — always returns 500
      next(error);
    }
  }

  /**
   * GET /v1/metrics/query — Query aggregated metrics over a time range.
   * 
   * Query params: name, start, end, aggregation, percentile (optional)
   * Returns the computed aggregation result.
   * [DEF-002] Percentile uses Math.ceil (off-by-one).
   * [DEF-012] All errors return generic 500.
   */
  async query(req: Request, res: Response, next: NextFunction): Promise<void> {
    logger.debug('MetricController: Received query request');

    try {
      const { name, start, end, aggregation, percentile } = req.query;

      // Parse query parameters
      if (!name || !start || !end || !aggregation) {
        throw new Error('Missing required query parameters: name, start, end, aggregation');
      }

      const metricName = name as string;
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);
      const aggregationType = aggregation as AggregationType;

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format for start or end parameter');
      }

      // Query data points through the pipeline
      const dataPoints = await this.metricService.queryByTimeRange(metricName, startDate, endDate);

      // Extract values for aggregation
      const values = dataPoints.map((dp) => dp.value);

      // Compute aggregation [DEF-002 for percentile]
      const percentileValue = percentile ? Number(percentile) : undefined;
      const result = this.aggregationEngine.aggregate(values, aggregationType, percentileValue);

      const response: Record<string, unknown> = {
        name: metricName,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        aggregation: aggregationType,
        value: result.value,
        count: result.count,
      };

      // Include percentile field in response when aggregation is percentile
      if (aggregationType === 'percentile' && percentileValue !== undefined) {
        response.percentile = percentileValue;
      }

      res.status(200).json(response);
    } catch (error) {
      // [DEF-012] Pass to generic error handler — always returns 500
      next(error);
    }
  }
}
