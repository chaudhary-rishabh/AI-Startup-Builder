CREATE TABLE IF NOT EXISTS "ai"."rag_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"filename" varchar(255),
	"source_type" varchar(50) NOT NULL,
	"file_type" varchar(50),
	"file_size_bytes" integer,
	"source_url" text,
	"s3_key" text,
	"content_hash" varchar(64) NOT NULL,
	"chunk_count" integer,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"pinecone_namespace" varchar(255) NOT NULL,
	"custom_instructions" text,
	"indexed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai"."agent_runs" ALTER COLUMN "error_code" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "ai"."agent_runs" ALTER COLUMN "doc_injection_mode" SET DATA TYPE varchar(20);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rag_user_status" ON "ai"."rag_documents" USING btree ("user_id","status");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai"."agent_runs" ADD CONSTRAINT "agent_runs_retry_of_run_id_agent_runs_id_fk" FOREIGN KEY ("retry_of_run_id") REFERENCES "ai"."agent_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "ai"."generation_plans" ALTER COLUMN "tier" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "ai"."generation_plans" ALTER COLUMN "architecture" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "ai"."generation_plans" ALTER COLUMN "status" SET DATA TYPE varchar(20);--> statement-breakpoint
DO $fkgen$ BEGIN
 IF to_regclass('projects.projects') IS NOT NULL THEN
  BEGIN
   ALTER TABLE "ai"."generation_plans" ADD CONSTRAINT "generation_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END;
 END IF;
END $fkgen$;--> statement-breakpoint
DO $fkrag$ BEGIN
 IF to_regclass('auth.users') IS NOT NULL THEN
  BEGIN
   ALTER TABLE "ai"."rag_documents" ADD CONSTRAINT "rag_documents_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END;
 END IF;
END $fkrag$;--> statement-breakpoint
DO $ext$ BEGIN
 CREATE EXTENSION IF NOT EXISTS "moddatetime";
EXCEPTION
 WHEN undefined_file THEN null;
 WHEN insufficient_privilege THEN null;
END $ext$;--> statement-breakpoint
DO $trg$ BEGIN
 CREATE TRIGGER "generation_plans_updated_at" BEFORE UPDATE ON "ai"."generation_plans" FOR EACH ROW EXECUTE PROCEDURE moddatetime("updated_at");
EXCEPTION
 WHEN undefined_function THEN null;
 WHEN duplicate_object THEN null;
END $trg$;
--> statement-breakpoint
COMMENT ON COLUMN "ai"."agent_runs"."error_code" IS 'PROVIDER_RATE_LIMIT | BUDGET_EXCEEDED | CONTEXT_TOO_LARGE | TIMEOUT | INTERNAL_ERROR';--> statement-breakpoint
COMMENT ON COLUMN "ai"."agent_runs"."doc_injection_mode" IS 'direct | compressed | contextual_rag | none';--> statement-breakpoint
COMMENT ON COLUMN "ai"."agent_runs"."batch_number" IS 'Phase 4 multi-batch tracking — which batch within a generation run';--> statement-breakpoint
COMMENT ON COLUMN "ai"."agent_runs"."retry_of_run_id" IS 'Points to original run_id when this run is a retry';
