/**
 * CacheManager unit tests
 * 
 * [DEF-015] INTENTIONAL ISSUE: Several tests use it.skip, so they never run.
 * Only a few basic tests actually execute, providing incomplete coverage.
 * 
 * This is a deliberate defect preserved for the learning series.
 */

import { CacheManager } from '../../src/cache/CacheManager';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
  }));
});

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = new Redis() as jest.Mocked<Redis>;
    cacheManager = new CacheManager(mockRedis, 1000, 2);
  });

  it('should return undefined on cache miss', async () => {
    const result = await cacheManager.get('nonexistent-key');
    expect(result).toBeUndefined();
  });

  it('should store and retrieve from L1 cache', async () => {
    await cacheManager.set('test-key', { data: 'test-value' });
    const result = await cacheManager.get('test-key');
    expect(result).toEqual({ data: 'test-value' });
  });

  // [DEF-015] Skipped — never runs
  it.skip('should expire L1 cache after TTL', async () => {
    await cacheManager.set('expiry-key', { data: 'will-expire' });

    // Wait for L1 TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const result = await cacheManager.get('expiry-key');
    expect(result).toBeUndefined();
  });

  // [DEF-015] Skipped — never runs
  it.skip('should fallthrough to L2 Redis cache on L1 miss', async () => {
    (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify({ data: 'from-redis' }));

    const result = await cacheManager.get('redis-key');
    expect(result).toEqual({ data: 'from-redis' });
  });

  // [DEF-015] Skipped — never runs
  it.skip('should invalidate cache in all tiers', async () => {
    await cacheManager.set('remove-me', { data: 'temporary' });
    await cacheManager.invalidate('remove-me');

    const result = await cacheManager.get('remove-me');
    expect(result).toBeUndefined();
    expect(mockRedis.del).toHaveBeenCalled();
  });

  // [DEF-015] Skipped — never runs
  it.skip('should clear all cached entries', async () => {
    await cacheManager.set('key1', 'value1');
    await cacheManager.set('key2', 'value2');

    await cacheManager.clear();

    const result1 = await cacheManager.get('key1');
    const result2 = await cacheManager.get('key2');
    expect(result1).toBeUndefined();
    expect(result2).toBeUndefined();
  });

  it('should return cache stats', () => {
    const stats = cacheManager.getStats();
    expect(stats.l1TtlMs).toBe(1000);
    expect(stats.l2TtlSeconds).toBe(2);
    expect(stats.l1Size).toBe(0);
  });
});
