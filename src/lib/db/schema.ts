/**
 * Consolidated Database Schema - January 2026
 *
 * Clean schema with:
 * - Neon Auth integration (individual user authentication)
 * - Multi-circle support (users can belong to multiple circles)
 * - Vector embeddings for AI similarity search
 * - Optimized for AI/OpenAI API performance
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  real,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  vector,
  decimal,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================================================
// ONBOARDING PROGRESS (persisted conversation state)
// ============================================================================

export const onboardingProgress = pgTable(
  "onboarding_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().unique(), // Neon Auth user ID
    currentPhase: text("current_phase").default("welcome").notNull(),
    phaseIndex: integer("phase_index").default(0).notNull(),
    extractedData: jsonb("extracted_data").$type<Record<string, unknown>>().default({}).notNull(),
    conversationHistory: jsonb("conversation_history").$type<Array<{
      role: "user" | "assistant";
      content: string;
      timestamp: string;
    }>>().default([]).notNull(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (progress) => [
    uniqueIndex("onboarding_progress_user_idx").on(progress.userId),
  ]
);

// ============================================================================
// CIRCLES & MEMBERS
// ============================================================================

export const circles = pgTable("circles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Circle Invitations - Invite links for joining circles
 */
export const circleInvitations = pgTable(
  "circle_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(), // Short invite code (e.g., "ABC123")
    createdBy: uuid("created_by").notNull(), // Member ID who created the invite
    email: text("email"), // Optional: specific email to invite
    role: text("role").default("member").notNull(), // Role to assign on join
    maxUses: integer("max_uses"), // null = unlimited
    uses: integer("uses").default(0).notNull(),
    expiresAt: timestamp("expires_at"), // null = never expires
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (invitation) => [
    index("invitation_circle_idx").on(invitation.circleId),
    uniqueIndex("invitation_code_idx").on(invitation.code),
  ]
);

/**
 * Circle Members - Links Neon Auth users to circles
 * Users can belong to multiple circles with different roles
 */
export const circleMembers = pgTable(
  "circle_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    // Links to neon_auth.user - the authenticated user
    userId: text("user_id"), // Neon Auth user ID (text, not uuid)
    name: text("name").notNull(),
    profilePicture: text("profile_picture"), // URL to uploaded profile picture
    dateOfBirth: timestamp("date_of_birth"),
    gender: text("gender"), // male, female, other
    role: text("role").default("member").notNull(), // owner, admin, member
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (member) => [
    index("circle_member_circle_idx").on(member.circleId),
    index("circle_member_user_idx").on(member.userId),
  ]
);

// ============================================================================
// CIRCLE EQUIPMENT
// ============================================================================

export const circleEquipment = pgTable(
  "circle_equipment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(), // cardio, strength, flexibility, accessories
    description: text("description"),
    quantity: integer("quantity").default(1),
    brand: text("brand"),
    model: text("model"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (equipment) => [index("circle_equipment_circle_idx").on(equipment.circleId)]
);

// ============================================================================
// MEMBER METRICS (tracked over time)
// ============================================================================

export const memberMetrics = pgTable(
  "member_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    date: timestamp("date").defaultNow().notNull(),
    weight: real("weight"), // in lbs
    height: real("height"), // in inches
    bodyFatPercentage: real("body_fat_percentage"),
    fitnessLevel: text("fitness_level"), // beginner, intermediate, advanced, elite
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (metric) => [
    index("member_metrics_member_idx").on(metric.memberId),
    index("member_metrics_date_idx").on(metric.date),
  ]
);

// ============================================================================
// MEMBER LIMITATIONS
// ============================================================================

export const memberLimitations = pgTable(
  "member_limitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // injury, condition, preference
    description: text("description").notNull(),
    affectedAreas: jsonb("affected_areas").$type<string[]>(), // body parts affected
    severity: text("severity"), // mild, moderate, severe
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"), // null if ongoing
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (limitation) => [index("member_limitations_member_idx").on(limitation.memberId)]
);

// ============================================================================
// GOALS & MILESTONES
// ============================================================================

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").notNull(), // strength, cardio, skill, weight, flexibility, endurance
    targetValue: real("target_value"), // e.g., 225 for bench press
    targetUnit: text("target_unit"), // lbs, seconds, reps, miles, etc.
    currentValue: real("current_value"),
    targetDate: timestamp("target_date"),
    status: text("status").default("active").notNull(), // active, completed, abandoned
    aiGenerated: boolean("ai_generated").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (goal) => [
    index("goals_member_idx").on(goal.memberId),
    index("goals_status_idx").on(goal.status),
  ]
);

export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    targetValue: real("target_value"),
    targetDate: timestamp("target_date"),
    status: text("status").default("pending").notNull(), // pending, completed
    order: integer("order").notNull(),
    aiGenerated: boolean("ai_generated").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (milestone) => [index("milestones_goal_idx").on(milestone.goalId)]
);

// ============================================================================
// EXERCISE LIBRARY (with AI embeddings)
// ============================================================================

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    instructions: text("instructions"),
    category: text("category").notNull(), // strength, cardio, flexibility, skill, sport, plyometric
    muscleGroups: jsonb("muscle_groups").$type<string[]>(), // primary muscles targeted
    secondaryMuscles: jsonb("secondary_muscles").$type<string[]>(), // secondary muscles
    equipment: jsonb("equipment").$type<string[]>(), // barbell, dumbbell, machine, bodyweight
    equipmentAlternatives: jsonb("equipment_alternatives").$type<string[]>(),
    difficulty: text("difficulty"), // beginner, intermediate, advanced
    force: text("force"), // push, pull, static, dynamic
    mechanic: text("mechanic"), // compound, isolation
    benefits: jsonb("benefits").$type<string[]>(), // strength, speed, power, flexibility, endurance, balance, coordination
    contraindications: jsonb("contraindications").$type<string[]>(),
    progressions: jsonb("progressions").$type<string[]>(), // pull-up, muscle-up, back-tuck, faster-sprint, etc.
    regressions: jsonb("regressions").$type<string[]>(),
    prerequisites: jsonb("prerequisites").$type<string[]>(),
    // Media URLs
    videoUrl: text("video_url"),
    imageUrl: text("image_url"),
    // AI/ML features
    embedding: vector("embedding", { dimensions: 1536 }), // For similarity search
    tags: jsonb("tags").$type<string[]>(),
    synonyms: jsonb("synonyms").$type<string[]>(), // Alternative names
    // Sport applications
    sportApplications: jsonb("sport_applications").$type<string[]>(),
    // Metadata
    isActive: boolean("is_active").default(true).notNull(),
    isCustom: boolean("is_custom").default(false).notNull(),
    createdByMemberId: uuid("created_by_member_id").references(
      () => circleMembers.id,
      { onDelete: "set null" }
    ),
    source: text("source").default("system"), // system, free_exercise_db, custom
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (exercise) => [
    index("exercises_category_idx").on(exercise.category),
    index("exercises_name_idx").on(exercise.name),
    index("exercises_difficulty_idx").on(exercise.difficulty),
    index("exercises_active_idx").on(exercise.isActive),
    index("exercises_primary_muscles_idx").using("gin", exercise.muscleGroups),
    index("exercises_equipment_idx").using("gin", exercise.equipment),
    index("exercises_tags_idx").using("gin", exercise.tags),
  ]
);

// ============================================================================
// WORKOUT PLANS (templates)
// ============================================================================

export const workoutPlans = pgTable(
  "workout_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category"), // strength, cardio, hiit, mixed, etc.
    difficulty: text("difficulty"),
    estimatedDuration: integer("estimated_duration"), // in minutes
    aiGenerated: boolean("ai_generated").default(false).notNull(),
    createdByMemberId: uuid("created_by_member_id").references(
      () => circleMembers.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (plan) => [index("workout_plans_circle_idx").on(plan.circleId)]
);

export const workoutPlanExercises = pgTable(
  "workout_plan_exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => workoutPlans.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    sets: integer("sets"),
    reps: text("reps"), // can be "8-12" or "to failure"
    weight: text("weight"), // can be percentage "80%" or specific
    duration: integer("duration"), // in seconds for timed exercises
    distance: real("distance"), // for cardio
    distanceUnit: text("distance_unit"), // miles, meters, km
    restBetweenSets: integer("rest_between_sets"), // in seconds
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (exercise) => [index("workout_plan_exercises_plan_idx").on(exercise.planId)]
);

// ============================================================================
// WORKOUT SESSIONS (actual workouts performed)
// ============================================================================

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").references(() => workoutPlans.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    date: timestamp("date").defaultNow().notNull(),
    startTime: timestamp("start_time"),
    endTime: timestamp("end_time"),
    status: text("status").default("planned").notNull(), // planned, in_progress, completed
    notes: text("notes"),
    rating: integer("rating"), // 1-5 self rating
    aiFeedback: text("ai_feedback"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (session) => [
    index("workout_sessions_member_idx").on(session.memberId),
    index("workout_sessions_date_idx").on(session.date),
    index("workout_sessions_status_idx").on(session.status),
  ]
);

export const workoutSessionExercises = pgTable(
  "workout_session_exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    completed: boolean("completed").default(false).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (exercise) => [
    index("workout_session_exercises_session_idx").on(exercise.sessionId),
  ]
);

export const exerciseSets = pgTable(
  "exercise_sets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionExerciseId: uuid("session_exercise_id")
      .notNull()
      .references(() => workoutSessionExercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    targetReps: integer("target_reps"),
    actualReps: integer("actual_reps"),
    targetWeight: real("target_weight"),
    actualWeight: real("actual_weight"),
    targetDuration: integer("target_duration"), // in seconds
    actualDuration: integer("actual_duration"),
    targetDistance: real("target_distance"),
    actualDistance: real("actual_distance"),
    distanceUnit: text("distance_unit"),
    completed: boolean("completed").default(false).notNull(),
    rpe: integer("rpe"), // rate of perceived exertion 1-10
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (set) => [index("exercise_sets_session_exercise_idx").on(set.sessionExerciseId)]
);

// ============================================================================
// MEMBER SKILLS (gymnastics, athletic skills, etc.)
// ============================================================================

export const memberSkills = pgTable(
  "member_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // back tuck, back handspring, muscle-up, etc.
    category: text("category").notNull(), // gymnastics, calisthenics, sport, other
    // Current assessed status
    currentStatus: text("current_status").default("learning").notNull(), // learning, achieved, mastered
    currentStatusDate: timestamp("current_status_date").defaultNow(),
    // All-time best status
    allTimeBestStatus: text("all_time_best_status").default("learning").notNull(),
    allTimeBestDate: timestamp("all_time_best_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (skill) => [
    index("member_skills_member_idx").on(skill.memberId),
    index("member_skills_current_status_idx").on(skill.currentStatus),
  ]
);

// ============================================================================
// PERSONAL RECORDS
// ============================================================================

export const personalRecords = pgTable(
  "personal_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    // Record type: all_time = best ever, current = current assessed ability
    recordType: text("record_type").default("current").notNull(), // "all_time" | "current"
    value: real("value").notNull(),
    unit: text("unit").notNull(), // lbs, kg, reps, seconds, meters, etc.
    repMax: integer("rep_max"), // 1RM, 3RM, 5RM, etc.
    date: timestamp("date").defaultNow().notNull(),
    sessionId: uuid("session_id").references(() => workoutSessions.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (pr) => [
    index("personal_records_member_idx").on(pr.memberId),
    index("personal_records_exercise_idx").on(pr.exerciseId),
    index("personal_records_type_idx").on(pr.recordType),
    index("personal_records_date_idx").on(pr.date),
  ]
);

// ============================================================================
// CONTEXT NOTES (for AI learning and personalization)
// ============================================================================

export const contextNotes = pgTable(
  "context_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(), // workout_session, goal, exercise, general, limitation
    entityId: uuid("entity_id"),
    mood: text("mood"), // great, good, okay, tired, stressed, motivated, frustrated
    energyLevel: integer("energy_level"), // 1-5
    painLevel: integer("pain_level"), // 0-10 (0 = no pain)
    difficulty: text("difficulty"), // too_easy, just_right, challenging, too_hard
    content: text("content"),
    tags: jsonb("tags").$type<string[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (note) => [
    index("context_notes_member_idx").on(note.memberId),
    index("context_notes_entity_idx").on(note.entityType, note.entityId),
    index("context_notes_created_idx").on(note.createdAt),
  ]
);

// ============================================================================
// AI EMBEDDINGS (for personalized recommendations)
// ============================================================================

export const memberEmbeddings = pgTable(
  "member_embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // profile, workout_history, goals, preferences
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (emb) => [index("member_embeddings_member_idx").on(emb.memberId)]
);

// ============================================================================
// AI COACH CONVERSATIONS & MESSAGES
// ============================================================================

export const coachConversations = pgTable(
  "coach_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => circleMembers.id, { onDelete: "cascade" }),
    mode: text("mode").default("general").notNull(), // general, mental_block, motivation, life_balance, goal_setting, accountability, confidence
    title: text("title"),
    context: jsonb("context").$type<{
      initialTopic?: string;
      resolvedIssues?: string[];
      ongoingConcerns?: string[];
      breakthroughs?: string[];
      actionItems?: string[];
    }>(),
    status: text("status").default("active").notNull(), // active, resolved, archived
    insights: text("insights"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  },
  (conv) => [
    index("coach_conversations_member_idx").on(conv.memberId),
    index("coach_conversations_mode_idx").on(conv.mode),
    index("coach_conversations_status_idx").on(conv.status),
    index("coach_conversations_last_msg_idx").on(conv.lastMessageAt),
  ]
);

export const coachMessages = pgTable(
  "coach_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => coachConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user, assistant
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<{
      sentiment?: string;
      topics?: string[];
      emotionalState?: string;
      actionableInsights?: string[];
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (msg) => [
    index("coach_messages_conversation_idx").on(msg.conversationId),
    index("coach_messages_created_idx").on(msg.createdAt),
  ]
);

// ============================================================================
// AI CACHING & SNAPSHOTS (for performance)
// ============================================================================

/**
 * Pre-computed AI context for fast loading (<100ms target)
 */
export const memberContextSnapshot = pgTable(
  "member_context_snapshot",
  {
    memberId: uuid("member_id").primaryKey(),
    currentWeight: decimal("current_weight", { precision: 5, scale: 2 }),
    currentBodyFat: decimal("current_body_fat", { precision: 4, scale: 2 }),
    fitnessLevel: text("fitness_level"),
    trainingAge: text("training_age"), // beginner, intermediate, advanced
    activeLimitations: jsonb("active_limitations").$type<
      Array<{
        type: string;
        description: string;
        severity: string;
        affectedAreas: string[];
      }>
    >(),
    activeGoals: jsonb("active_goals").$type<
      Array<{
        id: string;
        title: string;
        category: string;
        targetValue: number;
        currentValue: number;
        progressPercent: number;
        targetDate: string;
      }>
    >(),
    personalRecords: jsonb("personal_records").$type<
      Array<{
        exercise: string;
        value: number;
        unit: string;
        repMax?: number;
        date: string;
      }>
    >(),
    skills: jsonb("skills").$type<
      Array<{
        name: string;
        status: string;
        category: string;
      }>
    >(),
    muscleRecoveryStatus: jsonb("muscle_recovery_status").$type<
      Record<
        string,
        {
          status: string;
          hoursSinceWorked: number;
          readyToTrain: boolean;
        }
      >
    >(),
    weeklyWorkoutAvg: decimal("weekly_workout_avg", { precision: 3, scale: 1 }),
    preferredWorkoutTime: text("preferred_workout_time"),
    avgWorkoutDuration: integer("avg_workout_duration"),
    consecutiveTrainingWeeks: integer("consecutive_training_weeks"),
    needsDeload: boolean("needs_deload").default(false),
    avgMood: text("avg_mood"),
    avgEnergyLevel: decimal("avg_energy_level", { precision: 3, scale: 2 }),
    avgPainLevel: decimal("avg_pain_level", { precision: 3, scale: 2 }),
    availableEquipment: jsonb("available_equipment").$type<string[]>(),
    profileEmbedding: vector("profile_embedding", { dimensions: 1536 }),
    lastWorkoutDate: timestamp("last_workout_date", { withTimezone: true }),
    snapshotVersion: integer("snapshot_version").default(1),
    lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("member_context_updated_idx").on(table.lastUpdated)]
);

/**
 * AI Response Cache - for caching expensive AI operations
 */
export const aiResponseCache = pgTable(
  "ai_response_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cacheKey: text("cache_key").notNull(),
    cacheType: text("cache_type").notNull(), // workout_plan, coaching, analysis, exercise_recommendations
    contextHash: text("context_hash").notNull(),
    response: jsonb("response").notNull(),
    responseText: text("response_text"),
    modelUsed: text("model_used"),
    reasoningLevel: text("reasoning_level"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    totalCost: decimal("total_cost", { precision: 8, scale: 6 }),
    generationTimeMs: integer("generation_time_ms"),
    hitCount: integer("hit_count").default(0),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("ai_cache_key_idx").on(table.cacheKey),
    index("ai_cache_type_idx").on(table.cacheType),
    index("ai_cache_expires_idx").on(table.expiresAt),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const circlesRelations = relations(circles, ({ many }) => ({
  members: many(circleMembers),
  workoutPlans: many(workoutPlans),
  equipment: many(circleEquipment),
  invitations: many(circleInvitations),
}));

export const circleInvitationsRelations = relations(circleInvitations, ({ one }) => ({
  circle: one(circles, {
    fields: [circleInvitations.circleId],
    references: [circles.id],
  }),
}));

export const circleMembersRelations = relations(circleMembers, ({ one, many }) => ({
  circle: one(circles, {
    fields: [circleMembers.circleId],
    references: [circles.id],
  }),
  metrics: many(memberMetrics),
  limitations: many(memberLimitations),
  goals: many(goals),
  workoutSessions: many(workoutSessions),
  personalRecords: many(personalRecords),
  skills: many(memberSkills),
  embeddings: many(memberEmbeddings),
  contextNotes: many(contextNotes),
  coachConversations: many(coachConversations),
}));

export const contextNotesRelations = relations(contextNotes, ({ one }) => ({
  member: one(circleMembers, {
    fields: [contextNotes.memberId],
    references: [circleMembers.id],
  }),
}));

export const circleEquipmentRelations = relations(circleEquipment, ({ one }) => ({
  circle: one(circles, {
    fields: [circleEquipment.circleId],
    references: [circles.id],
  }),
}));

export const memberMetricsRelations = relations(memberMetrics, ({ one }) => ({
  member: one(circleMembers, {
    fields: [memberMetrics.memberId],
    references: [circleMembers.id],
  }),
}));

export const memberLimitationsRelations = relations(memberLimitations, ({ one }) => ({
  member: one(circleMembers, {
    fields: [memberLimitations.memberId],
    references: [circleMembers.id],
  }),
}));

export const memberSkillsRelations = relations(memberSkills, ({ one }) => ({
  member: one(circleMembers, {
    fields: [memberSkills.memberId],
    references: [circleMembers.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  member: one(circleMembers, {
    fields: [goals.memberId],
    references: [circleMembers.id],
  }),
  milestones: many(milestones),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
  goal: one(goals, {
    fields: [milestones.goalId],
    references: [goals.id],
  }),
}));

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  createdBy: one(circleMembers, {
    fields: [exercises.createdByMemberId],
    references: [circleMembers.id],
  }),
  workoutPlanExercises: many(workoutPlanExercises),
  workoutSessionExercises: many(workoutSessionExercises),
  personalRecords: many(personalRecords),
}));

export const workoutPlansRelations = relations(workoutPlans, ({ one, many }) => ({
  circle: one(circles, {
    fields: [workoutPlans.circleId],
    references: [circles.id],
  }),
  createdBy: one(circleMembers, {
    fields: [workoutPlans.createdByMemberId],
    references: [circleMembers.id],
  }),
  exercises: many(workoutPlanExercises),
  sessions: many(workoutSessions),
}));

export const workoutPlanExercisesRelations = relations(
  workoutPlanExercises,
  ({ one }) => ({
    plan: one(workoutPlans, {
      fields: [workoutPlanExercises.planId],
      references: [workoutPlans.id],
    }),
    exercise: one(exercises, {
      fields: [workoutPlanExercises.exerciseId],
      references: [exercises.id],
    }),
  })
);

export const workoutSessionsRelations = relations(
  workoutSessions,
  ({ one, many }) => ({
    member: one(circleMembers, {
      fields: [workoutSessions.memberId],
      references: [circleMembers.id],
    }),
    plan: one(workoutPlans, {
      fields: [workoutSessions.planId],
      references: [workoutPlans.id],
    }),
    exercises: many(workoutSessionExercises),
    personalRecords: many(personalRecords),
  })
);

export const workoutSessionExercisesRelations = relations(
  workoutSessionExercises,
  ({ one, many }) => ({
    session: one(workoutSessions, {
      fields: [workoutSessionExercises.sessionId],
      references: [workoutSessions.id],
    }),
    exercise: one(exercises, {
      fields: [workoutSessionExercises.exerciseId],
      references: [exercises.id],
    }),
    sets: many(exerciseSets),
  })
);

export const exerciseSetsRelations = relations(exerciseSets, ({ one }) => ({
  sessionExercise: one(workoutSessionExercises, {
    fields: [exerciseSets.sessionExerciseId],
    references: [workoutSessionExercises.id],
  }),
}));

export const personalRecordsRelations = relations(personalRecords, ({ one }) => ({
  member: one(circleMembers, {
    fields: [personalRecords.memberId],
    references: [circleMembers.id],
  }),
  exercise: one(exercises, {
    fields: [personalRecords.exerciseId],
    references: [exercises.id],
  }),
  session: one(workoutSessions, {
    fields: [personalRecords.sessionId],
    references: [workoutSessions.id],
  }),
}));

export const memberEmbeddingsRelations = relations(memberEmbeddings, ({ one }) => ({
  member: one(circleMembers, {
    fields: [memberEmbeddings.memberId],
    references: [circleMembers.id],
  }),
}));

export const coachConversationsRelations = relations(coachConversations, ({ one, many }) => ({
  member: one(circleMembers, {
    fields: [coachConversations.memberId],
    references: [circleMembers.id],
  }),
  messages: many(coachMessages),
}));

export const coachMessagesRelations = relations(coachMessages, ({ one }) => ({
  conversation: one(coachConversations, {
    fields: [coachMessages.conversationId],
    references: [coachConversations.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Circle = typeof circles.$inferSelect;
export type NewCircle = typeof circles.$inferInsert;
export type CircleMember = typeof circleMembers.$inferSelect;
export type NewCircleMember = typeof circleMembers.$inferInsert;
export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type NewWorkoutSession = typeof workoutSessions.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type PersonalRecord = typeof personalRecords.$inferSelect;
export type NewPersonalRecord = typeof personalRecords.$inferInsert;
export type MemberContextSnapshot = typeof memberContextSnapshot.$inferSelect;
export type AiResponseCache = typeof aiResponseCache.$inferSelect;
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type NewOnboardingProgress = typeof onboardingProgress.$inferInsert;
