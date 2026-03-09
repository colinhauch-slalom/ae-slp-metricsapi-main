/**
 * MetricMetadata — Unused model
 * 
 * [DEF-014] This interface has a full model, service, and migration
 * but is NEVER used by any active code path. Dead code.
 */

export interface MetricMetadata {
  id: string;
  metric_name: string;
  unit: string | null;
  description: string | null;
  tags: Record<string, string>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMetricMetadataInput {
  metric_name: string;
  unit?: string;
  description?: string;
  tags?: Record<string, string>;
}

export interface UpdateMetricMetadataInput {
  unit?: string;
  description?: string;
  tags?: Record<string, string>;
}

export default MetricMetadata;
