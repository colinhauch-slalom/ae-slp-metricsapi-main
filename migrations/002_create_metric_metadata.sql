-- Migration 002: Create metric_metadata table
-- [DEF-014] UNUSED — This table is created but never populated or queried.
-- It was planned for a metric catalog feature that was never implemented.

CREATE TABLE IF NOT EXISTS metric_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(255) NOT NULL UNIQUE,
  unit VARCHAR(50),
  description TEXT,
  tags JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index on metric_name for lookups (never used)
CREATE INDEX IF NOT EXISTS idx_metric_metadata_name
  ON metric_metadata (metric_name);
