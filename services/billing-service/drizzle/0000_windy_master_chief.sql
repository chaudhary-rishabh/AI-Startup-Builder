CREATE SCHEMA "billing";
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."sub_status_enum" AS ENUM('active', 'past_due', 'cancelled', 'trialing', 'paused');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."tx_status_enum" AS ENUM('succeeded', 'failed', 'refunded', 'pending');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing"."coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"discount_type" varchar(10) NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"valid_for_plans" text[] DEFAULT  NOT NULL,
	"expires_at" timestamp with time zone,
	"stripe_coupon_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing"."plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"price_monthly_cents" integer DEFAULT 0 NOT NULL,
	"price_yearly_cents" integer DEFAULT 0 NOT NULL,
	"stripe_price_monthly_id" varchar(100),
	"stripe_price_yearly_id" varchar(100),
	"stripe_product_id" varchar(100),
	"token_limit_monthly" bigint NOT NULL,
	"project_limit" integer DEFAULT 3 NOT NULL,
	"api_key_limit" integer DEFAULT 2 NOT NULL,
	"features" text[] DEFAULT  NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing"."subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"stripe_customer_id" varchar(100) NOT NULL,
	"stripe_subscription_id" varchar(100),
	"status" "sub_status_enum" NOT NULL,
	"billing_cycle" varchar(10),
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"cancelled_at" timestamp with time zone,
	"trial_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing"."token_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"month" date NOT NULL,
	"tokens_used" bigint DEFAULT 0 NOT NULL,
	"tokens_limit" bigint NOT NULL,
	"cost_usd" numeric(10, 4) DEFAULT '0.0000' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing"."transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid,
	"stripe_invoice_id" varchar(100),
	"stripe_charge_id" varchar(100),
	"stripe_event_id" varchar(100),
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"status" "tx_status_enum" NOT NULL,
	"description" text,
	"refunded_amount_cents" integer DEFAULT 0 NOT NULL,
	"refunded_at" timestamp with time zone,
	"invoice_pdf_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_coupons_code_uniq" ON "billing"."coupons" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_plans_name_idx" ON "billing"."plans" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_plans_active_idx" ON "billing"."plans" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_subscriptions_user_id_uniq" ON "billing"."subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_subscriptions_customer_id_uniq" ON "billing"."subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_subscriptions_stripe_sub_id_uniq" ON "billing"."subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_subscriptions_status_period_idx" ON "billing"."subscriptions" USING btree ("status","current_period_end");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_token_usage_user_month_uniq" ON "billing"."token_usage" USING btree ("user_id","month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_token_usage_user_month_idx" ON "billing"."token_usage" USING btree ("user_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_transactions_invoice_id_uniq" ON "billing"."transactions" USING btree ("stripe_invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_transactions_event_id_idx" ON "billing"."transactions" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_transactions_user_created_idx" ON "billing"."transactions" USING btree ("user_id","created_at");