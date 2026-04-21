-- Razorpay migration: rename Stripe columns, credits, topups, INR paise pricing
-- Run after 0001_init_billing.sql

ALTER TABLE billing.subscriptions RENAME COLUMN stripe_customer_id TO razorpay_customer_id;
ALTER TABLE billing.subscriptions RENAME COLUMN stripe_subscription_id TO razorpay_subscription_id;

ALTER TABLE billing.subscriptions
  ADD COLUMN IF NOT EXISTS signup_credits_granted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_one_time_credits BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE billing.token_usage
  ADD COLUMN IF NOT EXISTS bonus_tokens BIGINT NOT NULL DEFAULT 0;

ALTER TABLE billing.transactions
  ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(100) NULL;

ALTER TABLE billing.transactions ALTER COLUMN stripe_invoice_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS billing_transactions_razorpay_payment_id_uniq
  ON billing.transactions (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

ALTER TABLE billing.plans RENAME COLUMN price_monthly_cents TO price_monthly_paise;
ALTER TABLE billing.plans RENAME COLUMN price_yearly_cents TO price_yearly_paise;

UPDATE billing.plans SET
  price_monthly_paise = 0,
  price_yearly_paise = 0
WHERE name = 'free';

UPDATE billing.plans SET
  price_monthly_paise = 149900,
  price_yearly_paise = 1499000,
  token_limit_monthly = 500000
WHERE name = 'pro';

UPDATE billing.plans SET
  price_monthly_paise = 399900,
  price_yearly_paise = 3999000,
  token_limit_monthly = 2000000
WHERE name = 'team';

INSERT INTO billing.plans
  (name, display_name, price_monthly_paise, price_yearly_paise,
   token_limit_monthly, project_limit, api_key_limit, features, is_active, sort_order)
VALUES
  ('starter', 'Starter', 49900, 499000, 100000, 5, 10, ARRAY[]::text[], TRUE, 2)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price_monthly_paise = EXCLUDED.price_monthly_paise,
  price_yearly_paise = EXCLUDED.price_yearly_paise,
  token_limit_monthly = EXCLUDED.token_limit_monthly,
  project_limit = EXCLUDED.project_limit;

CREATE TABLE IF NOT EXISTS billing.credit_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  razorpay_order_id VARCHAR(100) NOT NULL UNIQUE,
  razorpay_payment_id VARCHAR(100) NULL UNIQUE,
  tokens_granted BIGINT NOT NULL,
  amount_paise INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  pack_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_topups_user ON billing.credit_topups(user_id, status);

CREATE TABLE IF NOT EXISTS billing.re_engagement_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  send_at TIMESTAMPTZ NOT NULL,
  template VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
