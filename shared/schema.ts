// shared/schema.ts
import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

export const providerEnum = pgEnum("provider_enum", ["email", "google"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  provider: providerEnum("provider").default("email").notNull(),
  profilePicture: text("profile_picture"),
  facebookConnection: boolean("facebook_connection").default(false),
  instagramConnection: boolean("instagram_connection").default(false),
  tiktokConnection: boolean("tiktok_connection").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  verified: boolean("verified").default(false).notNull(),
});

export const userConnections = pgTable("user_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  provider: text("provider").notNull(), // "facebook", "instagram", "tiktok"
  providerUserId: text("provider_user_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"), // optional for OAuth
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  aiInstructions: text("ai_instructions").notNull(),
  youtubeUrl: text("youtube_url"),
  videoUrl: text("video_url").notNull(),
  status: varchar("status", {
    enum: ["ready", "queued", "processing", "completed", "failed"],
  })
    .notNull()
    .default("ready"),
  progress: integer("progress").notNull().default(0),
  clipLengthMin: integer("clip_length_min").notNull().default(20),
  clipLengthMax: integer("clip_length_max").notNull().default(60),
  clipsPerVideo: varchar("clips_per_video").notNull().default("10"),
  variationsPerClip: integer("variations_per_clip").notNull().default(3),
  contentRights: boolean("content_rights").notNull().default(false),
  videoCount: integer("video_count").notNull().default(1),
  clipsGenerated: integer("clips_generated").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const audio_files = pgTable("audios", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  audioUrl: text("audio_url").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
})

export const clips = pgTable("clips", {
  clipId: serial("clip_id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  jobId: varchar("job_id")
    .references(() => jobs.id)
    .notNull(),
  clipUrl: text("clip_url").notNull(),
  favourite: boolean("favourite").default(false),
  shared: boolean("shared").default(false),
  duration: integer("duration").notNull().default(8),
  description: text("description").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const enhanced_clips = pgTable("ehnanced_clips", {
  id: serial("id").primaryKey(),
  clipId: integer("clip_id")
    .references(() => clips.clipId)
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  url: text("url").notNull(),
  enhancements: text("enhancements").array().notNull().default(sql`ARRAY[]::text[]`),
  hashtags: text("hashtags"),
  duration: integer("duration").notNull().default(8),
  shared: boolean("shared").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const posted_clips = pgTable("posted_clips", {
  id: serial("id").primaryKey(),
  clipId: integer("clip_id").references(()=>clips.clipId),
  enhancedClipId: integer("enhanced_clip_id").references(() => enhanced_clips.id),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  platformPostId: text("platform_post_id"),
  postStatus: varchar("post_status", { length: 20 }).notNull().default("pending"),
  lastSyncedAt: timestamp("last_synced_at"),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  errorMessage: text("error_message"),
  synced: boolean("synced").default(false),
  sharedAt: timestamp("shared_at").defaultNow().notNull(),
})
