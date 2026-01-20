CREATE TABLE "ai_response_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cache_key" text NOT NULL,
	"cache_type" text NOT NULL,
	"context_hash" text NOT NULL,
	"response" jsonb NOT NULL,
	"response_text" text,
	"model_used" text,
	"reasoning_level" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"total_cost" numeric(8, 6),
	"generation_time_ms" integer,
	"hit_count" integer DEFAULT 0,
	"last_accessed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dim_equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"description" text,
	"image_url" text,
	"weight_capacity" numeric(6, 2),
	"is_adjustable" boolean DEFAULT false,
	"space_required" text,
	"price_range" text,
	"exercise_types" jsonb DEFAULT '[]'::jsonb,
	"muscle_groups" jsonb DEFAULT '[]'::jsonb,
	"is_marketplace" boolean DEFAULT true,
	"popular_brands" jsonb DEFAULT '[]'::jsonb,
	"affiliate_links" jsonb,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dim_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"external_id" text,
	"description" text,
	"instructions" text,
	"tips" text,
	"category" text NOT NULL,
	"subcategory" text,
	"movement_pattern" text,
	"force_type" text,
	"mechanic" text,
	"primary_muscles" jsonb DEFAULT '[]'::jsonb,
	"secondary_muscles" jsonb DEFAULT '[]'::jsonb,
	"stabilizers" jsonb DEFAULT '[]'::jsonb,
	"equipment" jsonb DEFAULT '[]'::jsonb,
	"equipment_alternatives" jsonb DEFAULT '[]'::jsonb,
	"setup_instructions" text,
	"difficulty" text,
	"difficulty_score" integer,
	"prerequisites" jsonb DEFAULT '[]'::jsonb,
	"progressions" jsonb DEFAULT '[]'::jsonb,
	"regressions" jsonb DEFAULT '[]'::jsonb,
	"image_url" text,
	"thumbnail_url" text,
	"video_url" text,
	"animation_url" text,
	"embedding" vector(1536),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"synonyms" jsonb DEFAULT '[]'::jsonb,
	"searchable_text" text,
	"calories_per_min" numeric(5, 2),
	"mets_value" numeric(4, 2),
	"recommended_sets" jsonb,
	"recommended_reps" jsonb,
	"recommended_rest_seconds" integer,
	"benefits" jsonb DEFAULT '[]'::jsonb,
	"contraindications" jsonb DEFAULT '[]'::jsonb,
	"sport_applications" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"is_custom" boolean DEFAULT false,
	"created_by_circle_id" uuid,
	"source" text DEFAULT 'system',
	"last_verified" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dim_muscle_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"body_region" text NOT NULL,
	"category" text NOT NULL,
	"recovery_hours" integer DEFAULT 48 NOT NULL,
	"related_muscles" jsonb DEFAULT '[]'::jsonb,
	"antagonist" text,
	"icon_url" text,
	"sort_order" integer DEFAULT 0,
	CONSTRAINT "dim_muscle_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "dim_time" (
	"date_key" date PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"quarter" integer NOT NULL,
	"month" integer NOT NULL,
	"month_name" text NOT NULL,
	"week" integer NOT NULL,
	"day_of_month" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"day_name" text NOT NULL,
	"is_weekend" boolean NOT NULL,
	"is_holiday" boolean DEFAULT false,
	"fiscal_year" integer,
	"fiscal_quarter" integer
);
--> statement-breakpoint
CREATE TABLE "exercise_recommendations_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"cache_type" text NOT NULL,
	"input_hash" text NOT NULL,
	"recommendations" jsonb,
	"model_used" text,
	"tokens_used" integer,
	"generation_time_ms" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fact_daily_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"date_key" date NOT NULL,
	"workout_count" integer DEFAULT 0,
	"total_duration_minutes" integer DEFAULT 0,
	"total_sets" integer DEFAULT 0,
	"total_reps" integer DEFAULT 0,
	"total_volume_load" numeric(12, 2),
	"strength_sets" integer DEFAULT 0,
	"cardio_minutes" integer DEFAULT 0,
	"flexibility_minutes" integer DEFAULT 0,
	"skill_sets" integer DEFAULT 0,
	"muscle_groups_worked" jsonb DEFAULT '[]'::jsonb,
	"prs_achieved" integer DEFAULT 0,
	"pr_details" jsonb,
	"avg_rating" numeric(3, 2),
	"avg_rpe" numeric(3, 2),
	"mood" text,
	"energy_level" integer,
	"pain_level" integer,
	"calories_burned" integer,
	"active_minutes" integer,
	"rest_day_flag" boolean DEFAULT true,
	"last_updated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fact_goal_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"date_key" date NOT NULL,
	"current_value" numeric(10, 2),
	"target_value" numeric(10, 2),
	"progress_percent" numeric(5, 2),
	"value_delta" numeric(10, 2),
	"progress_delta" numeric(5, 2),
	"milestone_id" uuid,
	"milestone_completed" boolean DEFAULT false,
	"ai_analysis" text,
	"recommended_action" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fact_weekly_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"year_week" text NOT NULL,
	"week_start_date" date NOT NULL,
	"workout_days" integer DEFAULT 0,
	"total_workouts" integer DEFAULT 0,
	"total_duration_minutes" integer DEFAULT 0,
	"total_sets" integer DEFAULT 0,
	"total_volume_load" numeric(14, 2),
	"strength_sets" integer DEFAULT 0,
	"cardio_minutes" integer DEFAULT 0,
	"flexibility_minutes" integer DEFAULT 0,
	"avg_rating" numeric(3, 2),
	"avg_rpe" numeric(3, 2),
	"prs_achieved" integer DEFAULT 0,
	"volume_change_percent" numeric(5, 2),
	"duration_change_percent" numeric(5, 2),
	"deload_recommended" boolean DEFAULT false,
	"focus_areas" jsonb DEFAULT '[]'::jsonb,
	"last_updated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fact_workout_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"date_key" date NOT NULL,
	"exercise_order" integer NOT NULL,
	"set_number" integer NOT NULL,
	"set_type" text DEFAULT 'working',
	"target_reps" integer,
	"target_weight" numeric(6, 2),
	"target_duration" integer,
	"target_distance" numeric(8, 2),
	"target_rpe" integer,
	"actual_reps" integer,
	"actual_weight" numeric(6, 2),
	"actual_duration" integer,
	"actual_distance" numeric(8, 2),
	"actual_rpe" integer,
	"volume_load" numeric(10, 2),
	"one_rm_estimate" numeric(6, 2),
	"intensity_percent" numeric(5, 2),
	"is_completed" boolean DEFAULT false,
	"is_pr" boolean DEFAULT false,
	"hit_target" boolean,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"rest_after" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "member_context_snapshot" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"current_weight" numeric(5, 2),
	"current_body_fat" numeric(4, 2),
	"fitness_level" text,
	"training_age" text,
	"active_limitations" jsonb,
	"active_goals" jsonb,
	"personal_records" jsonb,
	"skills" jsonb,
	"muscle_recovery_status" jsonb,
	"weekly_workout_avg" numeric(3, 1),
	"preferred_workout_time" text,
	"avg_workout_duration" integer,
	"consecutive_training_weeks" integer,
	"needs_deload" boolean DEFAULT false,
	"avg_mood" text,
	"avg_energy_level" numeric(3, 2),
	"avg_pain_level" numeric(3, 2),
	"available_equipment" jsonb,
	"profile_embedding" vector(1536),
	"last_workout_date" timestamp with time zone,
	"snapshot_version" integer DEFAULT 1,
	"last_updated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "member_training_state" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"active_session_id" uuid,
	"session_start_time" timestamp with time zone,
	"current_exercise_index" integer,
	"current_set_index" integer,
	"sets_completed" integer DEFAULT 0,
	"total_planned_sets" integer,
	"session_progress" numeric(5, 2),
	"current_rest_timer" integer,
	"last_set_completed_at" timestamp with time zone,
	"estimated_fatigue_level" integer,
	"sets_to_failure" integer DEFAULT 0,
	"last_updated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_cache_key_idx" ON "ai_response_cache" USING btree ("cache_key");--> statement-breakpoint
CREATE INDEX "ai_cache_type_idx" ON "ai_response_cache" USING btree ("cache_type");--> statement-breakpoint
CREATE INDEX "ai_cache_expires_idx" ON "ai_response_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dim_equipment_slug_idx" ON "dim_equipment" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "dim_equipment_category_idx" ON "dim_equipment" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "dim_exercises_slug_idx" ON "dim_exercises" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "dim_exercises_category_idx" ON "dim_exercises" USING btree ("category");--> statement-breakpoint
CREATE INDEX "dim_exercises_difficulty_idx" ON "dim_exercises" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "dim_exercises_movement_idx" ON "dim_exercises" USING btree ("movement_pattern");--> statement-breakpoint
CREATE INDEX "dim_exercises_primary_muscles_idx" ON "dim_exercises" USING gin ("primary_muscles");--> statement-breakpoint
CREATE INDEX "dim_exercises_equipment_idx" ON "dim_exercises" USING gin ("equipment");--> statement-breakpoint
CREATE INDEX "dim_exercises_tags_idx" ON "dim_exercises" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "dim_exercises_search_idx" ON "dim_exercises" USING gin (to_tsvector('english', "searchable_text"));--> statement-breakpoint
CREATE INDEX "dim_time_year_month_idx" ON "dim_time" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "dim_time_week_idx" ON "dim_time" USING btree ("year","week");--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_cache_key_idx" ON "exercise_recommendations_cache" USING btree ("member_id","cache_type","input_hash");--> statement-breakpoint
CREATE INDEX "exercise_cache_expires_idx" ON "exercise_recommendations_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "fact_daily_member_date_idx" ON "fact_daily_activity" USING btree ("member_id","date_key");--> statement-breakpoint
CREATE INDEX "fact_daily_date_idx" ON "fact_daily_activity" USING btree ("date_key");--> statement-breakpoint
CREATE INDEX "fact_goal_member_goal_idx" ON "fact_goal_progress" USING btree ("member_id","goal_id");--> statement-breakpoint
CREATE INDEX "fact_goal_date_idx" ON "fact_goal_progress" USING btree ("date_key");--> statement-breakpoint
CREATE UNIQUE INDEX "fact_weekly_member_week_idx" ON "fact_weekly_summary" USING btree ("member_id","year_week");--> statement-breakpoint
CREATE INDEX "fact_weekly_date_idx" ON "fact_weekly_summary" USING btree ("week_start_date");--> statement-breakpoint
CREATE INDEX "fact_sets_member_date_idx" ON "fact_workout_sets" USING btree ("member_id","date_key");--> statement-breakpoint
CREATE INDEX "fact_sets_exercise_idx" ON "fact_workout_sets" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "fact_sets_session_idx" ON "fact_workout_sets" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "fact_sets_date_idx" ON "fact_workout_sets" USING btree ("date_key");--> statement-breakpoint
CREATE INDEX "fact_sets_pr_idx" ON "fact_workout_sets" USING btree ("member_id","exercise_id","is_pr");--> statement-breakpoint
CREATE INDEX "member_context_updated_idx" ON "member_context_snapshot" USING btree ("last_updated");