CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.platform_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID NULL REFERENCES projects.projects(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_id VARCHAR(100) NULL,
  ip_hash VARCHAR(64) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE OR REPLACE FUNCTION analytics.create_monthly_partition(year_param INT, month_param INT)
RETURNS VOID AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  partition_name TEXT;
BEGIN
  start_date := make_date(year_param, month_param, 1);
  end_date := (start_date + INTERVAL '1 month')::DATE;
  partition_name := format('platform_events_%s_%s', year_param, lpad(month_param::TEXT, 2, '0'));

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS analytics.%I PARTITION OF analytics.platform_events FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;

SELECT analytics.create_monthly_partition(EXTRACT(YEAR FROM NOW())::INT, EXTRACT(MONTH FROM NOW())::INT);
SELECT analytics.create_monthly_partition(EXTRACT(YEAR FROM NOW() + INTERVAL '1 month')::INT, EXTRACT(MONTH FROM NOW() + INTERVAL '1 month')::INT);
SELECT analytics.create_monthly_partition(EXTRACT(YEAR FROM NOW() + INTERVAL '2 month')::INT, EXTRACT(MONTH FROM NOW() + INTERVAL '2 month')::INT);
SELECT analytics.create_monthly_partition(EXTRACT(YEAR FROM NOW() + INTERVAL '3 month')::INT, EXTRACT(MONTH FROM NOW() + INTERVAL '3 month')::INT);

CREATE INDEX IF NOT EXISTS analytics_platform_events_event_type_created_idx
  ON analytics.platform_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_platform_events_user_event_created_idx
  ON analytics.platform_events (user_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_platform_events_project_created_idx
  ON analytics.platform_events (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_platform_events_created_idx
  ON analytics.platform_events (created_at DESC);

CREATE TABLE IF NOT EXISTS analytics.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NULL,
  before_state JSONB NULL,
  after_state JSONB NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_audit_logs_admin_created_idx
  ON analytics.audit_logs (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_audit_logs_target_created_idx
  ON analytics.audit_logs (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_audit_logs_action_created_idx
  ON analytics.audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_audit_logs_created_idx
  ON analytics.audit_logs (created_at DESC);

COMMENT ON TABLE analytics.audit_logs IS 'Append-only immutable audit trail. DO NOT ADD UPDATE OR DELETE TRIGGERS.';
