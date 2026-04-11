CREATE SCHEMA "projects";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects"."conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"phase" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"agent_run_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects"."design_canvas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"canvas_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"design_tokens" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"viewport" jsonb DEFAULT '{"x":0,"y":0,"zoom":1}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "design_canvas_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects"."phase_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"phase" integer NOT NULL,
	"output_data" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects"."project_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"path" text NOT NULL,
	"content" text NOT NULL,
	"language" text,
	"agent_type" text,
	"is_modified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects"."projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"emoji" text DEFAULT '🚀' NOT NULL,
	"current_phase" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"is_starred" boolean DEFAULT false NOT NULL,
	"mode" text DEFAULT 'design' NOT NULL,
	"phase_progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"context_summary" text,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"launched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects"."conversation_messages" ADD CONSTRAINT "conversation_messages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects"."design_canvas" ADD CONSTRAINT "design_canvas_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects"."phase_outputs" ADD CONSTRAINT "phase_outputs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects"."project_files" ADD CONSTRAINT "project_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_project_phase_idx" ON "projects"."conversation_messages" USING btree ("project_id","phase","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_agent_run_idx" ON "projects"."conversation_messages" USING btree ("agent_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "design_canvas_project_idx" ON "projects"."design_canvas" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "phase_outputs_project_phase_idx" ON "projects"."phase_outputs" USING btree ("project_id","phase");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "phase_outputs_current_idx" ON "projects"."phase_outputs" USING btree ("project_id","phase","is_current");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "project_files_path_idx" ON "projects"."project_files" USING btree ("project_id","path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_files_agent_idx" ON "projects"."project_files" USING btree ("project_id","agent_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_user_active_idx" ON "projects"."projects" USING btree ("user_id","last_active_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_user_status_idx" ON "projects"."projects" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_starred_idx" ON "projects"."projects" USING btree ("user_id","is_starred");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_search_idx" ON "projects"."projects" USING btree ("name");