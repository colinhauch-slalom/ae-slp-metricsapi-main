/**
 * MetricMetadataService — Full CRUD service for metric metadata
 * 
 * [DEF-014] UNUSED — This service is fully implemented with create, read,
 * update, delete, and list operations, but is NEVER called from anywhere
 * in the application. ~100 lines of dead code.
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  MetricMetadata,
  CreateMetricMetadataInput,
  UpdateMetricMetadataInput,
} from '../models/MetricMetadata.js';
import logger from '../utils/logger.js';

export class MetricMetadataService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create metadata for a metric.
   * [DEF-014] Never called.
   */
  async create(input: CreateMetricMetadataInput): Promise<MetricMetadata> {
    const id = uuidv4();
    logger.debug(`MetricMetadataService: Creating metadata for '${input.metric_name}'`);

    const result = await this.pool.query(
      `INSERT INTO metric_metadata (id, metric_name, unit, description, tags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, input.metric_name, input.unit || null, input.description || null, JSON.stringify(input.tags || {})],
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Get metadata by metric name.
   * [DEF-014] Never called.
   */
  async getByName(metricName: string): Promise<MetricMetadata | null> {
    logger.debug(`MetricMetadataService: Getting metadata for '${metricName}'`);

    const result = await this.pool.query(
      'SELECT * FROM metric_metadata WHERE metric_name = $1',
      [metricName],
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Get metadata by ID.
   * [DEF-014] Never called.
   */
  async getById(id: string): Promise<MetricMetadata | null> {
    const result = await this.pool.query(
      'SELECT * FROM metric_metadata WHERE id = $1',
      [id],
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * List all metric metadata.
   * [DEF-014] Never called.
   */
  async list(): Promise<MetricMetadata[]> {
    logger.debug('MetricMetadataService: Listing all metadata');

    const result = await this.pool.query(
      'SELECT * FROM metric_metadata ORDER BY metric_name ASC',
    );

    return result.rows.map(this.mapRow);
  }

  /**
   * Update metadata for a metric.
   * [DEF-014] Never called.
   */
  async update(id: string, input: UpdateMetricMetadataInput): Promise<MetricMetadata | null> {
    logger.debug(`MetricMetadataService: Updating metadata ${id}`);

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.unit !== undefined) {
      fields.push(`unit = $${paramIndex++}`);
      values.push(input.unit);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.tags !== undefined) {
      fields.push(`tags = $${paramIndex++}`);
      values.push(JSON.stringify(input.tags));
    }

    if (fields.length === 0) return this.getById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.pool.query(
      `UPDATE metric_metadata SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Delete metadata by ID.
   * [DEF-014] Never called.
   */
  async delete(id: string): Promise<boolean> {
    logger.debug(`MetricMetadataService: Deleting metadata ${id}`);

    const result = await this.pool.query(
      'DELETE FROM metric_metadata WHERE id = $1',
      [id],
    );

    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): MetricMetadata {
    return {
      id: row.id as string,
      metric_name: row.metric_name as string,
      unit: row.unit as string | null,
      description: row.description as string | null,
      tags: (row.tags || {}) as Record<string, string>,
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
    };
  }
}
