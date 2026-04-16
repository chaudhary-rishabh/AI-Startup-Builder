ALTER TABLE "projects"."projects" ADD COLUMN "build_mode" varchar(10) DEFAULT 'copilot' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects"."projects" ADD COLUMN "user_preferences" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects"."projects" ADD COLUMN "copilot_questions_answered" boolean DEFAULT false NOT NULL;--> statement-breakpoint
COMMENT ON COLUMN "projects"."projects"."build_mode" IS 'autopilot | copilot | manual — set at project creation';--> statement-breakpoint
COMMENT ON COLUMN "projects"."projects"."user_preferences" IS '{ scale, platform, primaryColor, architecture, brandFeel, allowAiDecide }';--> statement-breakpoint
COMMENT ON COLUMN "projects"."design_canvas"."canvas_data" IS 'HTML prototype screens: [{ screenName, html, route, generatedAt }]';