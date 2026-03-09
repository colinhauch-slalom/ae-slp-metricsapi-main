/**
 * ConfigProvider — Multi-format configuration loader
 * 
 * [DEF-007] Over-engineered: Supports YAML, JSON, TOML, and environment variables
 * with dot-notation override paths for a total of 8 configuration values.
 * 
 * This is a deliberate YAGNI violation preserved for the learning series.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface RawConfig {
  [key: string]: unknown;
}

export type ConfigFormat = 'json' | 'yaml' | 'toml' | 'env';

interface ConfigSource {
  format: ConfigFormat;
  path?: string;
  data?: RawConfig;
  priority: number;
}

export class ConfigProvider {
  private sources: ConfigSource[] = [];
  private loadedConfigs: RawConfig[] = [];

  /**
   * Register a configuration source.
   * Higher priority values override lower ones.
   */
  addSource(format: ConfigFormat, filePath?: string, priority: number = 0): void {
    this.sources.push({ format, path: filePath, priority });
  }

  /**
   * Load all registered configuration sources and merge them by priority.
   * Supports JSON, YAML (simplified), TOML (simplified), and environment variables.
   */
  async load(): Promise<RawConfig> {
    this.loadedConfigs = [];

    // Sort sources by priority (lowest first, highest wins)
    const sorted = [...this.sources].sort((a, b) => a.priority - b.priority);

    for (const source of sorted) {
      try {
        const config = await this.loadSource(source);
        if (config) {
          this.loadedConfigs.push(config);
        }
      } catch (error) {
        // Silently skip failed sources — this is intentional
        // The actual error is logged but suppressed by the default log level [DEF-013]
        console.error(`Failed to load config source: ${source.format}`, error);
      }
    }

    // Merge all configs, later entries override earlier
    return this.merge(this.loadedConfigs);
  }

  /**
   * Load a single configuration source based on its format.
   */
  private async loadSource(source: ConfigSource): Promise<RawConfig | null> {
    switch (source.format) {
      case 'json':
        return this.loadJson(source.path);
      case 'yaml':
        return this.loadYaml(source.path);
      case 'toml':
        return this.loadToml(source.path);
      case 'env':
        return this.loadEnv();
      default:
        return null;
    }
  }

  /**
   * Load JSON configuration from a file.
   */
  private loadJson(filePath?: string): RawConfig | null {
    if (!filePath) return null;
    try {
      const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
      return JSON.parse(content) as RawConfig;
    } catch {
      return null;
    }
  }

  /**
   * Load YAML configuration from a file.
   * Simplified parser: only handles flat key: value pairs.
   * A real implementation would use a YAML library, but this is over-engineered enough.
   */
  private loadYaml(filePath?: string): RawConfig | null {
    if (!filePath) return null;
    try {
      const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
      const result: RawConfig = {};
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) continue;
        const key = trimmed.substring(0, colonIndex).trim();
        let value: string | number | boolean = trimmed.substring(colonIndex + 1).trim();
        // Strip quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        // Type coercion
        if (value === 'true') result[key] = true;
        else if (value === 'false') result[key] = false;
        else if (!isNaN(Number(value)) && value !== '') result[key] = Number(value);
        else result[key] = value;
      }
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Load TOML configuration from a file.
   * Simplified parser: only handles flat key = value pairs.
   */
  private loadToml(filePath?: string): RawConfig | null {
    if (!filePath) return null;
    try {
      const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
      const result: RawConfig = {};
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('[')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.substring(0, eqIndex).trim();
        let value: string | number | boolean = trimmed.substring(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (value === 'true') result[key] = true;
        else if (value === 'false') result[key] = false;
        else if (!isNaN(Number(value)) && value !== '') result[key] = Number(value);
        else result[key] = value;
      }
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Load configuration from environment variables.
   * Only picks up variables prefixed with METRICS_.
   */
  private loadEnv(): RawConfig {
    const result: RawConfig = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('METRICS_')) {
        // Convert METRICS_DB_HOST to db.host
        const configKey = key
          .replace('METRICS_', '')
          .toLowerCase()
          .replace(/_/g, '.');
        result[configKey] = value;
      }
    }
    return result;
  }

  /**
   * Deep merge multiple config objects. Later entries win.
   */
  private merge(configs: RawConfig[]): RawConfig {
    const result: RawConfig = {};
    for (const config of configs) {
      for (const [key, value] of Object.entries(config)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value) &&
            typeof result[key] === 'object' && result[key] !== null) {
          result[key] = this.merge([result[key] as RawConfig, value as RawConfig]);
        } else {
          result[key] = value;
        }
      }
    }
    return result;
  }

  /**
   * Get the number of registered sources.
   */
  getSourceCount(): number {
    return this.sources.length;
  }

  /**
   * Get supported formats.
   */
  getSupportedFormats(): ConfigFormat[] {
    return ['json', 'yaml', 'toml', 'env'];
  }
}
