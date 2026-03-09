/**
 * ConfigResolver — Dot-notation override resolution
 * 
 * [DEF-007] Over-engineered: Supports deep property access and override via
 * dot-notation paths (e.g., "db.host" resolves to config.db.host) with full
 * nested object construction. All this for 8 flat configuration values.
 * 
 * This is a deliberate YAGNI violation preserved for the learning series.
 */

import { RawConfig } from './ConfigProvider.js';

export class ConfigResolver {
  private config: RawConfig;

  constructor(config: RawConfig) {
    this.config = this.flattenToNested(config);
  }

  /**
   * Resolve a value from the configuration using dot-notation path.
   * Example: resolve("db.host") returns the value at config.db.host
   */
  resolve<T = unknown>(path: string): T | undefined {
    const parts = path.split('.');
    let current: unknown = this.config;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current as T;
  }

  /**
   * Resolve a value with a default fallback.
   */
  resolveWithDefault<T>(path: string, defaultValue: T): T {
    const value = this.resolve<T>(path);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Apply overrides to the resolved configuration.
   * Overrides use dot-notation keys that get expanded into nested objects.
   */
  applyOverrides(overrides: Record<string, unknown>): void {
    for (const [path, value] of Object.entries(overrides)) {
      this.set(path, value);
    }
  }

  /**
   * Set a value at a dot-notation path, creating intermediate objects as needed.
   */
  private set(path: string, value: unknown): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = this.config as Record<string, unknown>;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Convert flat dot-notation keys into a nested object structure.
   * Example: { "db.host": "localhost" } → { db: { host: "localhost" } }
   */
  private flattenToNested(flat: RawConfig): RawConfig {
    const result: RawConfig = {};

    for (const [key, value] of Object.entries(flat)) {
      if (key.includes('.')) {
        const parts = key.split('.');
        let current: Record<string, unknown> = result as Record<string, unknown>;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!(part in current) || typeof current[part] !== 'object') {
            current[part] = {};
          }
          current = current[part] as Record<string, unknown>;
        }
        current[parts[parts.length - 1]] = value;
      } else {
        // If it's already an object (like from a nested JSON source), preserve it
        if (typeof value === 'object' && value !== null && !Array.isArray(value) &&
            typeof result[key] === 'object' && result[key] !== null) {
          result[key] = this.deepMerge(result[key] as RawConfig, value as RawConfig);
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Deep merge two objects.
   */
  private deepMerge(target: RawConfig, source: RawConfig): RawConfig {
    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value) &&
          typeof result[key] === 'object' && result[key] !== null) {
        result[key] = this.deepMerge(result[key] as RawConfig, value as RawConfig);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Get the full resolved configuration as a nested object.
   */
  getFullConfig(): RawConfig {
    return { ...this.config };
  }

  /**
   * Check if a path exists in the configuration.
   */
  has(path: string): boolean {
    return this.resolve(path) !== undefined;
  }

  /**
   * Get all top-level keys.
   */
  getKeys(): string[] {
    return Object.keys(this.config);
  }
}
