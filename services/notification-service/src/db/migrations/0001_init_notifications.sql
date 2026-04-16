CREATE SCHEMA IF NOT EXISTS notifications;

CREATE TABLE IF NOT EXISTS notifications.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notif_notifications_user_read_created_idx
  ON notifications.notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS notif_notifications_user_created_idx
  ON notifications.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notif_notifications_user_type_created_idx
  ON notifications.notifications (user_id, type, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  to_email VARCHAR(255) NOT NULL,
  template VARCHAR(100) NOT NULL,
  resend_message_id VARCHAR(255) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  error_message TEXT NULL,
  opened_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS notif_email_logs_resend_message_id_uniq
  ON notifications.email_logs (resend_message_id);
CREATE INDEX IF NOT EXISTS notif_email_logs_user_created_idx
  ON notifications.email_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notif_email_logs_email_template_created_idx
  ON notifications.email_logs (to_email, template, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications.notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  phase_complete BOOLEAN NOT NULL DEFAULT TRUE,
  agent_done BOOLEAN NOT NULL DEFAULT TRUE,
  billing_events BOOLEAN NOT NULL DEFAULT TRUE,
  token_warnings BOOLEAN NOT NULL DEFAULT TRUE,
  rag_status BOOLEAN NOT NULL DEFAULT TRUE,
  export_ready BOOLEAN NOT NULL DEFAULT TRUE,
  weekly_digest BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
