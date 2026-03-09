-- Migration 001: Create metric_data_points table
-- Core entity for time-series metric ingestion (FR-001, FR-003)

CREATE TABLE IF NOT EXISTS metric_data_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(255) NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Composite index for time-range aggregation queries (FR-005 through FR-008)
CREATE INDEX IF NOT EXISTS idx_metric_data_points_name_timestamp
  ON metric_data_points (metric_name, timestamp);
