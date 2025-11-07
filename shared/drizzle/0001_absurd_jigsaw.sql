CREATE TABLE "jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"ai_instructions" text NOT NULL,
	"youtube_url" text,
	"status" varchar DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"clip_length_min" integer DEFAULT 20 NOT NULL,
	"clip_length_max" integer DEFAULT 60 NOT NULL,
	"clips_per_video" varchar DEFAULT '10' NOT NULL,
	"variations_per_clip" integer DEFAULT 3 NOT NULL,
	"content_rights" boolean DEFAULT false NOT NULL,
	"karaoke_caption" boolean DEFAULT false NOT NULL,
	"emoji_enhancement" boolean DEFAULT false NOT NULL,
	"title_cards" boolean DEFAULT false NOT NULL,
	"auto_hashtags" boolean DEFAULT false NOT NULL,
	"video_count" integer DEFAULT 1 NOT NULL,
	"clips_generated" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;