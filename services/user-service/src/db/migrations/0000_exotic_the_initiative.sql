CREATE SCHEMA "users";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users"."onboarding_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"current_step" text DEFAULT 'profile' NOT NULL,
	"completed_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"step_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users"."user_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"service" text NOT NULL,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users"."user_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role_type" text,
	"bio" text,
	"company_name" text,
	"website_url" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"notification_prefs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"theme_prefs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_user_idx" ON "users"."onboarding_state" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "integrations_user_service_idx" ON "users"."user_integrations" USING btree ("user_id","service");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integrations_user_idx" ON "users"."user_integrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_profiles_created_at_idx" ON "users"."user_profiles" USING btree ("created_at");