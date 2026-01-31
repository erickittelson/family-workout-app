-- Add workout_preferences to user_profiles
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "workout_preferences" jsonb DEFAULT '{}';

-- Add is_system_circle to circles
ALTER TABLE "circles" ADD COLUMN IF NOT EXISTS "is_system_circle" boolean DEFAULT false NOT NULL;
CREATE INDEX IF NOT EXISTS "circles_system_idx" ON "circles" ("is_system_circle");

-- Create content_reports table for community moderation
CREATE TABLE IF NOT EXISTS "content_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reporter_id" text NOT NULL,
  "content_type" text NOT NULL,
  "content_id" uuid NOT NULL,
  "reason" text NOT NULL,
  "details" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "resolved_at" timestamp with time zone,
  "resolved_by" text,
  "resolution_notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "content_reports_reporter_idx" ON "content_reports" ("reporter_id");
CREATE INDEX IF NOT EXISTS "content_reports_content_idx" ON "content_reports" ("content_type", "content_id");
CREATE INDEX IF NOT EXISTS "content_reports_status_idx" ON "content_reports" ("status");
