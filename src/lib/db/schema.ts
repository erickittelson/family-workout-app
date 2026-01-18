import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  real,
  boolean,
  jsonb,
  primaryKey,
  index,
  vector,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// AUTH TABLES (for passkey authentication)
// ============================================================================

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique(),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

export const authenticators = pgTable(
  "authenticators",
  {
    credentialID: text("credential_id").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("provider_account_id").notNull(),
    credentialPublicKey: text("credential_public_key").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credential_device_type").notNull(),
    credentialBackedUp: boolean("credential_backed_up").notNull(),
    transports: text("transports"),
  },
  (authenticator) => [
    primaryKey({ columns: [authenticator.userId, authenticator.credentialID] }),
  ]
);

// ============================================================================
// FAMILY & MEMBERS
// ============================================================================

export const families = pgTable("families", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  passkey: text("passkey").notNull(), // Shared family passkey (hashed)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const familyMembers = pgTable(
  "family_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    avatar: text("avatar"),
    dateOfBirth: timestamp("date_of_birth"),
    gender: text("gender"), // male, female, other
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (member) => [index("family_member_family_idx").on(member.familyId)]
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
      .references(() => familyMembers.id, { onDelete: "cascade" }),
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
      .references(() => familyMembers.id, { onDelete: "cascade" }),
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
      .references(() => familyMembers.id, { onDelete: "cascade" }),
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
// EXERCISE LIBRARY
// ============================================================================

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    instructions: text("instructions"),
    category: text("category").notNull(), // strength, cardio, flexibility, skill, sport
    muscleGroups: jsonb("muscle_groups").$type<string[]>(), // chest, back, legs, etc.
    equipment: jsonb("equipment").$type<string[]>(), // barbell, dumbbell, machine, bodyweight
    difficulty: text("difficulty"), // beginner, intermediate, advanced
    videoUrl: text("video_url"),
    imageUrl: text("image_url"),
    isCustom: boolean("is_custom").default(false).notNull(),
    createdByMemberId: uuid("created_by_member_id").references(
      () => familyMembers.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (exercise) => [
    index("exercises_category_idx").on(exercise.category),
    index("exercises_name_idx").on(exercise.name),
  ]
);

// ============================================================================
// WORKOUT PLANS (templates)
// ============================================================================

export const workoutPlans = pgTable(
  "workout_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category"), // strength, cardio, hiit, mixed, etc.
    difficulty: text("difficulty"),
    estimatedDuration: integer("estimated_duration"), // in minutes
    aiGenerated: boolean("ai_generated").default(false).notNull(),
    createdByMemberId: uuid("created_by_member_id").references(
      () => familyMembers.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (plan) => [index("workout_plans_family_idx").on(plan.familyId)]
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
      .references(() => familyMembers.id, { onDelete: "cascade" }),
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
    aiAnalysis: text("ai_analysis"),
    aiFeedback: text("ai_feedback"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (session) => [
    index("workout_sessions_member_idx").on(session.memberId),
    index("workout_sessions_date_idx").on(session.date),
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
// MAX LIFTS / PERSONAL RECORDS
// ============================================================================

export const personalRecords = pgTable(
  "personal_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
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
    index("personal_records_date_idx").on(pr.date),
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
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // profile, workout_history, goals, preferences
    content: text("content").notNull(), // The text that was embedded
    embedding: vector("embedding", { dimensions: 1536 }), // OpenAI embedding
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (emb) => [index("member_embeddings_member_idx").on(emb.memberId)]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  authenticators: many(authenticators),
  familyMembers: many(familyMembers),
}));

export const familiesRelations = relations(families, ({ many }) => ({
  members: many(familyMembers),
  workoutPlans: many(workoutPlans),
}));

export const familyMembersRelations = relations(familyMembers, ({ one, many }) => ({
  family: one(families, {
    fields: [familyMembers.familyId],
    references: [families.id],
  }),
  user: one(users, {
    fields: [familyMembers.userId],
    references: [users.id],
  }),
  metrics: many(memberMetrics),
  limitations: many(memberLimitations),
  goals: many(goals),
  workoutSessions: many(workoutSessions),
  personalRecords: many(personalRecords),
  embeddings: many(memberEmbeddings),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  member: one(familyMembers, {
    fields: [goals.memberId],
    references: [familyMembers.id],
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
  createdBy: one(familyMembers, {
    fields: [exercises.createdByMemberId],
    references: [familyMembers.id],
  }),
  workoutPlanExercises: many(workoutPlanExercises),
  workoutSessionExercises: many(workoutSessionExercises),
  personalRecords: many(personalRecords),
}));

export const workoutPlansRelations = relations(workoutPlans, ({ one, many }) => ({
  family: one(families, {
    fields: [workoutPlans.familyId],
    references: [families.id],
  }),
  createdBy: one(familyMembers, {
    fields: [workoutPlans.createdByMemberId],
    references: [familyMembers.id],
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
    member: one(familyMembers, {
      fields: [workoutSessions.memberId],
      references: [familyMembers.id],
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
  member: one(familyMembers, {
    fields: [personalRecords.memberId],
    references: [familyMembers.id],
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
  member: one(familyMembers, {
    fields: [memberEmbeddings.memberId],
    references: [familyMembers.id],
  }),
}));
