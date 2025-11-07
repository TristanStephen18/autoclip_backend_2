CREATE TABLE "ehnanced_clips" (
	"id" serial PRIMARY KEY NOT NULL,
	"clip_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"url" text NOT NULL,
	"enhancements" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"hashtags" text,
	"duration" integer DEFAULT 8 NOT NULL,
	"shared" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posted_clips" (
	"id" serial PRIMARY KEY NOT NULL,
	"clip_id" integer,
	"enhanced_clip_id" integer,
	"user_id" integer NOT NULL,
	"platform" varchar(50) NOT NULL,
	"platform_post_id" text,
	"post_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"last_synced_at" timestamp,
	"views" integer DEFAULT 0,
	"likes" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"error_message" text,
	"synced" boolean DEFAULT false,
	"shared_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "videos" CASCADE;--> statement-breakpoint
ALTER TABLE "clips" ADD COLUMN "shared" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "ehnanced_clips" ADD CONSTRAINT "ehnanced_clips_clip_id_clips_clip_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("clip_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ehnanced_clips" ADD CONSTRAINT "ehnanced_clips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posted_clips" ADD CONSTRAINT "posted_clips_clip_id_clips_clip_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("clip_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posted_clips" ADD CONSTRAINT "posted_clips_enhanced_clip_id_ehnanced_clips_id_fk" FOREIGN KEY ("enhanced_clip_id") REFERENCES "public"."ehnanced_clips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posted_clips" ADD CONSTRAINT "posted_clips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;