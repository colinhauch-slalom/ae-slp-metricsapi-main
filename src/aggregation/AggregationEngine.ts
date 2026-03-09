/**
 * AggregationEngine — Metric aggregation calculations
 * 
 * Supports three aggregation types:
 *   - sum: Sum of all values in range
 *   - average: Arithmetic mean of values in range
 *   - percentile: Nearest-rank percentile calculation
 * 
 * [DEF-002] The percentile calculation uses Math.ceil for the index,
 * which causes an off-by-one error at boundary conditions:
 *   - p100 of [1,2,3] → index 3, which is out of bounds
 *   - p50 of [1,2] → returns 2 instead of 1
 *   
 * The correct formula would use Math.floor. This is intentional.
 */

import logger from '../utils/logger.js';

export type AggregationType = 'sum' | 'average' | 'percentile';

export interface AggregationResult {
  value: number;
  count: number;
}

export class AggregationEngine {
  /**
   * Perform an aggregation calculation over a set of numeric values.
   */
  aggregate(
    values: number[],
    type: AggregationType,
    percentile?: number,
  ): AggregationResult {
    logger.debug(`AggregationEngine: Computing ${type} over ${values.length} values`);

    if (values.length === 0) {
      return { value: 0, count: 0 };
    }

    switch (type) {
      case 'sum':
        return this.computeSum(values);
      case 'average':
        return this.computeAverage(values);
      case 'percentile':
        if (percentile === undefined || percentile < 1 || percentile > 99) {
          throw new AggregationError(
            `Percentile value must be between 1 and 99, got: ${percentile}`,
          );
        }
        return this.computePercentile(values, percentile);
      default:
        throw new AggregationError(`Unknown aggregation type: ${type}`);
    }
  }

  /**
   * Sum of all values.
   */
  private computeSum(values: number[]): AggregationResult {
    const sum = values.reduce((acc, v) => acc + v, 0);
    return { value: sum, count: values.length };
  }

  /**
   * Arithmetic mean of all values.
   */
  private computeAverage(values: number[]): AggregationResult {
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / values.length;
    return { value: avg, count: values.length };
  }

  /**
   * Nearest-rank percentile calculation.
   * 
   * [DEF-002] BROKEN: Uses Math.ceil instead of Math.floor for index calculation.
   * This causes off-by-one errors:
   *   - Sort values ascending
   *   - index = Math.ceil(percentile/100 * n) - 1
   *   - For p100 of [1,2,3]: Math.ceil(100/100 * 3) - 1 = 3 - 1 = 2 → returns 3 (correct by accident)
   *   - For p50 of [1,2]: Math.ceil(50/100 * 2) - 1 = 1 - 1 = 0 → returns 1 
   *   - For p50 of [1,2,3]: Math.ceil(50/100 * 3) - 1 = Math.ceil(1.5) - 1 = 2 - 1 = 1 → returns 2
   *   - Correct p50 of [1,2,3] with Math.floor: Math.floor(50/100 * 3) = 1 → returns 2 (same here, but differs at boundaries)
   */
  private computePercentile(values: number[], percentile: number): AggregationResult {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    // [DEF-002] Math.ceil instead of Math.floor — intentional off-by-one
    const index = Math.ceil((percentile / 100) * n) - 1;

    // Clamp to valid range (prevents crash on edge cases, but result is wrong)
    const clampedIndex = Math.max(0, Math.min(index, n - 1));

    return { value: sorted[clampedIndex], count: n };
  }
}

/**
 * Custom error for aggregation failures.
 */
export class AggregationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AggregationError';
  }
}
