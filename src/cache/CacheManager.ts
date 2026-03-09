/**
 * CacheManager — 3-tier cache (L1 in-memory, L2 Redis, L3 database)
 * 
 * [DEF-006] The cache TTLs are set so aggressively short that L1 and L2
 * are ALWAYS stale by the time a query comes in:
 *   - L1 (in-memory): 1 second TTL
 *   - L2 (Redis): 2 second TTL
 *   - L3: Database fallthrough (always hit)
 * 
 * Every read effectively goes through all 3 tiers and hits the database.
 * The cache adds overhead (serialization, Redis calls) without any benefit.
 * Removing it would improve performance.
 * 
 * This is a deliberate defect preserved for the learning series.
 */

import Redis from 'ioredis';
import logger from '../utils/logger.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheManager {
  private l1Cache: Map<string, CacheEntry<unknown>>;
  private redisClient: Redis;
  private l1TtlMs: number;
  private l2TtlSeconds: number;

  /**
   * @param redisClient - ioredis instance for L2 cache
   * @param l1TtlMs - L1 in-memory TTL in milliseconds [DEF-006: defaults to 1000ms / 1 second]
   * @param l2TtlSeconds - L2 Redis TTL in seconds [DEF-006: defaults to 2 seconds]
   */
  constructor(
    redisClient: Redis,
    l1TtlMs: number = 1000,
    l2TtlSeconds: number = 2,
  ) {
    this.l1Cache = new Map();
    this.redisClient = redisClient;
    this.l1TtlMs = l1TtlMs;
    this.l2TtlSeconds = l2TtlSeconds;
  }

  /**
   * Get a value from the 3-tier cache.
   * Checks L1 (memory) → L2 (Redis) → returns undefined if not found.
   * Caller must fall through to L3 (database) on miss.
   * 
   * [DEF-006] In practice, L1 and L2 are always expired, so this always returns undefined.
   */
  async get<T>(key: string): Promise<T | undefined> {
    logger.debug(`CacheManager: Looking up key '${key}'`);

    // L1: In-memory cache
    const l1Entry = this.l1Cache.get(key);
    if (l1Entry && l1Entry.expiresAt > Date.now()) {
      logger.debug(`CacheManager: L1 HIT for '${key}'`);
      return l1Entry.value as T;
    }
    if (l1Entry) {
      logger.debug(`CacheManager: L1 EXPIRED for '${key}'`);
      this.l1Cache.delete(key);
    }

    // L2: Redis cache
    try {
      const l2Value = await this.redisClient.get(this.redisKey(key));
      if (l2Value !== null) {
        logger.debug(`CacheManager: L2 HIT for '${key}'`);
        const parsed = JSON.parse(l2Value) as T;
        // Populate L1 from L2 (will expire in 1 second anyway)
        this.setL1(key, parsed);
        return parsed;
      }
      logger.debug(`CacheManager: L2 MISS for '${key}'`);
    } catch (error) {
      logger.warn('CacheManager: L2 (Redis) lookup failed:', (error as Error).message);
    }

    // L3 miss — caller must query database
    logger.debug(`CacheManager: MISS for '${key}' — falling through to L3 (database)`);
    return undefined;
  }

  /**
   * Set a value in L1 and L2 caches.
   * Called after a database read to populate the cache.
   * [DEF-006] Both entries will expire almost immediately.
   */
  async set<T>(key: string, value: T): Promise<void> {
    logger.debug(`CacheManager: Setting key '${key}' in L1 and L2`);

    // L1: In-memory
    this.setL1(key, value);

    // L2: Redis
    try {
      await this.redisClient.set(
        this.redisKey(key),
        JSON.stringify(value),
        'EX',
        this.l2TtlSeconds,
      );
      logger.debug(`CacheManager: Set L2 for '${key}' (TTL: ${this.l2TtlSeconds}s)`);
    } catch (error) {
      logger.warn('CacheManager: L2 (Redis) set failed:', (error as Error).message);
    }
  }

  /**
   * Invalidate a key in all cache tiers.
   */
  async invalidate(key: string): Promise<void> {
    logger.debug(`CacheManager: Invalidating key '${key}'`);
    this.l1Cache.delete(key);
    try {
      await this.redisClient.del(this.redisKey(key));
    } catch (error) {
      logger.warn('CacheManager: L2 invalidation failed:', (error as Error).message);
    }
  }

  /**
   * Clear all cached entries.
   */
  async clear(): Promise<void> {
    logger.debug('CacheManager: Clearing all caches');
    this.l1Cache.clear();
    // Note: only clears keys with our prefix
    try {
      const keys = await this.redisClient.keys('metricsapi:cache:*');
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch (error) {
      logger.warn('CacheManager: L2 clear failed:', (error as Error).message);
    }
  }

  /**
   * Get cache stats (for debugging).
   */
  getStats(): { l1Size: number; l1TtlMs: number; l2TtlSeconds: number } {
    return {
      l1Size: this.l1Cache.size,
      l1TtlMs: this.l1TtlMs,
      l2TtlSeconds: this.l2TtlSeconds,
    };
  }

  private setL1<T>(key: string, value: T): void {
    this.l1Cache.set(key, {
      value,
      expiresAt: Date.now() + this.l1TtlMs,
    });
  }

  private redisKey(key: string): string {
    return `metricsapi:cache:${key}`;
  }
}
