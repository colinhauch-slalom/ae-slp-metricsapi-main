/**
 * AggregationEngine unit tests
 * 
 * Sum and average tests are correct.
 * The percentile test PASSES but validates the WRONG behavior [DEF-002]:
 * it asserts the Math.ceil-based result rather than the mathematically correct value.
 */

import { AggregationEngine } from '../../src/aggregation/AggregationEngine';

describe('AggregationEngine', () => {
  let engine: AggregationEngine;

  beforeEach(() => {
    engine = new AggregationEngine();
  });

  describe('sum', () => {
    it('should return sum of all values', () => {
      const result = engine.aggregate([10, 20, 30, 40], 'sum');
      expect(result.value).toBe(100);
      expect(result.count).toBe(4);
    });

    it('should return 0 for empty array', () => {
      const result = engine.aggregate([], 'sum');
      expect(result.value).toBe(0);
      expect(result.count).toBe(0);
    });

    it('should handle single value', () => {
      const result = engine.aggregate([42], 'sum');
      expect(result.value).toBe(42);
      expect(result.count).toBe(1);
    });

    it('should handle decimal values', () => {
      const result = engine.aggregate([0.1, 0.2, 0.3], 'sum');
      expect(result.value).toBeCloseTo(0.6);
    });
  });

  describe('average', () => {
    it('should return arithmetic mean', () => {
      const result = engine.aggregate([10, 20, 30], 'average');
      expect(result.value).toBe(20);
      expect(result.count).toBe(3);
    });

    it('should return 0 for empty array', () => {
      const result = engine.aggregate([], 'average');
      expect(result.value).toBe(0);
      expect(result.count).toBe(0);
    });

    it('should handle single value', () => {
      const result = engine.aggregate([42], 'average');
      expect(result.value).toBe(42);
    });
  });

  describe('percentile', () => {
    it('should calculate p50 of sorted array', () => {
      const result = engine.aggregate([1, 2, 3, 4, 5], 'percentile', 50);
      // [DEF-002] Math.ceil(50/100 * 5) - 1 = Math.ceil(2.5) - 1 = 3 - 1 = 2
      // sorted[2] = 3
      expect(result.value).toBe(3);
      expect(result.count).toBe(5);
    });

    it('should calculate p95 of larger dataset', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      const result = engine.aggregate(values, 'percentile', 95);
      // [DEF-002] Math.ceil(95/100 * 100) - 1 = 95 - 1 = 94
      // sorted[94] = 95
      expect(result.value).toBe(95);
      expect(result.count).toBe(100);
    });

    it('should throw for percentile out of range', () => {
      expect(() => engine.aggregate([1, 2, 3], 'percentile', 0)).toThrow();
      expect(() => engine.aggregate([1, 2, 3], 'percentile', 100)).toThrow();
    });

    it('should throw for undefined percentile', () => {
      expect(() => engine.aggregate([1, 2, 3], 'percentile')).toThrow();
    });
  });

  describe('error handling', () => {
    it('should throw for unknown aggregation type', () => {
      expect(() => engine.aggregate([1, 2, 3], 'median' as any)).toThrow();
    });
  });
});
