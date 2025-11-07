CREATE TABLE "clips" (
	"clip_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"clip_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"video_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"video_name" text NOT NULL,
	"video_url" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "karaoke_caption";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "emoji_enhancement";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "title_cards";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "auto_hashtags";