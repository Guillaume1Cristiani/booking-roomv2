DO $$ BEGIN
 CREATE TYPE "public"."Role" AS ENUM('ADMIN', 'EDITOR', 'VIEWER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"date_start" timestamp NOT NULL,
	"date_end" timestamp NOT NULL,
	"sub_tag_id" integer NOT NULL,
	"microsoft_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "licences" (
	"id" serial PRIMARY KEY NOT NULL,
	"price" integer NOT NULL,
	"max_admins" integer NOT NULL,
	"max_editors" integer NOT NULL,
	"max_viewers" integer NOT NULL,
	"url_share" boolean NOT NULL,
	"active" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"tag_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "societies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo" text,
	"url_share" text,
	"licence_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sub_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"color" text NOT NULL,
	"tag_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"color" text NOT NULL,
	"society_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"given_name" text NOT NULL,
	"surname" text NOT NULL,
	"microsoft_id" text NOT NULL,
	"email" text NOT NULL,
	"picture" text,
	"role" "Role" DEFAULT 'VIEWER',
	"society_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_microsoft_id_unique" UNIQUE("microsoft_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
