/**
 * ConfigValidator — Schema validation for configuration values
 * 
 * [DEF-007] Over-engineered: Full schema validation with type checking,
 * required field enforcement, and custom validators — for 8 config values.
 * 
 * This is a deliberate YAGNI violation preserved for the learning series.
 */

import { RawConfig } from './ConfigProvider.js';

export interface ConfigSchema {
  [key: string]: FieldSchema;
}

export interface FieldSchema {
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  pattern?: RegExp;
  description?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * The actual schema for MetricsAPI — 8 values dressed up in enterprise clothing.
 */
export const METRICS_CONFIG_SCHEMA: ConfigSchema = {
  'server.port': {
    type: 'number',
    required: true,
    default: 3000,
    min: 1,
    max: 65535,
    description: 'HTTP server port',
  },
  'server.host': {
    type: 'string',
    required: false,
    default: '0.0.0.0',
    description: 'HTTP server host',
  },
  'db.host': {
    type: 'string',
    required: true,
    default: 'localhost',
    description: 'PostgreSQL host',
  },
  'db.port': {
    type: 'number',
    required: true,
    default: 5432,
    min: 1,
    max: 65535,
    description: 'PostgreSQL port',
  },
  'db.name': {
    type: 'string',
    required: true,
    default: 'metricsapi',
    description: 'PostgreSQL database name',
  },
  'db.password': {
    type: 'string',
    required: true,
    default: 'alex_local_dev',
    description: 'PostgreSQL password',
  },
  'redis.host': {
    type: 'string',
    required: true,
    default: 'localhost',
    description: 'Redis host',
  },
  'redis.port': {
    type: 'number',
    required: true,
    default: 6379,
    min: 1,
    max: 65535,
    description: 'Redis port',
  },
};

export class ConfigValidator {
  private schema: ConfigSchema;

  constructor(schema?: ConfigSchema) {
    this.schema = schema || METRICS_CONFIG_SCHEMA;
  }

  /**
   * Validate a configuration object against the schema.
   * Returns a ValidationResult with errors and warnings.
   */
  validate(config: RawConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    for (const [fieldPath, fieldSchema] of Object.entries(this.schema)) {
      const value = this.resolvePath(config, fieldPath);

      // Check required fields
      if (fieldSchema.required && (value === undefined || value === null)) {
        if (fieldSchema.default !== undefined) {
          warnings.push(`Field '${fieldPath}' not provided, using default: ${fieldSchema.default}`);
        } else {
          errors.push({
            field: fieldPath,
            message: `Required field '${fieldPath}' is missing`,
          });
        }
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      const actualType = typeof value;
      if (actualType !== fieldSchema.type) {
        errors.push({
          field: fieldPath,
          message: `Field '${fieldPath}' expected type '${fieldSchema.type}' but got '${actualType}'`,
          value,
        });
        continue;
      }

      // Number range validation
      if (fieldSchema.type === 'number' && typeof value === 'number') {
        if (fieldSchema.min !== undefined && value < fieldSchema.min) {
          errors.push({
            field: fieldPath,
            message: `Field '${fieldPath}' value ${value} is below minimum ${fieldSchema.min}`,
            value,
          });
        }
        if (fieldSchema.max !== undefined && value > fieldSchema.max) {
          errors.push({
            field: fieldPath,
            message: `Field '${fieldPath}' value ${value} exceeds maximum ${fieldSchema.max}`,
            value,
          });
        }
      }

      // Pattern validation
      if (fieldSchema.pattern && typeof value === 'string') {
        if (!fieldSchema.pattern.test(value)) {
          errors.push({
            field: fieldPath,
            message: `Field '${fieldPath}' does not match required pattern`,
            value,
          });
        }
      }
    }

    // Check for unknown fields
    const knownFields = new Set(Object.keys(this.schema));
    const flatConfig = this.flattenConfig(config);
    for (const key of Object.keys(flatConfig)) {
      if (!knownFields.has(key)) {
        warnings.push(`Unknown configuration field: '${key}'`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate and apply defaults, returning the final config with defaults filled in.
   */
  validateAndApplyDefaults(config: RawConfig): { config: RawConfig; result: ValidationResult } {
    const result = this.validate(config);
    const finalConfig = { ...config };

    // Apply defaults for missing fields
    for (const [fieldPath, fieldSchema] of Object.entries(this.schema)) {
      const value = this.resolvePath(finalConfig, fieldPath);
      if ((value === undefined || value === null) && fieldSchema.default !== undefined) {
        this.setPath(finalConfig, fieldPath, fieldSchema.default);
      }
    }

    return { config: finalConfig, result };
  }

  /**
   * Resolve a dot-notation path in a config object.
   */
  private resolvePath(config: RawConfig, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = config;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  /**
   * Set a value at a dot-notation path.
   */
  private setPath(config: RawConfig, path: string, value: unknown): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = config as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }

  /**
   * Flatten a nested config into dot-notation keys.
   */
  private flattenConfig(config: RawConfig, prefix: string = ''): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, this.flattenConfig(value as RawConfig, fullKey));
      } else {
        result[fullKey] = value;
      }
    }
    return result;
  }

  /**
   * Get the schema definition for a specific field.
   */
  getFieldSchema(fieldPath: string): FieldSchema | undefined {
    return this.schema[fieldPath];
  }

  /**
   * Get all field paths defined in the schema.
   */
  getFieldPaths(): string[] {
    return Object.keys(this.schema);
  }
}
