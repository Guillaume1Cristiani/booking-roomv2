CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" integer,
	"user_id" text,
	"society_id" integer,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
