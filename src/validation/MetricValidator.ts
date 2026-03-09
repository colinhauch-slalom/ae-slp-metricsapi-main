/**
 * MetricValidator — Layer 3: Input validation
 * 
 * [DEF-004] Part of the over-engineered 8-layer ingestion pipeline.
 * This layer validates that incoming metric data has:
 *   - A non-empty string name (max 255 chars)
 *   - A finite numeric value (not NaN, not Infinity)
 *   - A valid timestamp (string or positive number)
 * 
 * Could be 10 lines of validation in the controller. Instead, it's a class.
 */

import logger from '../utils/logger.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class MetricValidator {
  /**
   * Validate raw metric input from the request body.
   * Returns a ValidationResult with a list of errors (if any).
   */
  validate(data: unknown): ValidationResult {
    const errors: string[] = [];

    logger.debug('MetricValidator: Validating metric input');

    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Request body must be a JSON object'] };
    }

    const input = data as Record<string, unknown>;

    // Validate name
    if (!input.name || typeof input.name !== 'string') {
      errors.push('Field "name" is required and must be a string');
    } else if (input.name.trim().length === 0) {
      errors.push('Field "name" must not be empty');
    } else if (input.name.length > 255) {
      errors.push('Field "name" must be at most 255 characters');
    }

    // Validate value
    if (input.value === undefined || input.value === null) {
      errors.push('Field "value" is required');
    } else if (typeof input.value !== 'number') {
      errors.push('Field "value" must be a number');
    } else if (!isFinite(input.value)) {
      errors.push('Field "value" must be a finite number (not NaN or Infinity)');
    }

    // Validate timestamp
    if (input.timestamp === undefined || input.timestamp === null) {
      errors.push('Field "timestamp" is required');
    } else if (typeof input.timestamp === 'string') {
      const parsed = new Date(input.timestamp);
      if (isNaN(parsed.getTime())) {
        errors.push('Field "timestamp" is not a valid ISO 8601 date string');
      }
    } else if (typeof input.timestamp === 'number') {
      if (input.timestamp <= 0) {
        errors.push('Field "timestamp" epoch value must be a positive integer');
      }
    } else {
      errors.push('Field "timestamp" must be an ISO 8601 string or epoch milliseconds number');
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
    };

    if (!result.valid) {
      logger.debug(`MetricValidator: Validation failed with ${errors.length} errors`);
    } else {
      logger.debug('MetricValidator: Validation passed');
    }

    return result;
  }
}

/**
 * Custom error type for Layer 3.
 */
export class MetricValidationError extends Error {
  public readonly validationErrors: string[];

  constructor(errors: string[]) {
    super(`Metric validation failed: ${errors.join('; ')}`);
    this.name = 'MetricValidationError';
    this.validationErrors = errors;
  }
}
