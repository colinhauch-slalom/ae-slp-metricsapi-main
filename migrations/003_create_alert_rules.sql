-- Migration 003: Create alert_rules table
-- [DEF-014] UNUSED — This table is created but never populated or queried.
-- It was planned for threshold-based alerting that was never implemented.

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(255) NOT NULL,
  condition VARCHAR(20) NOT NULL,
  threshold DOUBLE PRECISION NOT NULL,
  window_seconds INTEGER NOT NULL DEFAULT 300,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for alert rule lookups (never used)
CREATE INDEX IF NOT EXISTS idx_alert_rules_metric_name
  ON alert_rules (metric_name);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled
  ON alert_rules (enabled);
