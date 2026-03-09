/**
 * AlertRuleService — Full CRUD service for alert rules
 * 
 * [DEF-014] UNUSED — This service is fully implemented with create, read,
 * update, delete, list, and enable/disable operations, but is NEVER called
 * from anywhere in the application. ~120 lines of dead code.
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  AlertRule,
  CreateAlertRuleInput,
  UpdateAlertRuleInput,
} from '../models/AlertRule.js';
import logger from '../utils/logger.js';

export class AlertRuleService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create an alert rule.
   * [DEF-014] Never called.
   */
  async create(input: CreateAlertRuleInput): Promise<AlertRule> {
    const id = uuidv4();
    logger.debug(`AlertRuleService: Creating alert rule for '${input.metric_name}'`);

    const result = await this.pool.query(
      `INSERT INTO alert_rules (id, metric_name, condition, threshold, window_seconds, enabled)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        id,
        input.metric_name,
        input.condition,
        input.threshold,
        input.window_seconds || 300,
        input.enabled !== undefined ? input.enabled : true,
      ],
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Get an alert rule by ID.
   * [DEF-014] Never called.
   */
  async getById(id: string): Promise<AlertRule | null> {
    const result = await this.pool.query(
      'SELECT * FROM alert_rules WHERE id = $1',
      [id],
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * List all alert rules.
   * [DEF-014] Never called.
   */
  async list(): Promise<AlertRule[]> {
    logger.debug('AlertRuleService: Listing all alert rules');

    const result = await this.pool.query(
      'SELECT * FROM alert_rules ORDER BY created_at DESC',
    );

    return result.rows.map(this.mapRow);
  }

  /**
   * List alert rules for a specific metric.
   * [DEF-014] Never called.
   */
  async listByMetric(metricName: string): Promise<AlertRule[]> {
    const result = await this.pool.query(
      'SELECT * FROM alert_rules WHERE metric_name = $1 ORDER BY created_at DESC',
      [metricName],
    );

    return result.rows.map(this.mapRow);
  }

  /**
   * Update an alert rule.
   * [DEF-014] Never called.
   */
  async update(id: string, input: UpdateAlertRuleInput): Promise<AlertRule | null> {
    logger.debug(`AlertRuleService: Updating alert rule ${id}`);

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.condition !== undefined) {
      fields.push(`condition = $${paramIndex++}`);
      values.push(input.condition);
    }
    if (input.threshold !== undefined) {
      fields.push(`threshold = $${paramIndex++}`);
      values.push(input.threshold);
    }
    if (input.window_seconds !== undefined) {
      fields.push(`window_seconds = $${paramIndex++}`);
      values.push(input.window_seconds);
    }
    if (input.enabled !== undefined) {
      fields.push(`enabled = $${paramIndex++}`);
      values.push(input.enabled);
    }

    if (fields.length === 0) return this.getById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.pool.query(
      `UPDATE alert_rules SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Delete an alert rule.
   * [DEF-014] Never called.
   */
  async delete(id: string): Promise<boolean> {
    logger.debug(`AlertRuleService: Deleting alert rule ${id}`);

    const result = await this.pool.query(
      'DELETE FROM alert_rules WHERE id = $1',
      [id],
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Enable an alert rule.
   * [DEF-014] Never called.
   */
  async enable(id: string): Promise<AlertRule | null> {
    return this.update(id, { enabled: true });
  }

  /**
   * Disable an alert rule.
   * [DEF-014] Never called.
   */
  async disable(id: string): Promise<AlertRule | null> {
    return this.update(id, { enabled: false });
  }

  private mapRow(row: Record<string, unknown>): AlertRule {
    return {
      id: row.id as string,
      metric_name: row.metric_name as string,
      condition: row.condition as AlertRule['condition'],
      threshold: row.threshold as number,
      window_seconds: row.window_seconds as number,
      enabled: row.enabled as boolean,
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
    };
  }
}
