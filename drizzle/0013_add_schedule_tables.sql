-- Add user program schedule tables for advanced workout scheduling
-- This allows users to customize their program schedules with drag-and-drop, 
-- preferred workout days, auto-rescheduling of missed workouts, etc.

-- Create user_program_schedules table
CREATE TABLE IF NOT EXISTS "user_program_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enrollment_id" uuid NOT NULL REFERENCES "program_enrollments"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  
  -- Day preferences (which days of the week user prefers to workout)
  "preferred_days" jsonb NOT NULL DEFAULT '[1, 3, 5]'::jsonb,
  
  -- Time preferences
  "preferred_time_slot" text,
  "reminder_time" text,
  
  -- Auto-reschedule settings
  "auto_reschedule" boolean NOT NULL DEFAULT true,
  "reschedule_window_days" integer NOT NULL DEFAULT 2,
  
  -- Rest day preferences
  "min_rest_days" integer NOT NULL DEFAULT 1,
  "max_consecutive_workout_days" integer NOT NULL DEFAULT 3,
  
  -- Vacation/skip mode
  "paused_until" timestamp with time zone,
  "pause_reason" text,
  
  -- Metadata
  "last_schedule_generated_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create scheduled_workouts table
CREATE TABLE IF NOT EXISTS "scheduled_workouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "schedule_id" uuid NOT NULL REFERENCES "user_program_schedules"("id") ON DELETE CASCADE,
  "program_workout_id" uuid NOT NULL REFERENCES "program_workouts"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  
  -- Scheduling
  "scheduled_date" date NOT NULL,
  "scheduled_time" text,
  "original_date" date,
  
  -- Status tracking
  "status" text NOT NULL DEFAULT 'scheduled',
  "completed_at" timestamp with time zone,
  "skipped_at" timestamp with time zone,
  "skipped_reason" text,
  
  -- Rescheduling info
  "rescheduled_count" integer NOT NULL DEFAULT 0,
  "rescheduled_from" date,
  "rescheduled_reason" text,
  
  -- Link to actual workout session when completed
  "workout_session_id" uuid REFERENCES "workout_sessions"("id") ON DELETE SET NULL,
  
  -- User notes
  "notes" text,
  
  -- Metadata
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for user_program_schedules
CREATE INDEX IF NOT EXISTS "user_program_schedules_enrollment_idx" ON "user_program_schedules" ("enrollment_id");
CREATE INDEX IF NOT EXISTS "user_program_schedules_user_idx" ON "user_program_schedules" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "user_program_schedules_unique_idx" ON "user_program_schedules" ("enrollment_id");

-- Create indexes for scheduled_workouts
CREATE INDEX IF NOT EXISTS "scheduled_workouts_schedule_idx" ON "scheduled_workouts" ("schedule_id");
CREATE INDEX IF NOT EXISTS "scheduled_workouts_user_idx" ON "scheduled_workouts" ("user_id");
CREATE INDEX IF NOT EXISTS "scheduled_workouts_date_idx" ON "scheduled_workouts" ("scheduled_date");
CREATE INDEX IF NOT EXISTS "scheduled_workouts_status_idx" ON "scheduled_workouts" ("status");
CREATE INDEX IF NOT EXISTS "scheduled_workouts_user_date_idx" ON "scheduled_workouts" ("user_id", "scheduled_date");
CREATE UNIQUE INDEX IF NOT EXISTS "scheduled_workouts_unique_idx" ON "scheduled_workouts" ("schedule_id", "program_workout_id", "scheduled_date");
