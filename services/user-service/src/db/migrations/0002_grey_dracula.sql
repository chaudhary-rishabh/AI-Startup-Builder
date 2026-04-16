ALTER TABLE "users"."user_profiles" ADD COLUMN "onboarding_step" varchar(50) DEFAULT 'profile' NOT NULL;--> statement-breakpoint
ALTER TABLE "users"."user_profiles" ADD COLUMN "onboarding_data" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
COMMENT ON COLUMN "users"."user_profiles"."onboarding_step" IS 'profile | idea | plan | complete — denormalized onboarding pointer';--> statement-breakpoint
COMMENT ON COLUMN "users"."user_profiles"."onboarding_data" IS 'Arbitrary JSON for in-progress onboarding answers';