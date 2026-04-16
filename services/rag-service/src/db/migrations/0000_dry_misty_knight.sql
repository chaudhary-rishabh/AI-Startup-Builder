CREATE SCHEMA IF NOT EXISTS "ai";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai"."rag_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"filename" varchar(255),
	"file_type" varchar(50) NOT NULL,
	"file_size_bytes" integer,
	"source_type" varchar(50) NOT NULL,
	"source_url" text,
	"s3_key" text,
	"content_hash" varchar(64) NOT NULL,
	"chunk_count" integer,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"pinecone_namespace" varchar(255) NOT NULL,
	"custom_instructions" text,
	"error_message" text,
	"indexed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai"."rag_namespaces" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"pinecone_namespace" varchar(255) NOT NULL,
	"doc_count" integer DEFAULT 0 NOT NULL,
	"total_chunks" integer DEFAULT 0 NOT NULL,
	"last_indexed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rag_user_status" ON "ai"."rag_documents" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rag_user_content_hash" ON "ai"."rag_documents" USING btree ("user_id","content_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rag_user_created" ON "ai"."rag_documents" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rag_namespaces_pinecone_idx" ON "ai"."rag_namespaces" USING btree ("pinecone_namespace");