/**
 * AlertRule — Unused model
 * 
 * [DEF-014] This interface has a full model, service, and migration
 * but is NEVER used by any active code path. Dead code.
 */

export interface AlertRule {
  id: string;
  metric_name: string;
  condition: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold: number;
  window_seconds: number;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAlertRuleInput {
  metric_name: string;
  condition: AlertRule['condition'];
  threshold: number;
  window_seconds?: number;
  enabled?: boolean;
}

export interface UpdateAlertRuleInput {
  condition?: AlertRule['condition'];
  threshold?: number;
  window_seconds?: number;
  enabled?: boolean;
}

export default AlertRule;
