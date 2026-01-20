-- Performance Indexes Migration
-- January 2026
-- Adds indexes to improve query performance across the application

-- ============================================================================
-- EXERCISES TABLE INDEXES
-- ============================================================================

-- Full-text search index on exercise name and description
CREATE INDEX IF NOT EXISTS exercises_name_trgm_idx ON exercises USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS exercises_search_idx ON exercises USING gin (
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, ''))
);

-- Index for category filtering (common query pattern)
CREATE INDEX IF NOT EXISTS exercises_category_idx ON exercises (category);

-- Index for difficulty filtering
CREATE INDEX IF NOT EXISTS exercises_difficulty_idx ON exercises (difficulty);

-- Index for active exercises (partial index for common filter)
CREATE INDEX IF NOT EXISTS exercises_active_idx ON exercises (id) WHERE is_active = true;

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS exercises_category_difficulty_idx ON exercises (category, difficulty);

-- ============================================================================
-- WORKOUT SESSIONS INDEXES
-- ============================================================================

-- Index for member's workout history queries
CREATE INDEX IF NOT EXISTS workout_sessions_member_date_idx ON workout_sessions (member_id, date DESC);

-- Index for completed workouts (common filter)
CREATE INDEX IF NOT EXISTS workout_sessions_completed_idx ON workout_sessions (member_id, status)
  WHERE status = 'completed';

-- Index for date range queries
CREATE INDEX IF NOT EXISTS workout_sessions_date_idx ON workout_sessions (date DESC);

-- ============================================================================
-- GOALS INDEXES
-- ============================================================================

-- Index for active goals (most common query)
CREATE INDEX IF NOT EXISTS goals_active_idx ON goals (member_id, status) WHERE status = 'active';

-- Index for goal category filtering
CREATE INDEX IF NOT EXISTS goals_category_idx ON goals (category);

-- ============================================================================
-- MEMBER METRICS INDEXES
-- ============================================================================

-- Index for latest metrics query (common pattern)
CREATE INDEX IF NOT EXISTS member_metrics_latest_idx ON member_metrics (member_id, date DESC);

-- ============================================================================
-- PERSONAL RECORDS INDEXES
-- ============================================================================

-- Index for member's PRs
CREATE INDEX IF NOT EXISTS personal_records_member_idx ON personal_records (member_id);

-- Index for exercise-specific PR queries
CREATE INDEX IF NOT EXISTS personal_records_exercise_idx ON personal_records (exercise);

-- ============================================================================
-- COACH CONVERSATIONS INDEXES
-- ============================================================================

-- Index for member's recent conversations
CREATE INDEX IF NOT EXISTS coach_conversations_member_recent_idx ON coach_conversations (member_id, last_message_at DESC);

-- ============================================================================
-- AI CACHE INDEXES
-- ============================================================================

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS ai_response_cache_key_idx ON ai_response_cache (cache_key);

-- Index for cache expiration cleanup
CREATE INDEX IF NOT EXISTS ai_response_cache_expires_idx ON ai_response_cache (expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- MEMBER CONTEXT SNAPSHOT INDEXES
-- ============================================================================

-- Index for fresh snapshots (used by fast context loader)
CREATE INDEX IF NOT EXISTS member_context_snapshot_fresh_idx ON member_context_snapshot (member_id)
  WHERE last_updated > NOW() - INTERVAL '24 hours';

-- ============================================================================
-- CIRCLE MEMBERS INDEXES
-- ============================================================================

-- Index for user's circles lookup
CREATE INDEX IF NOT EXISTS circle_members_user_idx ON circle_members (user_id) WHERE user_id IS NOT NULL;

-- Composite index for circle + role queries
CREATE INDEX IF NOT EXISTS circle_members_circle_role_idx ON circle_members (circle_id, role);

-- ============================================================================
-- MILESTONES INDEXES
-- ============================================================================

-- Index for goal milestones
CREATE INDEX IF NOT EXISTS milestones_goal_idx ON milestones (goal_id);

-- Index for incomplete milestones
CREATE INDEX IF NOT EXISTS milestones_incomplete_idx ON milestones (goal_id, completed) WHERE completed = false;

-- ============================================================================
-- EXTENSION REQUIREMENTS
-- ============================================================================

-- Enable pg_trgm extension for trigram similarity search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
