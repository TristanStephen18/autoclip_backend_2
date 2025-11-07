CREATE TYPE "public"."provider_enum" AS ENUM('email', 'google');--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "status" SET DEFAULT 'ready';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "provider" "provider_enum" DEFAULT 'email' NOT NULL;