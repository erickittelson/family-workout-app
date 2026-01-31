/**
 * Expand Workout Plans with Complete Exercise Programs
 * 
 * This script adds realistic exercises to all workout plans based on
 * actual program structures (5/3/1, StrongLifts, PPL, Arnold, GVT, etc.)
 * 
 * Run with: npx tsx scripts/expand-workout-plans.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { exercises, workoutPlanExercises } from "../src/lib/db/schema";
import { eq, sql } from "drizzle-orm";

interface ExerciseDefinition {
  name: string;
  sets: number;
  reps: string;
  restSeconds?: number;
  notes?: string;
  percentageOf1RM?: string;
}

// Build exercise name to ID cache
let exerciseCache: Map<string, string> = new Map();

async function buildExerciseCache() {
  const allExercises = await db.query.exercises.findMany({
    columns: { id: true, name: true },
  });
  exerciseCache = new Map(allExercises.map(e => [e.name.toLowerCase(), e.id]));
  console.log(`Loaded ${exerciseCache.size} exercises into cache`);
}

function findExerciseId(name: string): string | null {
  // Try exact match first
  let id = exerciseCache.get(name.toLowerCase());
  if (id) return id;
  
  // Try common variations
  const variations = [
    name,
    name.replace(/-/g, ' '),
    name.replace(/\s+/g, '-'),
    `${name}s`,  // plural
    name.replace(/s$/, ''),  // singular
  ];
  
  for (const variant of variations) {
    id = exerciseCache.get(variant.toLowerCase());
    if (id) return id;
  }
  
  return null;
}

// =============================================================================
// COMPLETE WORKOUT DEFINITIONS
// =============================================================================

const COMPLETE_WORKOUTS: Record<string, ExerciseDefinition[]> = {
  // =========================================================================
  // WENDLER 5/3/1 DAYS (BBB Template)
  // =========================================================================
  "5/3/1 - Squat Day": [
    { name: "Barbell Squat", sets: 3, reps: "5/3/1", notes: "Main lift - Week 1: 65/75/85%, Week 2: 70/80/90%, Week 3: 75/85/95%", restSeconds: 180 },
    { name: "Barbell Squat", sets: 5, reps: "10", notes: "BBB supplemental - 50-60% of TM", restSeconds: 90 },
    { name: "Barbell Lunge", sets: 4, reps: "10 each leg", notes: "Single leg work", restSeconds: 60 },
    { name: "Leg Curl", sets: 4, reps: "12-15", notes: "Hamstring isolation", restSeconds: 60 },
    { name: "Leg Extensions", sets: 3, reps: "15-20", notes: "Quad finisher", restSeconds: 45 },
    { name: "Standing Calf Raises", sets: 4, reps: "15-20", notes: "Full range of motion", restSeconds: 45 },
    { name: "Hanging Leg Raise", sets: 3, reps: "10-15", notes: "Core work", restSeconds: 60 },
    { name: "Ab Roller", sets: 3, reps: "10-12", notes: "Core stability", restSeconds: 45 },
  ],
  
  "5/3/1 - Bench Day": [
    { name: "Barbell Bench Press", sets: 3, reps: "5/3/1", notes: "Main lift - use prescribed percentages", restSeconds: 180 },
    { name: "Barbell Bench Press", sets: 5, reps: "10", notes: "BBB supplemental - 50-60% of TM", restSeconds: 90 },
    { name: "Incline Dumbbell Press", sets: 4, reps: "10-12", notes: "Upper chest focus", restSeconds: 60 },
    { name: "Cable Crossover", sets: 3, reps: "12-15", notes: "Chest isolation", restSeconds: 45 },
    { name: "Dips - Triceps Version", sets: 4, reps: "10-15", notes: "Tricep emphasis", restSeconds: 60 },
    { name: "Cable Rope Overhead Triceps Extension", sets: 3, reps: "12-15", notes: "Tricep isolation", restSeconds: 45 },
    { name: "Face Pull", sets: 4, reps: "15-20", notes: "Rear delt & rotator cuff health", restSeconds: 45 },
    { name: "Cable Crunch", sets: 3, reps: "15-20", notes: "Core work", restSeconds: 45 },
  ],
  
  "5/3/1 - Deadlift Day": [
    { name: "Barbell Deadlift", sets: 3, reps: "5/3/1", notes: "Main lift - use prescribed percentages", restSeconds: 240 },
    { name: "Barbell Deadlift", sets: 5, reps: "10", notes: "BBB supplemental - 50-60% of TM", restSeconds: 120 },
    { name: "Romanian Deadlift", sets: 4, reps: "10-12", notes: "Hamstring focus", restSeconds: 90 },
    { name: "Barbell Hip Thrust", sets: 4, reps: "10-12", notes: "Glute builder", restSeconds: 60 },
    { name: "Chin-Up", sets: 4, reps: "8-12", notes: "Weighted if possible", restSeconds: 90 },
    { name: "Barbell Row", sets: 4, reps: "8-10", notes: "Upper back thickness", restSeconds: 90 },
    { name: "Barbell Shrug", sets: 3, reps: "12-15", notes: "Trap builder", restSeconds: 60 },
    { name: "Plank", sets: 3, reps: "45-60 sec", notes: "Core stability", restSeconds: 45 },
  ],
  
  "5/3/1 - OHP Day": [
    { name: "Standing Military Press", sets: 3, reps: "5/3/1", notes: "Main lift - strict form", restSeconds: 180 },
    { name: "Standing Military Press", sets: 5, reps: "10", notes: "BBB supplemental - 50-60% of TM", restSeconds: 90 },
    { name: "Arnold Dumbbell Press", sets: 4, reps: "10-12", notes: "Shoulder builder", restSeconds: 60 },
    { name: "Side Lateral Raise", sets: 4, reps: "12-15", notes: "Medial delt focus", restSeconds: 45 },
    { name: "Face Pull", sets: 4, reps: "15-20", notes: "Rear delt & shoulder health", restSeconds: 45 },
    { name: "Close-Grip Barbell Bench Press", sets: 4, reps: "8-10", notes: "Tricep focus", restSeconds: 90 },
    { name: "EZ-Bar Curl", sets: 4, reps: "10-12", notes: "Bicep builder", restSeconds: 60 },
    { name: "Hammer Curls", sets: 3, reps: "12-15", notes: "Brachialis focus", restSeconds: 45 },
  ],

  // =========================================================================
  // STRONGLIFTS 5x5
  // =========================================================================
  "StrongLifts 5x5 - Workout A": [
    { name: "Barbell Squat", sets: 5, reps: "5", notes: "Add 5lbs each workout", restSeconds: 180 },
    { name: "Barbell Bench Press", sets: 5, reps: "5", notes: "Add 5lbs each workout", restSeconds: 180 },
    { name: "Barbell Row", sets: 5, reps: "5", notes: "Add 5lbs each workout", restSeconds: 180 },
    { name: "Dumbbell Bicep Curl", sets: 2, reps: "10-12", notes: "Optional accessory", restSeconds: 60 },
    { name: "Triceps Pushdown", sets: 2, reps: "10-12", notes: "Optional accessory", restSeconds: 60 },
    { name: "Crunches", sets: 3, reps: "15-20", notes: "Core work", restSeconds: 45 },
  ],
  
  "StrongLifts 5x5 - Workout B": [
    { name: "Barbell Squat", sets: 5, reps: "5", notes: "Add 5lbs each workout", restSeconds: 180 },
    { name: "Standing Military Press", sets: 5, reps: "5", notes: "Add 5lbs each workout", restSeconds: 180 },
    { name: "Barbell Deadlift", sets: 1, reps: "5", notes: "Add 10lbs each workout", restSeconds: 300 },
    { name: "Chin-Up", sets: 3, reps: "8-10", notes: "Optional - bodyweight or assisted", restSeconds: 90 },
    { name: "Dips - Triceps Version", sets: 2, reps: "10-12", notes: "Optional accessory", restSeconds: 60 },
    { name: "Plank", sets: 3, reps: "30-45 sec", notes: "Core stability", restSeconds: 45 },
  ],

  // =========================================================================
  // TEXAS METHOD
  // =========================================================================
  "Texas Method - Volume Day": [
    { name: "Barbell Squat", sets: 5, reps: "5", notes: "90% of 5RM - volume focus", restSeconds: 180 },
    { name: "Barbell Bench Press", sets: 5, reps: "5", notes: "90% of 5RM", restSeconds: 180 },
    { name: "Barbell Deadlift", sets: 1, reps: "5", notes: "Heavy single set", restSeconds: 300 },
    { name: "Romanian Deadlift", sets: 3, reps: "10", notes: "Posterior chain volume", restSeconds: 90 },
    { name: "Chin-Up", sets: 4, reps: "8-10", notes: "Upper back", restSeconds: 90 },
    { name: "Barbell Curl", sets: 3, reps: "10-12", notes: "Arm work", restSeconds: 60 },
    { name: "Hanging Leg Raise", sets: 3, reps: "10-15", notes: "Core", restSeconds: 60 },
  ],
  
  "Texas Method - Intensity Day": [
    { name: "Barbell Squat", sets: 1, reps: "5", notes: "NEW 5RM - PR attempt", restSeconds: 300 },
    { name: "Barbell Bench Press", sets: 1, reps: "5", notes: "NEW 5RM - PR attempt", restSeconds: 300 },
    { name: "Power Clean", sets: 5, reps: "3", notes: "Explosive power", restSeconds: 180 },
    { name: "Barbell Row", sets: 3, reps: "5", notes: "Heavy rows", restSeconds: 120 },
    { name: "Dips - Triceps Version", sets: 3, reps: "8-10", notes: "Push accessory", restSeconds: 90 },
    { name: "Face Pull", sets: 3, reps: "15-20", notes: "Shoulder health", restSeconds: 45 },
  ],

  // =========================================================================
  // PUSH PULL LEGS
  // =========================================================================
  "Push Day": [
    { name: "Barbell Bench Press", sets: 4, reps: "6-8", notes: "Main pressing movement", restSeconds: 180 },
    { name: "Incline Dumbbell Press", sets: 4, reps: "8-10", notes: "Upper chest focus", restSeconds: 90 },
    { name: "Dumbbell Shoulder Press", sets: 4, reps: "8-10", notes: "Shoulder builder", restSeconds: 90 },
    { name: "Side Lateral Raise", sets: 4, reps: "12-15", notes: "Medial delt isolation", restSeconds: 45 },
    { name: "Cable Crossover", sets: 3, reps: "12-15", notes: "Chest isolation", restSeconds: 45 },
    { name: "Triceps Pushdown", sets: 3, reps: "10-12", notes: "Tricep isolation", restSeconds: 60 },
    { name: "Cable Rope Overhead Triceps Extension", sets: 3, reps: "10-12", notes: "Long head tricep", restSeconds: 60 },
    { name: "Face Pull", sets: 3, reps: "15-20", notes: "Rear delt & posture", restSeconds: 45 },
  ],
  
  "Pull Day": [
    { name: "Barbell Deadlift", sets: 4, reps: "5", notes: "Main pull - week 1 only, alternate with rows", restSeconds: 240 },
    { name: "Pull-up", sets: 4, reps: "6-10", notes: "Weighted if possible", restSeconds: 120 },
    { name: "Barbell Row", sets: 4, reps: "6-8", notes: "Upper back thickness", restSeconds: 120 },
    { name: "Seated Cable Rows", sets: 3, reps: "10-12", notes: "Mid back focus", restSeconds: 90 },
    { name: "Face Pull", sets: 4, reps: "15-20", notes: "Rear delts", restSeconds: 45 },
    { name: "Dumbbell Shrug", sets: 3, reps: "10-12", notes: "Trap builder", restSeconds: 60 },
    { name: "Barbell Curl", sets: 3, reps: "8-10", notes: "Bicep builder", restSeconds: 60 },
    { name: "Hammer Curls", sets: 3, reps: "10-12", notes: "Brachialis focus", restSeconds: 60 },
  ],
  
  "Legs Day (PPL)": [
    { name: "Barbell Squat", sets: 4, reps: "6-8", notes: "Main leg movement", restSeconds: 180 },
    { name: "Romanian Deadlift", sets: 4, reps: "8-10", notes: "Hamstring focus", restSeconds: 120 },
    { name: "Leg Press", sets: 4, reps: "10-12", notes: "Quad volume", restSeconds: 90 },
    { name: "Bodyweight Walking Lunge", sets: 3, reps: "12 each leg", notes: "Single leg work", restSeconds: 90 },
    { name: "Leg Curl", sets: 4, reps: "10-12", notes: "Hamstring isolation", restSeconds: 60 },
    { name: "Leg Extensions", sets: 3, reps: "12-15", notes: "Quad isolation", restSeconds: 60 },
    { name: "Standing Calf Raises", sets: 4, reps: "12-15", notes: "Calf builder", restSeconds: 60 },
    { name: "Seated Calf Raises", sets: 3, reps: "15-20", notes: "Soleus focus", restSeconds: 45 },
  ],

  // =========================================================================
  // GERMAN VOLUME TRAINING
  // =========================================================================
  "German Volume Training - Chest": [
    { name: "Barbell Bench Press", sets: 10, reps: "10", notes: "60% 1RM - 60sec rest between sets", restSeconds: 60 },
    { name: "Incline Dumbbell Flyes", sets: 3, reps: "10-12", notes: "Accessory - stretch focused", restSeconds: 60 },
    { name: "Dips - Chest Version", sets: 3, reps: "10-12", notes: "Lower chest finisher", restSeconds: 60 },
    { name: "Cable Crossover", sets: 3, reps: "12-15", notes: "Isolation finisher", restSeconds: 45 },
    { name: "Close-Grip Barbell Bench Press", sets: 3, reps: "10-12", notes: "Tricep accessory", restSeconds: 60 },
    { name: "Triceps Pushdown", sets: 3, reps: "12-15", notes: "Tricep isolation", restSeconds: 45 },
  ],

  // =========================================================================
  // ARNOLD SPLIT
  // =========================================================================
  "Arnold Chest & Back": [
    { name: "Barbell Bench Press", sets: 5, reps: "6-10", notes: "Pyramid up in weight", restSeconds: 120 },
    { name: "Barbell Incline Bench Press - Medium Grip", sets: 5, reps: "6-10", notes: "Upper chest focus", restSeconds: 90 },
    { name: "Dumbbell Flyes", sets: 5, reps: "10-12", notes: "Stretch at bottom", restSeconds: 60 },
    { name: "Chin-Up", sets: 5, reps: "to failure", notes: "Wide grip", restSeconds: 90 },
    { name: "Barbell Row", sets: 5, reps: "6-10", notes: "Bent over row", restSeconds: 90 },
    { name: "T-Bar Row with Handle", sets: 5, reps: "8-10", notes: "Upper back thickness", restSeconds: 90 },
    { name: "Bent-Arm Dumbbell Pullover", sets: 5, reps: "10-12", notes: "Chest & back stretch", restSeconds: 60 },
    { name: "Crunches", sets: 3, reps: "25", notes: "Core work", restSeconds: 45 },
  ],

  // =========================================================================
  // BRO SPLIT
  // =========================================================================
  "Bro Split - Chest Monday": [
    { name: "Barbell Bench Press", sets: 4, reps: "6-8", notes: "Main compound", restSeconds: 180 },
    { name: "Incline Dumbbell Press", sets: 4, reps: "8-10", notes: "Upper chest", restSeconds: 90 },
    { name: "Decline Barbell Bench Press", sets: 3, reps: "8-10", notes: "Lower chest", restSeconds: 90 },
    { name: "Dumbbell Flyes", sets: 4, reps: "10-12", notes: "Chest stretch", restSeconds: 60 },
    { name: "Cable Crossover", sets: 4, reps: "12-15", notes: "Inner chest squeeze", restSeconds: 45 },
    { name: "Butterfly", sets: 3, reps: "12-15", notes: "Isolation finisher", restSeconds: 45 },
    { name: "Push-up", sets: 3, reps: "to failure", notes: "Burnout set", restSeconds: 60 },
  ],
  
  "Back Width & Thickness": [
    { name: "Pull-up", sets: 4, reps: "8-12", notes: "Wide grip for width", restSeconds: 120 },
    { name: "Lat Pulldown", sets: 4, reps: "10-12", notes: "Various grips", restSeconds: 90 },
    { name: "Barbell Row", sets: 4, reps: "6-8", notes: "Heavy for thickness", restSeconds: 120 },
    { name: "One-Arm Dumbbell Row", sets: 3, reps: "10-12", notes: "Full stretch", restSeconds: 90 },
    { name: "Seated Cable Rows", sets: 4, reps: "10-12", notes: "Squeeze at contraction", restSeconds: 90 },
    { name: "Straight-Arm Dumbbell Pullover", sets: 3, reps: "12-15", notes: "Lat isolation", restSeconds: 60 },
    { name: "Hyperextensions (Back Extensions)", sets: 3, reps: "12-15", notes: "Lower back", restSeconds: 60 },
    { name: "Barbell Shrug", sets: 4, reps: "10-12", notes: "Trap builder", restSeconds: 60 },
  ],
  
  "Shoulder Boulder Builder": [
    { name: "Standing Military Press", sets: 4, reps: "6-8", notes: "Main press", restSeconds: 150 },
    { name: "Arnold Dumbbell Press", sets: 4, reps: "8-10", notes: "Full rotation", restSeconds: 90 },
    { name: "Side Lateral Raise", sets: 4, reps: "12-15", notes: "Strict form", restSeconds: 45 },
    { name: "Cable Seated Lateral Raise", sets: 3, reps: "12-15", notes: "Constant tension", restSeconds: 45 },
    { name: "Face Pull", sets: 4, reps: "15-20", notes: "Rear delt focus", restSeconds: 45 },
    { name: "Bent Over Dumbbell Rear Delt Raise With Head On Bench", sets: 3, reps: "12-15", notes: "Rear delt isolation", restSeconds: 45 },
    { name: "Upright Barbell Row", sets: 3, reps: "10-12", notes: "Wide grip for delts", restSeconds: 60 },
    { name: "Dumbbell Shrug", sets: 4, reps: "12-15", notes: "Trap finisher", restSeconds: 60 },
  ],
  
  "Classic Arm Blaster": [
    { name: "Barbell Curl", sets: 4, reps: "8-10", notes: "Main bicep exercise", restSeconds: 90 },
    { name: "Close-Grip Barbell Bench Press", sets: 4, reps: "8-10", notes: "Main tricep exercise", restSeconds: 90 },
    { name: "Incline Dumbbell Curl", sets: 3, reps: "10-12", notes: "Stretch position", restSeconds: 60 },
    { name: "Dips - Triceps Version", sets: 4, reps: "10-12", notes: "Weighted if possible", restSeconds: 90 },
    { name: "Hammer Curls", sets: 3, reps: "10-12", notes: "Brachialis focus", restSeconds: 60 },
    { name: "Triceps Pushdown", sets: 3, reps: "12-15", notes: "Lateral head focus", restSeconds: 60 },
    { name: "Concentration Curls", sets: 3, reps: "10-12", notes: "Peak contraction", restSeconds: 45 },
    { name: "Cable Rope Overhead Triceps Extension", sets: 3, reps: "12-15", notes: "Long head focus", restSeconds: 60 },
    { name: "Cable Wrist Curl", sets: 3, reps: "15-20", notes: "Forearm work", restSeconds: 45 },
  ],
  
  "Leg Day Destroyer": [
    { name: "Barbell Squat", sets: 5, reps: "5-8", notes: "Main compound", restSeconds: 240 },
    { name: "Front Squat (Clean Grip)", sets: 4, reps: "8-10", notes: "Quad emphasis", restSeconds: 120 },
    { name: "Romanian Deadlift", sets: 4, reps: "8-10", notes: "Hamstring builder", restSeconds: 120 },
    { name: "Leg Press", sets: 4, reps: "12-15", notes: "High rep volume", restSeconds: 90 },
    { name: "Bodyweight Walking Lunge", sets: 3, reps: "12 each leg", notes: "Glute & quad burner", restSeconds: 90 },
    { name: "Leg Curl", sets: 4, reps: "10-12", notes: "Hamstring isolation", restSeconds: 60 },
    { name: "Leg Extensions", sets: 4, reps: "12-15", notes: "Quad isolation", restSeconds: 60 },
    { name: "Standing Calf Raises", sets: 5, reps: "12-15", notes: "Full range of motion", restSeconds: 60 },
    { name: "Seated Calf Raises", sets: 4, reps: "15-20", notes: "Soleus focus", restSeconds: 45 },
  ],

  // =========================================================================
  // HYPERTROPHY FOCUSED
  // =========================================================================
  "Upper Body Hypertrophy": [
    { name: "Barbell Bench Press", sets: 4, reps: "8-10", notes: "Controlled tempo", restSeconds: 120 },
    { name: "Barbell Row", sets: 4, reps: "8-10", notes: "Strict form", restSeconds: 120 },
    { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", notes: "Upper chest focus", restSeconds: 90 },
    { name: "Pull-up", sets: 3, reps: "8-12", notes: "Full range", restSeconds: 90 },
    { name: "Dumbbell Shoulder Press", sets: 3, reps: "10-12", notes: "Seated or standing", restSeconds: 90 },
    { name: "Cable Crossover", sets: 3, reps: "12-15", notes: "Chest isolation", restSeconds: 60 },
    { name: "Face Pull", sets: 3, reps: "15-20", notes: "Rear delt & health", restSeconds: 45 },
    { name: "EZ-Bar Curl", sets: 3, reps: "10-12", notes: "Bicep builder", restSeconds: 60 },
    { name: "Triceps Pushdown", sets: 3, reps: "10-12", notes: "Tricep isolation", restSeconds: 60 },
  ],
  
  "Lower Body Hypertrophy": [
    { name: "Barbell Squat", sets: 4, reps: "8-10", notes: "Full depth", restSeconds: 180 },
    { name: "Romanian Deadlift", sets: 4, reps: "10-12", notes: "Hamstring focus", restSeconds: 120 },
    { name: "Leg Press", sets: 4, reps: "12-15", notes: "Various foot positions", restSeconds: 90 },
    { name: "Bodyweight Walking Lunge", sets: 3, reps: "10 each leg", notes: "Controlled tempo", restSeconds: 90 },
    { name: "Leg Curl", sets: 4, reps: "10-12", notes: "Squeeze at top", restSeconds: 60 },
    { name: "Leg Extensions", sets: 4, reps: "12-15", notes: "Hold at top", restSeconds: 60 },
    { name: "Cable Hip Adduction", sets: 3, reps: "12-15", notes: "Inner thigh", restSeconds: 45 },
    { name: "Standing Calf Raises", sets: 4, reps: "12-15", notes: "Full stretch", restSeconds: 60 },
    { name: "Seated Calf Raises", sets: 3, reps: "15-20", notes: "Soleus emphasis", restSeconds: 45 },
  ],

  // =========================================================================
  // SPECIALIZATION
  // =========================================================================
  "Chest Specialization": [
    { name: "Barbell Bench Press", sets: 5, reps: "5-8", notes: "Strength focused", restSeconds: 180 },
    { name: "Barbell Incline Bench Press - Medium Grip", sets: 4, reps: "8-10", notes: "Upper chest", restSeconds: 120 },
    { name: "Dumbbell Bench Press", sets: 4, reps: "10-12", notes: "Full ROM", restSeconds: 90 },
    { name: "Incline Dumbbell Flyes", sets: 4, reps: "10-12", notes: "Stretch focused", restSeconds: 60 },
    { name: "Cable Crossover", sets: 4, reps: "12-15", notes: "Squeeze at center", restSeconds: 60 },
    { name: "Butterfly", sets: 3, reps: "15-20", notes: "Isolation finisher", restSeconds: 45 },
    { name: "Dips - Chest Version", sets: 3, reps: "to failure", notes: "Lean forward", restSeconds: 90 },
    { name: "Push-up", sets: 2, reps: "to failure", notes: "Burnout", restSeconds: 60 },
  ],
  
  "Deadlift Specialization": [
    { name: "Barbell Deadlift", sets: 5, reps: "3-5", notes: "Heavy main lift", restSeconds: 300 },
    { name: "Deficit Deadlift", sets: 4, reps: "5-6", notes: "Improve off floor", restSeconds: 180 },
    { name: "Romanian Deadlift", sets: 4, reps: "8-10", notes: "Hamstring builder", restSeconds: 120 },
    { name: "Barbell Row", sets: 4, reps: "6-8", notes: "Upper back strength", restSeconds: 120 },
    { name: "Barbell Hip Thrust", sets: 3, reps: "10-12", notes: "Glute power", restSeconds: 90 },
    { name: "Good Morning", sets: 3, reps: "8-10", notes: "Posterior chain", restSeconds: 90 },
    { name: "Hanging Leg Raise", sets: 3, reps: "10-15", notes: "Core strength", restSeconds: 60 },
    { name: "Farmer's Walk", sets: 3, reps: "40-50 yards", notes: "Grip & core", restSeconds: 90 },
  ],

  // =========================================================================
  // FST-7
  // =========================================================================
  "FST-7 Shoulders": [
    { name: "Standing Military Press", sets: 4, reps: "8-10", notes: "Main press", restSeconds: 120 },
    { name: "Dumbbell Shoulder Press", sets: 4, reps: "10-12", notes: "Seated", restSeconds: 90 },
    { name: "Side Lateral Raise", sets: 4, reps: "12-15", notes: "Strict form", restSeconds: 60 },
    { name: "Cable Rear Delt Fly", sets: 4, reps: "12-15", notes: "Rear delts", restSeconds: 60 },
    { name: "Cable Seated Lateral Raise", sets: 7, reps: "10-12", notes: "FST-7 finisher - 30-45 sec rest", restSeconds: 40 },
    { name: "Barbell Upright Row", sets: 3, reps: "10-12", notes: "Finish", restSeconds: 60 },
  ],

  // =========================================================================
  // HEAVY SINGLES
  // =========================================================================
  "Heavy Singles Day": [
    { name: "Barbell Squat", sets: 5, reps: "1-3", notes: "Work up to heavy single", restSeconds: 300 },
    { name: "Barbell Bench Press", sets: 5, reps: "1-3", notes: "Work up to heavy single", restSeconds: 300 },
    { name: "Barbell Deadlift", sets: 3, reps: "1-3", notes: "Heavy pull", restSeconds: 300 },
    { name: "Barbell Row", sets: 3, reps: "5", notes: "Moderate weight", restSeconds: 120 },
    { name: "Pull-up", sets: 3, reps: "5-8", notes: "Weighted", restSeconds: 90 },
    { name: "Dips - Triceps Version", sets: 3, reps: "8-10", notes: "Accessory", restSeconds: 90 },
  ],

  // =========================================================================
  // FULL BODY
  // =========================================================================
  "Full Body Pump": [
    { name: "Barbell Squat", sets: 3, reps: "10-12", notes: "Moderate weight", restSeconds: 120 },
    { name: "Barbell Bench Press", sets: 3, reps: "10-12", notes: "Controlled tempo", restSeconds: 90 },
    { name: "Barbell Row", sets: 3, reps: "10-12", notes: "Full squeeze", restSeconds: 90 },
    { name: "Standing Military Press", sets: 3, reps: "10-12", notes: "Strict form", restSeconds: 90 },
    { name: "Romanian Deadlift", sets: 3, reps: "12", notes: "Hamstring focus", restSeconds: 90 },
    { name: "Pull-up", sets: 3, reps: "8-10", notes: "Full range", restSeconds: 90 },
    { name: "Side Lateral Raise", sets: 2, reps: "12-15", notes: "Light weight", restSeconds: 45 },
    { name: "Barbell Curl", sets: 2, reps: "10-12", notes: "Biceps", restSeconds: 60 },
    { name: "Triceps Pushdown", sets: 2, reps: "10-12", notes: "Triceps", restSeconds: 60 },
    { name: "Plank", sets: 2, reps: "45 sec", notes: "Core stability", restSeconds: 45 },
  ],

  // =========================================================================
  // CROSSFIT BENCHMARK WODS (Updated with more exercises)
  // =========================================================================
  "Cindy": [
    { name: "Pull-up", sets: 1, reps: "5", notes: "AMRAP 20 minutes - complete as many rounds as possible" },
    { name: "Push-up", sets: 1, reps: "10", notes: "Part of each round" },
    { name: "Bodyweight Squat", sets: 1, reps: "15", notes: "Part of each round" },
  ],
  
  "Helen": [
    { name: "Running", sets: 3, reps: "400m", notes: "Run 400m" },
    { name: "Kettlebell Swing", sets: 3, reps: "21", notes: "53/35 lb" },
    { name: "Pull-up", sets: 3, reps: "12", notes: "Complete 3 rounds for time" },
  ],
  
  "Fran": [
    { name: "Thruster", sets: 3, reps: "21-15-9", notes: "95/65 lb" },
    { name: "Pull-up", sets: 3, reps: "21-15-9", notes: "For time" },
  ],
  
  "Murph": [
    { name: "Running", sets: 1, reps: "1 mile", notes: "Start with 1 mile run" },
    { name: "Pull-up", sets: 1, reps: "100", notes: "Partition as needed" },
    { name: "Push-up", sets: 1, reps: "200", notes: "Partition as needed" },
    { name: "Bodyweight Squat", sets: 1, reps: "300", notes: "Partition as needed" },
    { name: "Running", sets: 1, reps: "1 mile", notes: "End with 1 mile run - wear 20 lb vest if able" },
  ],
  
  "Grace": [
    { name: "Clean and Jerk", sets: 1, reps: "30", notes: "135/95 lb - for time" },
  ],
  
  "Isabel": [
    { name: "Snatch", sets: 1, reps: "30", notes: "135/95 lb - for time" },
  ],
  
  "Death by Burpees": [
    { name: "Burpee", sets: 1, reps: "EMOM", notes: "Min 1: 1 burpee, Min 2: 2 burpees, etc. Continue until you can't complete the reps in 1 minute" },
  ],
};

async function expandWorkoutPlans() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║         EXPAND WORKOUT PLANS WITH FULL PROGRAMS               ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  await buildExerciseCache();

  // Get all workout plans
  const workoutPlans = await db.execute(sql`
    SELECT wp.id, wp.name, COUNT(wpe.id) as exercise_count
    FROM workout_plans wp
    LEFT JOIN workout_plan_exercises wpe ON wp.id = wpe.plan_id
    GROUP BY wp.id, wp.name
    ORDER BY wp.name
  `);

  let updatedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;

  for (const plan of workoutPlans.rows as { id: string; name: string; exercise_count: string }[]) {
    const completeWorkout = COMPLETE_WORKOUTS[plan.name];
    
    if (!completeWorkout) {
      // Skip workouts we don't have definitions for
      continue;
    }

    const currentExerciseCount = parseInt(plan.exercise_count);
    const targetExerciseCount = completeWorkout.length;

    // Only update if we have more exercises to add
    if (currentExerciseCount >= targetExerciseCount) {
      console.log(`  ○ "${plan.name}" already has ${currentExerciseCount} exercises (target: ${targetExerciseCount})`);
      skippedCount++;
      continue;
    }

    console.log(`\n  Processing "${plan.name}" (${currentExerciseCount} → ${targetExerciseCount} exercises)...`);

    // Delete existing exercises and replace with complete list
    await db.delete(workoutPlanExercises).where(eq(workoutPlanExercises.planId, plan.id));

    let addedCount = 0;
    let order = 0;
    const missingExercises: string[] = [];

    for (const exercise of completeWorkout) {
      const exerciseId = findExerciseId(exercise.name);
      
      if (!exerciseId) {
        missingExercises.push(exercise.name);
        continue;
      }

      try {
        await db.insert(workoutPlanExercises).values({
          planId: plan.id,
          exerciseId,
          order: order++,
          sets: exercise.sets,
          reps: exercise.reps,
          restBetweenSets: exercise.restSeconds,
          notes: exercise.notes,
        });
        addedCount++;
      } catch (error) {
        console.error(`    ✗ Error adding "${exercise.name}":`, error);
      }
    }

    if (missingExercises.length > 0) {
      console.log(`    ! Missing exercises: ${missingExercises.join(", ")}`);
    }

    console.log(`    ✓ Added ${addedCount} exercises`);
    updatedCount++;
  }

  console.log("\n" + "=".repeat(65));
  console.log(`Summary:`);
  console.log(`  - Updated: ${updatedCount} workout plans`);
  console.log(`  - Skipped (already complete): ${skippedCount}`);
  console.log("=".repeat(65));
}

async function main() {
  try {
    await expandWorkoutPlans();
    console.log("\n✅ Workout plan expansion complete!");
  } catch (error) {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  }
  process.exit(0);
}

main();
