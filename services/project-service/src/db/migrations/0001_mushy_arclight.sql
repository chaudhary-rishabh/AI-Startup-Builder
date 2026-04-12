CREATE TABLE IF NOT EXISTS "projects"."project_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"format" text NOT NULL,
	"include_phases" jsonb DEFAULT '[1,2,3,4,5,6]'::jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"s3_key" text,
	"download_url" text,
	"expires_at" timestamp with time zone,
	"file_size_bytes" integer,
	"error_message" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects"."project_exports" ADD CONSTRAINT "project_exports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "exports_job_id_idx" ON "projects"."project_exports" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exports_project_idx" ON "projects"."project_exports" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exports_user_idx" ON "projects"."project_exports" USING btree ("user_id","created_at");