-- ============================================================
--  AI STARTUP BUILDER — Complete PostgreSQL Schema
--  Version 1.0 | 28 Tables | 7 Schemas
--  Copy-paste this entire file into psql or any PG client
-- ============================================================

-- ─────────────────────────────────────────────
--  STEP 1: Extensions
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- text search indexes
CREATE EXTENSION IF NOT EXISTS "moddatetime";     -- auto updated_at trigger

-- ─────────────────────────────────────────────
--  STEP 2: Schemas (one per microservice)
-- ─────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS projects;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS analytics;

-- ─────────────────────────────────────────────
--  STEP 3: ENUM Types
-- ─────────────────────────────────────────────

-- Auth enums
CREATE TYPE auth.user_role_enum     AS ENUM ('user', 'admin', 'super_admin');
CREATE TYPE auth.plan_enum          AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE auth.user_status_enum   AS ENUM ('active', 'suspended', 'pending_verification');

-- Projects enums
CREATE TYPE projects.status_enum    AS ENUM ('active', 'archived', 'launched', 'deleted');
CREATE TYPE projects.mode_enum      AS ENUM ('design', 'dev');

-- AI enums
CREATE TYPE ai.run_status_enum      AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE ai.doc_status_enum      AS ENUM ('pending', 'indexing', 'indexed', 'failed');

-- Billing enums
CREATE TYPE billing.sub_status_enum AS ENUM ('active', 'past_due', 'cancelled', 'trialing', 'paused');
CREATE TYPE billing.tx_status_enum  AS ENUM ('succeeded', 'failed', 'refunded', 'pending');


-- ============================================================
--  SCHEMA: auth
-- ============================================================

-- ─────────────────────────────────────────────
--  auth.users  (core identity — referenced by ALL schemas)
-- ─────────────────────────────────────────────
CREATE TABLE auth.users (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    email                VARCHAR(255)  UNIQUE NOT NULL,
    email_verified_at    TIMESTAMPTZ   NULL,
    password_hash        VARCHAR(255)  NULL,                     -- NULL for OAuth-only users
    full_name            VARCHAR(200)  NOT NULL,
    avatar_url           TEXT          NULL,
    role                 auth.user_role_enum   NOT NULL DEFAULT 'user',
    plan_tier            auth.plan_enum        NOT NULL DEFAULT 'free',
    status               auth.user_status_enum NOT NULL DEFAULT 'active',
    onboarding_completed BOOLEAN       NOT NULL DEFAULT FALSE,
    last_active_at       TIMESTAMPTZ   NULL,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ   NULL
);

CREATE UNIQUE INDEX idx_users_email
    ON auth.users(email) WHERE deleted_at IS NULL;

-- Auto-update updated_at
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);


-- ─────────────────────────────────────────────
--  auth.oauth_accounts
-- ─────────────────────────────────────────────
CREATE TABLE auth.oauth_accounts (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider           VARCHAR(50)  NOT NULL,                    -- google | github
    provider_user_id   VARCHAR(255) NOT NULL,
    access_token       TEXT         NOT NULL,                    -- store encrypted in app layer
    refresh_token      TEXT         NULL,
    expires_at         TIMESTAMPTZ  NULL,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_user_id)
);


-- ─────────────────────────────────────────────
--  auth.refresh_tokens
-- ─────────────────────────────────────────────
CREATE TABLE auth.refresh_tokens (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash   VARCHAR(255) UNIQUE NOT NULL,                   -- SHA-256 of the raw token
    device_info  JSONB        NULL,                              -- { userAgent, ip, platform }
    expires_at   TIMESTAMPTZ  NOT NULL,
    revoked_at   TIMESTAMPTZ  NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON auth.refresh_tokens(user_id);


-- ─────────────────────────────────────────────
--  auth.mfa_credentials
-- ─────────────────────────────────────────────
CREATE TABLE auth.mfa_credentials (
    id                UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID      UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    secret_encrypted  TEXT      NOT NULL,                        -- AES-256-GCM encrypted TOTP
    backup_codes      TEXT[]    NOT NULL,                        -- array of 10 bcrypt-hashed codes
    enabled           BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
--  SCHEMA: users
-- ============================================================

-- ─────────────────────────────────────────────
--  users.user_profiles  (1:1 with auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE users.user_profiles (
    id                  UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role_type           VARCHAR(50)  NULL,                       -- Founder | Designer | Developer | Other
    bio                 TEXT         NULL,
    company_name        VARCHAR(200) NULL,
    website_url         TEXT         NULL,
    timezone            VARCHAR(100) NOT NULL DEFAULT 'UTC',
    notification_prefs  JSONB        NOT NULL DEFAULT '{}',      -- { emailOnPhaseComplete, emailOnBilling, inAppAll }
    theme_prefs         JSONB        NOT NULL DEFAULT '{}',      -- { preferredMode: design|dev, sidebarCollapsed }
    api_key_hash        VARCHAR(255) NULL UNIQUE,                -- SHA-256 hash of developer API key
    api_key_prefix      VARCHAR(20)  NULL,                       -- first 8 chars shown to user
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON users.user_profiles
    FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);


-- ─────────────────────────────────────────────
--  users.user_integrations
-- ─────────────────────────────────────────────
CREATE TABLE users.user_integrations (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service             VARCHAR(50)  NOT NULL,                   -- notion | github | figma | vercel | posthog | ga4
    access_token_enc    TEXT         NOT NULL,
    refresh_token_enc   TEXT         NULL,
    scopes              TEXT[]       NOT NULL DEFAULT '{}',
    metadata            JSONB        NOT NULL DEFAULT '{}',      -- { workspaceId, repoName, etc. }
    expires_at          TIMESTAMPTZ  NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, service)
);


-- ============================================================
--  SCHEMA: projects
-- ============================================================

-- ─────────────────────────────────────────────
--  projects.projects
-- ─────────────────────────────────────────────
CREATE TABLE projects.projects (
    id               UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID                   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name             VARCHAR(255)           NOT NULL,
    description      TEXT                   NULL,
    emoji            VARCHAR(10)            NOT NULL DEFAULT '🚀',
    current_phase    SMALLINT               NOT NULL DEFAULT 1 CHECK (current_phase BETWEEN 1 AND 6),
    status           projects.status_enum   NOT NULL DEFAULT 'active',
    is_starred       BOOLEAN                NOT NULL DEFAULT FALSE,
    mode             projects.mode_enum     NOT NULL DEFAULT 'design',
    phase_progress   JSONB                  NOT NULL DEFAULT '{}',  -- { "1": "complete", "2": "active", "3": "locked" }
    context_summary  TEXT                   NULL,
    last_active_at   TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
    launched_at      TIMESTAMPTZ            NULL,
    created_at       TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ            NULL
);

CREATE INDEX idx_projects_user_active
    ON projects.projects(user_id, last_active_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_projects_starred
    ON projects.projects(user_id, is_starred) WHERE deleted_at IS NULL;

CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON projects.projects
    FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);


-- ─────────────────────────────────────────────
--  projects.phase_outputs
-- ─────────────────────────────────────────────
CREATE TABLE projects.phase_outputs (
    id           UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID       NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    phase        SMALLINT   NOT NULL CHECK (phase BETWEEN 1 AND 6),
    output_data  JSONB      NOT NULL,                            -- full structured agent output
    version      SMALLINT   NOT NULL DEFAULT 1,
    is_current   BOOLEAN    NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- only one active output per project+phase
    UNIQUE (project_id, phase) DEFERRABLE INITIALLY DEFERRED  -- partial index below handles this better
);

CREATE UNIQUE INDEX idx_phase_outputs_current
    ON projects.phase_outputs(project_id, phase) WHERE is_current = TRUE;


-- ─────────────────────────────────────────────
--  projects.project_files
-- ─────────────────────────────────────────────
CREATE TABLE projects.project_files (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID         NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    path         VARCHAR(500) NOT NULL,                          -- e.g. /src/controllers/user.ts
    content      TEXT         NOT NULL,
    language     VARCHAR(50)  NULL,                              -- typescript | json | yaml | css
    agent_type   VARCHAR(100) NULL,                              -- schema | api | backend | frontend
    is_modified  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, path)
);

CREATE INDEX idx_project_files_agent ON projects.project_files(project_id, agent_type);

CREATE TRIGGER project_files_updated_at
    BEFORE UPDATE ON projects.project_files
    FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);


-- ─────────────────────────────────────────────
--  projects.design_canvas
-- ─────────────────────────────────────────────
CREATE TABLE projects.design_canvas (
    id             UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id     UUID  UNIQUE NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    canvas_data    JSONB NOT NULL,                               -- element tree: [{ id, type, x, y, w, h, props, children }]
    pages          JSONB NOT NULL DEFAULT '[]',                  -- [{ id, name, artboardId }]
    design_tokens  JSONB NOT NULL DEFAULT '{}',                  -- colors, fonts, spacing from Phase 2
    viewport       JSONB NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER design_canvas_updated_at
    BEFORE UPDATE ON projects.design_canvas
    FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);


-- ============================================================
--  SCHEMA: ai
-- ============================================================

-- ─────────────────────────────────────────────
--  ai.agent_runs  (immutable — no soft delete, no update)
-- ─────────────────────────────────────────────
CREATE TABLE ai.agent_runs (
    id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID              NOT NULL REFERENCES projects.projects(id),
    user_id           UUID              NOT NULL REFERENCES auth.users(id),     -- denormalized for analytics
    phase             SMALLINT          NOT NULL CHECK (phase BETWEEN 1 AND 6),
    agent_type        VARCHAR(100)      NOT NULL,                -- idea_analyzer | market_research | validation | prd | etc.
    model             VARCHAR(100)      NOT NULL,                -- claude-sonnet-4-5 | claude-opus-4-5 | gpt-4o
    status            ai.run_status_enum NOT NULL,
    prompt_tokens     INTEGER           NULL,
    completion_tokens INTEGER           NULL,
    total_tokens      INTEGER           NULL,
    cost_usd          DECIMAL(10,6)     NULL,
    duration_ms       INTEGER           NULL,
    error_message     TEXT              NULL,
    output_snapshot   JSONB             NULL,
    rag_context_used  BOOLEAN           NOT NULL DEFAULT FALSE,
    started_at        TIMESTAMPTZ       NULL,
    completed_at      TIMESTAMPTZ       NULL,
    created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_runs_user_month    ON ai.agent_runs(user_id, created_at DESC);
CREATE INDEX idx_agent_runs_project_phase ON ai.agent_runs(project_id, phase, created_at DESC);
CREATE INDEX idx_agent_runs_analytics     ON ai.agent_runs(created_at, status);

-- Partition by month for scale (run manually after table creation in prod):
-- ALTER TABLE ai.agent_runs PARTITION BY RANGE (created_at);
-- CREATE TABLE ai.agent_runs_2025_01 PARTITION OF ai.agent_runs
--     FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');


-- ─────────────────────────────────────────────
--  ai.conversation_messages
-- ─────────────────────────────────────────────
CREATE TABLE ai.conversation_messages (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID        NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    phase         SMALLINT    NOT NULL,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content       TEXT        NOT NULL,
    agent_run_id  UUID        NULL REFERENCES ai.agent_runs(id),
    metadata      JSONB       NOT NULL DEFAULT '{}',             -- { tokenCount, model, streamDone }
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conv_project_phase
    ON ai.conversation_messages(project_id, phase, created_at ASC);


-- ─────────────────────────────────────────────
--  ai.rag_documents
-- ─────────────────────────────────────────────
CREATE TABLE ai.rag_documents (
    id                  UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID              NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name                VARCHAR(255)      NOT NULL,
    source_type         VARCHAR(50)       NOT NULL,              -- upload | url | paste
    source_url          TEXT              NULL,
    s3_key              TEXT              NULL,
    content_hash        VARCHAR(64)       NOT NULL,              -- SHA-256 for dedup
    chunk_count         INTEGER           NULL,
    status              ai.doc_status_enum NOT NULL DEFAULT 'pending',
    pinecone_namespace  VARCHAR(255)      NOT NULL,              -- user_{userId}
    created_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rag_user_status ON ai.rag_documents(user_id, status);


-- ─────────────────────────────────────────────
--  ai.feature_flags
-- ─────────────────────────────────────────────
CREATE TABLE ai.feature_flags (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    key               VARCHAR(100) UNIQUE NOT NULL,              -- design_mode | rag_ai | growth_dashboard
    description       TEXT         NOT NULL,
    enabled           BOOLEAN      NOT NULL DEFAULT FALSE,
    rollout_percent   SMALLINT     NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
    plan_restriction  TEXT[]       NOT NULL DEFAULT '{}',        -- ['pro','enterprise']
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER feature_flags_updated_at
    BEFORE UPDATE ON ai.feature_flags
    FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);


-- ============================================================
--  SCHEMA: billing
-- ============================================================

-- ─────────────────────────────────────────────
--  billing.plans
-- ─────────────────────────────────────────────
CREATE TABLE billing.plans (
    id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name                     VARCHAR(100) UNIQUE NOT NULL,       -- free | pro | enterprise
    display_name             VARCHAR(100) NOT NULL,
    price_monthly_cents      INTEGER      NOT NULL DEFAULT 0,
    price_yearly_cents       INTEGER      NOT NULL DEFAULT 0,
    stripe_product_id        VARCHAR(100) NULL,
    stripe_monthly_price_id  VARCHAR(100) NULL,
    stripe_yearly_price_id   VARCHAR(100) NULL,
    token_limit_monthly      BIGINT       NOT NULL,              -- 50000 free / 500000 pro
    project_limit            INTEGER      NOT NULL DEFAULT 3,    -- -1 = unlimited
    features                 TEXT[]       NOT NULL DEFAULT '{}',
    is_active                BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed the three default plans
INSERT INTO billing.plans (name, display_name, price_monthly_cents, price_yearly_cents, token_limit_monthly, project_limit, features)
VALUES
    ('free',       'Free Plan',       0,    0,      50000,   3,  ARRAY['Phase 1 & 2 only', '3 projects', '50K tokens/month']),
    ('pro',        'Pro Plan',        2900, 29000,  500000,  -1, ARRAY['All 6 phases', 'Unlimited projects', '500K tokens/month', 'Export & deploy']),
    ('enterprise', 'Enterprise Plan', 9900, 99000, 5000000,  -1, ARRAY['All Pro features', '5M tokens/month', 'Custom integrations', 'SLA']);


-- ─────────────────────────────────────────────
--  billing.subscriptions
-- ─────────────────────────────────────────────
CREATE TABLE billing.subscriptions (
    id                      UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID                     NOT NULL REFERENCES auth.users(id),
    plan_id                 UUID                     NOT NULL REFERENCES billing.plans(id),
    stripe_customer_id      VARCHAR(100)             UNIQUE NOT NULL,
    stripe_subscription_id  VARCHAR(100)             UNIQUE NULL,   -- NULL for free plan
    status                  billing.sub_status_enum  NOT NULL,
    billing_cycle           VARCHAR(10)              NOT NULL DEFAULT 'monthly',  -- monthly | yearly
    current_period_start    TIMESTAMPTZ              NULL,
    current_period_end      TIMESTAMPTZ              NULL,
    cancelled_at            TIMESTAMPTZ              NULL,
    cancel_at_period_end    BOOLEAN                  NOT NULL DEFAULT FALSE,
    trial_end               TIMESTAMPTZ              NULL,
    created_at              TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subs_user_status ON billing.subscriptions(user_id, status);

CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON billing.subscriptions
    FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);


-- ─────────────────────────────────────────────
--  billing.transactions  (immutable)
-- ─────────────────────────────────────────────
CREATE TABLE billing.transactions (
    id                    UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID                    NOT NULL REFERENCES auth.users(id),
    subscription_id       UUID                    NULL REFERENCES billing.subscriptions(id),
    stripe_invoice_id     VARCHAR(100)            UNIQUE NULL,
    stripe_charge_id      VARCHAR(100)            NULL,
    amount_cents          INTEGER                 NOT NULL,
    currency              VARCHAR(3)              NOT NULL DEFAULT 'usd',
    status                billing.tx_status_enum  NOT NULL,
    description           TEXT                    NULL,
    refunded_amount_cents INTEGER                 NOT NULL DEFAULT 0,
    refunded_at           TIMESTAMPTZ             NULL,
    invoice_pdf_url       TEXT                    NULL,
    created_at            TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON billing.transactions(user_id, created_at DESC);


-- ─────────────────────────────────────────────
--  billing.coupons
-- ─────────────────────────────────────────────
CREATE TABLE billing.coupons (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    code              VARCHAR(50)    UNIQUE NOT NULL,
    discount_type     VARCHAR(10)    NOT NULL CHECK (discount_type IN ('percent', 'amount')),
    discount_value    DECIMAL(10,2)  NOT NULL,
    max_uses          INTEGER        NULL,                       -- NULL = unlimited
    used_count        INTEGER        NOT NULL DEFAULT 0,
    expires_at        TIMESTAMPTZ    NULL,
    stripe_coupon_id  VARCHAR(100)   NULL,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────
--  billing.token_usage  (updated after every agent run)
-- ─────────────────────────────────────────────
CREATE TABLE billing.token_usage (
    id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID           NOT NULL REFERENCES auth.users(id),
    month         DATE           NOT NULL,                       -- first day of month: 2025-01-01
    tokens_used   BIGINT         NOT NULL DEFAULT 0,
    tokens_limit  BIGINT         NOT NULL,
    cost_usd      DECIMAL(10,4)  NOT NULL DEFAULT 0,
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, month)
);

CREATE UNIQUE INDEX idx_token_usage_user_month ON billing.token_usage(user_id, month);


-- ============================================================
--  SCHEMA: notifications
-- ============================================================

-- ─────────────────────────────────────────────
--  notifications.notifications
-- ─────────────────────────────────────────────
CREATE TABLE notifications.notifications (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type        VARCHAR(100) NOT NULL,                           -- phase_complete | agent_done | billing_event | system_alert
    title       VARCHAR(255) NOT NULL,
    body        TEXT         NOT NULL,
    action_url  TEXT         NULL,
    is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
    metadata    JSONB        NOT NULL DEFAULT '{}',              -- { projectId, phase, agentRunId }
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user_unread
    ON notifications.notifications(user_id, is_read, created_at DESC);


-- ─────────────────────────────────────────────
--  notifications.email_logs
-- ─────────────────────────────────────────────
CREATE TABLE notifications.email_logs (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID         NULL REFERENCES auth.users(id),  -- NULL for non-user emails
    to_email           VARCHAR(255) NOT NULL,
    template           VARCHAR(100) NOT NULL,                    -- welcome | reset_password | billing_receipt | phase_complete
    resend_message_id  VARCHAR(255) NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'sent',     -- sent | delivered | bounced | failed
    opened_at          TIMESTAMPTZ  NULL,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_logs_user ON notifications.email_logs(user_id, created_at DESC);


-- ============================================================
--  SCHEMA: analytics
-- ============================================================

-- ─────────────────────────────────────────────
--  analytics.platform_events  (append-only)
-- ─────────────────────────────────────────────
CREATE TABLE analytics.platform_events (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NULL REFERENCES auth.users(id),    -- NULL for anonymous events
    project_id  UUID         NULL REFERENCES projects.projects(id),
    event_type  VARCHAR(100) NOT NULL,                          -- user.signed_up | project.created | phase.advanced | agent.ran | plan.upgraded
    properties  JSONB        NOT NULL DEFAULT '{}',
    session_id  VARCHAR(100) NULL,
    ip_hash     VARCHAR(64)  NULL,                              -- SHA-256 of IP (privacy-preserving)
    user_agent  TEXT         NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_type_time
    ON analytics.platform_events(event_type, created_at DESC);

CREATE INDEX idx_events_user_funnel
    ON analytics.platform_events(user_id, event_type, created_at DESC);

-- Partition comment (run in prod per month):
-- ALTER TABLE analytics.platform_events PARTITION BY RANGE (created_at);


-- ─────────────────────────────────────────────
--  analytics.audit_logs  (immutable admin trail — never delete)
-- ─────────────────────────────────────────────
CREATE TABLE analytics.audit_logs (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id      UUID         NOT NULL REFERENCES auth.users(id),
    action        VARCHAR(100) NOT NULL,                        -- user.suspended | plan.changed | flag.toggled
    target_type   VARCHAR(50)  NOT NULL,                        -- user | project | plan | feature_flag
    target_id     UUID         NULL,
    before_state  JSONB        NULL,
    after_state   JSONB        NULL,
    ip_address    INET         NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin   ON analytics.audit_logs(admin_id, created_at DESC);
CREATE INDEX idx_audit_logs_target  ON analytics.audit_logs(target_type, target_id, created_at DESC);


-- ============================================================
--  Row-Level Security (RLS) — defence in depth
--  Enable on all user-data tables. Services use
--  SET LOCAL app.current_user_id = '<uuid>' per request.
-- ============================================================

ALTER TABLE auth.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects.projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects.phase_outputs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects.project_files  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.agent_runs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.rag_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.token_usage     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications.notifications ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (repeat pattern for each table):
CREATE POLICY users_isolation ON auth.users
    USING (id = current_setting('app.current_user_id', TRUE)::UUID
           OR current_setting('app.is_admin', TRUE) = 'true');

CREATE POLICY projects_isolation ON projects.projects
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID
           OR current_setting('app.is_admin', TRUE) = 'true');


-- ============================================================
--  Verification query — run after applying this schema
-- ============================================================
/*
SELECT
    schemaname,
    COUNT(*) AS table_count
FROM pg_tables
WHERE schemaname IN ('auth','users','projects','ai','billing','notifications','analytics')
GROUP BY schemaname
ORDER BY schemaname;

-- Expected output:
-- auth           | 4
-- users          | 2
-- projects       | 4
-- ai             | 4
-- billing        | 5
-- notifications  | 2
-- analytics      | 2
-- Total: 23 tables (+ audit_logs + platform_events = 25 base tables)
*/

-- ============================================================
--  END OF SCHEMA
-- ============================================================
