CREATE SCHEMA "ai";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai"."agent_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"output_data" jsonb NOT NULL,
	"raw_text" text NOT NULL,
	"parse_success" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai"."agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"phase" smallint NOT NULL,
	"agent_type" varchar(64) NOT NULL,
	"model" varchar(64) NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"cost_usd" varchar(20),
	"duration_ms" integer,
	"error_message" text,
	"error_code" varchar(64),
	"rag_context_used" boolean DEFAULT false NOT NULL,
	"rag_chunks_injected" integer DEFAULT 0 NOT NULL,
	"context_tokens_estimate" integer,
	"was_context_compressed" boolean DEFAULT false NOT NULL,
	"doc_injection_mode" varchar(32),
	"retry_of_run_id" uuid,
	"batch_number" integer,
	"batch_total" integer,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai"."generation_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"plan_data" jsonb NOT NULL,
	"tier" varchar(32) NOT NULL,
	"total_files" integer NOT NULL,
	"total_batches" integer NOT NULL,
	"architecture" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"completed_batches" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai"."prompt_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase" smallint NOT NULL,
	"agent_type" varchar(64) NOT NULL,
	"template" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai"."agent_outputs" ADD CONSTRAINT "agent_outputs_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "ai"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agent_outputs_run_id_idx" ON "ai"."agent_outputs" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_runs_user_created_idx" ON "ai"."agent_runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_runs_project_phase_idx" ON "ai"."agent_runs" USING btree ("project_id","phase");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_runs_status_created_idx" ON "ai"."agent_runs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_runs_agent_model_created_idx" ON "ai"."agent_runs" USING btree ("agent_type","model","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "generation_plans_project_idx" ON "ai"."generation_plans" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prompt_templates_agent_active_idx" ON "ai"."prompt_templates" USING btree ("agent_type","is_active");