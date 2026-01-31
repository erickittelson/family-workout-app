/**
 * Comprehensive Data Fix Script
 * 
 * Fixes all incomplete data in the database:
 * 1. Exercises missing muscle_groups
 * 2. Workout plans with 0 exercises
 * 3. Programs with 0 workouts
 * 4. Challenges missing descriptions
 * 
 * Run with: npx tsx scripts/fix-incomplete-data.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import {
  exercises,
  workoutPlans,
  workoutPlanExercises,
  communityPrograms,
  programWeeks,
  programWorkouts,
  challenges,
  circles,
} from "../src/lib/db/schema";
import { eq, and, isNull, or, sql } from "drizzle-orm";

// =============================================================================
// 1. FIX EXERCISES MISSING MUSCLE GROUPS
// =============================================================================

const EXERCISE_MUSCLE_GROUPS: Record<string, { muscleGroups: string[]; difficulty: string }> = {
  "Bench Press": { muscleGroups: ["chest", "triceps", "shoulders"], difficulty: "intermediate" },
  "Squat": { muscleGroups: ["quadriceps", "glutes", "hamstrings", "core"], difficulty: "intermediate" },
  "Deadlift": { muscleGroups: ["back", "glutes", "hamstrings", "core"], difficulty: "intermediate" },
  "Strict Press": { muscleGroups: ["shoulders", "triceps", "core"], difficulty: "intermediate" },
  "Mile Run": { muscleGroups: ["cardiovascular", "legs"], difficulty: "intermediate" },
  "400m Run": { muscleGroups: ["cardiovascular", "legs"], difficulty: "intermediate" },
  "200m Run": { muscleGroups: ["cardiovascular", "legs"], difficulty: "beginner" },
  "100m Run": { muscleGroups: ["cardiovascular", "legs"], difficulty: "beginner" },
  "Pull Ups": { muscleGroups: ["back", "biceps", "core"], difficulty: "intermediate" },
};

async function fixExerciseMuscleGroups() {
  console.log("\n=== Fixing Exercises Missing Muscle Groups ===");
  
  for (const [name, data] of Object.entries(EXERCISE_MUSCLE_GROUPS)) {
    try {
      const result = await db
        .update(exercises)
        .set({
          muscleGroups: data.muscleGroups,
          difficulty: data.difficulty,
        })
        .where(
          and(
            eq(exercises.name, name),
            isNull(exercises.muscleGroups)
          )
        )
        .returning();
      
      if (result.length > 0) {
        console.log(`  ✓ Fixed "${name}" - muscle groups: ${data.muscleGroups.join(", ")}`);
      }
    } catch (error) {
      console.error(`  ✗ Error fixing "${name}":`, error);
    }
  }
}

// =============================================================================
// 2. FIX WORKOUT PLANS WITH 0 EXERCISES
// =============================================================================

interface WorkoutExerciseDefinition {
  exerciseName: string;
  sets: number;
  reps: string;
  restSeconds?: number;
  notes?: string;
}

const WORKOUT_PLAN_EXERCISES: Record<string, WorkoutExerciseDefinition[]> = {
  // CARDIO WORKOUTS
  "Tempo Run": [
    { exerciseName: "Running", sets: 1, reps: "20-40 min", notes: "Maintain steady pace at RPE 6-7" },
  ],
  "Sprint Intervals": [
    { exerciseName: "Running", sets: 10, reps: "30 sec sprint", restSeconds: 60, notes: "All-out effort sprints" },
  ],
  "Hill Sprint Session": [
    { exerciseName: "Running", sets: 8, reps: "20 sec uphill", restSeconds: 90, notes: "Find a 6-8% grade hill" },
  ],
  "Fartlek Run": [
    { exerciseName: "Running", sets: 1, reps: "30 min", notes: "Alternate between easy jog and faster intervals" },
  ],
  "Long Slow Distance": [
    { exerciseName: "Running", sets: 1, reps: "45-60 min", notes: "Easy conversational pace" },
  ],
  "Rowing Intervals": [
    { exerciseName: "Rowing, Stationary", sets: 8, reps: "500m", restSeconds: 90, notes: "Target consistent pace" },
  ],
  "Row Ladder": [
    { exerciseName: "Rowing, Stationary", sets: 1, reps: "250-500-750-1000-750-500-250m", restSeconds: 60, notes: "Ladder up and down" },
  ],
  "Bike Pyramid": [
    { exerciseName: "Bicycling, Stationary", sets: 1, reps: "30 min", notes: "5min easy, 5min moderate, 5min hard, repeat descending" },
  ],
  "Assault Bike Intervals": [
    { exerciseName: "Air Bike", sets: 10, reps: "20 cal", restSeconds: 60, notes: "All-out effort" },
  ],
  "Jump Rope Conditioning": [
    { exerciseName: "Double Under", sets: 10, reps: "60 sec", restSeconds: 30, notes: "Mix singles, doubles, and crossovers" },
  ],
  
  // HIIT WORKOUTS
  "12-Minute AMRAP": [
    { exerciseName: "Pull-up", sets: 1, reps: "5", notes: "AMRAP 12 minutes" },
    { exerciseName: "Push-up", sets: 1, reps: "10", notes: "Part of AMRAP" },
    { exerciseName: "Bodyweight Squat", sets: 1, reps: "15", notes: "Part of AMRAP" },
  ],
  "EMOM 20": [
    { exerciseName: "Deadlift", sets: 20, reps: "3", notes: "Every minute on the minute at 70% 1RM" },
  ],
  "Tabata Something Else": [
    { exerciseName: "Pull-up", sets: 8, reps: "20 sec work/10 sec rest", notes: "Tabata round 1" },
    { exerciseName: "Push-up", sets: 8, reps: "20 sec work/10 sec rest", notes: "Tabata round 2" },
    { exerciseName: "Sit-Up", sets: 8, reps: "20 sec work/10 sec rest", notes: "Tabata round 3" },
    { exerciseName: "Bodyweight Squat", sets: 8, reps: "20 sec work/10 sec rest", notes: "Tabata round 4" },
  ],
  "Fight Gone Bad": [
    { exerciseName: "Wall Ball", sets: 3, reps: "1 min", notes: "3 rounds, 1 min each station" },
    { exerciseName: "Kettlebell Sumo High Pull", sets: 3, reps: "1 min", notes: "Use 75/55 lb" },
    { exerciseName: "Box Jump", sets: 3, reps: "1 min", notes: "20 inch box" },
    { exerciseName: "Push Press", sets: 3, reps: "1 min", notes: "75/55 lb" },
    { exerciseName: "Rowing, Stationary", sets: 3, reps: "1 min for calories", notes: "Score total reps/cals" },
  ],
  "Filthy Fifty": [
    { exerciseName: "Box Jump", sets: 1, reps: "50", notes: "For time" },
    { exerciseName: "Pull-up", sets: 1, reps: "50", notes: "Jumping pull-ups OK" },
    { exerciseName: "Kettlebell Swing", sets: 1, reps: "50", notes: "35/26 lb" },
    { exerciseName: "Bodyweight Walking Lunge", sets: 1, reps: "50 steps", notes: "Alternating" },
    { exerciseName: "Toes to Bar", sets: 1, reps: "50", notes: "Or knees to elbows" },
    { exerciseName: "Push Press", sets: 1, reps: "50", notes: "45/35 lb" },
    { exerciseName: "Hyperextensions (Back Extensions)", sets: 1, reps: "50", notes: "Or good mornings" },
    { exerciseName: "Wall Ball", sets: 1, reps: "50", notes: "20/14 lb" },
    { exerciseName: "Burpee", sets: 1, reps: "50", notes: "Full extension at top" },
    { exerciseName: "Double Under", sets: 1, reps: "50", notes: "Or 150 singles" },
  ],
  "The Chipper": [
    { exerciseName: "Rowing, Stationary", sets: 1, reps: "1000m", notes: "Chipper workout - complete in order" },
    { exerciseName: "Kettlebell Swing", sets: 1, reps: "50", notes: "53/35 lb" },
    { exerciseName: "Box Jump", sets: 1, reps: "40", notes: "24/20 inch" },
    { exerciseName: "Pull-up", sets: 1, reps: "30", notes: "Strict or kipping" },
    { exerciseName: "Burpee", sets: 1, reps: "20", notes: "Full extension" },
    { exerciseName: "Clean and Jerk", sets: 1, reps: "10", notes: "135/95 lb" },
  ],
  "DT": [
    { exerciseName: "Deadlift", sets: 5, reps: "12", notes: "5 rounds for time at 155/105 lb" },
    { exerciseName: "Hang Clean", sets: 5, reps: "9", notes: "Same weight" },
    { exerciseName: "Double Kettlebell Push Press", sets: 5, reps: "6", notes: "Same weight" },
  ],
};

async function fixWorkoutPlanExercises() {
  console.log("\n=== Fixing Workout Plans with 0 Exercises ===");
  
  // Get exercise name to ID mapping
  const allExercises = await db.query.exercises.findMany({
    columns: { id: true, name: true },
  });
  const exerciseMap = new Map(allExercises.map(e => [e.name.toLowerCase(), e.id]));
  
  // Get workout plans with 0 exercises
  const emptyWorkouts = await db.execute(sql`
    SELECT wp.id, wp.name 
    FROM workout_plans wp 
    LEFT JOIN workout_plan_exercises wpe ON wp.id = wpe.plan_id 
    GROUP BY wp.id, wp.name 
    HAVING COUNT(wpe.id) = 0
  `);
  
  for (const workout of emptyWorkouts.rows as { id: string; name: string }[]) {
    const exerciseDefs = WORKOUT_PLAN_EXERCISES[workout.name];
    
    if (!exerciseDefs) {
      console.log(`  ○ Skipping "${workout.name}" - no exercise definitions`);
      continue;
    }
    
    console.log(`  Processing "${workout.name}"...`);
    let order = 0;
    let addedCount = 0;
    
    for (const exDef of exerciseDefs) {
      // Find exercise by name (case-insensitive)
      const exerciseId = exerciseMap.get(exDef.exerciseName.toLowerCase());
      
      if (!exerciseId) {
        console.log(`    ! Exercise not found: "${exDef.exerciseName}"`);
        continue;
      }
      
      try {
        await db.insert(workoutPlanExercises).values({
          planId: workout.id,
          exerciseId,
          order: order++,
          sets: exDef.sets,
          reps: exDef.reps,
          restBetweenSets: exDef.restSeconds,
          notes: exDef.notes,
        });
        addedCount++;
      } catch (error) {
        console.error(`    ✗ Error adding "${exDef.exerciseName}":`, error);
      }
    }
    
    console.log(`  ✓ Added ${addedCount} exercises to "${workout.name}"`);
  }
}

// =============================================================================
// 3. FIX PROGRAMS WITH 0 WORKOUTS
// =============================================================================

interface ProgramWeekDef {
  weekNumber: number;
  name: string;
  focus: string;
  workouts: {
    dayNumber: number;
    name: string;
    focus: string;
    estimatedDuration: number;
    workoutPlanName?: string;
  }[];
}

const PROGRAM_STRUCTURES: Record<string, { weeks: ProgramWeekDef[] }> = {
  "Texas Method": {
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "Weekly periodization",
      workouts: [
        { dayNumber: 1, name: "Volume Day", focus: "5x5 at 90% of 5RM", estimatedDuration: 75, workoutPlanName: "Texas Method - Volume Day" },
        { dayNumber: 3, name: "Recovery Day", focus: "Light technique work", estimatedDuration: 45, workoutPlanName: "Full Body Pump" },
        { dayNumber: 5, name: "Intensity Day", focus: "New 5RM PRs", estimatedDuration: 60, workoutPlanName: "Texas Method - Intensity Day" },
      ],
    })),
  },
  "Wendler 5/3/1": {
    weeks: Array.from({ length: 16 }, (_, i) => {
      const cycleWeek = (i % 4) + 1;
      return {
        weekNumber: i + 1,
        name: `Week ${i + 1}`,
        focus: cycleWeek === 4 ? "Deload" : `${cycleWeek === 1 ? "5s" : cycleWeek === 2 ? "3s" : "5/3/1"} Week`,
        workouts: [
          { dayNumber: 1, name: "Squat Day", focus: "Squat + assistance", estimatedDuration: 60, workoutPlanName: "5/3/1 - Squat Day" },
          { dayNumber: 2, name: "Bench Day", focus: "Bench + assistance", estimatedDuration: 60, workoutPlanName: "5/3/1 - Bench Day" },
          { dayNumber: 4, name: "Deadlift Day", focus: "Deadlift + assistance", estimatedDuration: 60, workoutPlanName: "5/3/1 - Deadlift Day" },
          { dayNumber: 5, name: "OHP Day", focus: "OHP + assistance", estimatedDuration: 60, workoutPlanName: "5/3/1 - OHP Day" },
        ],
      };
    }),
  },
  "Starting Strength": {
    weeks: Array.from({ length: 12 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "Linear progression",
      workouts: [
        { dayNumber: 1, name: "Workout A", focus: "Squat, Press/Bench, Deadlift", estimatedDuration: 60, workoutPlanName: "StrongLifts 5x5 - Workout A" },
        { dayNumber: 3, name: "Workout B", focus: "Squat, Bench/Press, Power Clean", estimatedDuration: 60, workoutPlanName: "StrongLifts 5x5 - Workout B" },
        { dayNumber: 5, name: "Workout A", focus: "Squat, Press/Bench, Deadlift", estimatedDuration: 60, workoutPlanName: "StrongLifts 5x5 - Workout A" },
      ],
    })),
  },
  "Madcow 5x5": {
    weeks: Array.from({ length: 12 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "Weekly progression",
      workouts: [
        { dayNumber: 1, name: "Monday", focus: "Ramping 5x5", estimatedDuration: 60, workoutPlanName: "StrongLifts 5x5 - Workout A" },
        { dayNumber: 3, name: "Wednesday", focus: "Recovery", estimatedDuration: 45, workoutPlanName: "Full Body Pump" },
        { dayNumber: 5, name: "Friday", focus: "Heavy singles/triples", estimatedDuration: 75, workoutPlanName: "Heavy Singles Day" },
      ],
    })),
  },
  "GZCLP": {
    weeks: Array.from({ length: 12 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "Tiered progression",
      workouts: [
        { dayNumber: 1, name: "Day 1", focus: "Squat T1, Bench T2", estimatedDuration: 60, workoutPlanName: "5/3/1 - Squat Day" },
        { dayNumber: 2, name: "Day 2", focus: "OHP T1, Deadlift T2", estimatedDuration: 60, workoutPlanName: "5/3/1 - OHP Day" },
        { dayNumber: 4, name: "Day 3", focus: "Bench T1, Squat T2", estimatedDuration: 60, workoutPlanName: "5/3/1 - Bench Day" },
        { dayNumber: 5, name: "Day 4", focus: "Deadlift T1, OHP T2", estimatedDuration: 60, workoutPlanName: "5/3/1 - Deadlift Day" },
      ],
    })),
  },
  "nSuns 5/3/1 LP": {
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "High volume 5/3/1",
      workouts: [
        { dayNumber: 1, name: "Bench/OHP", focus: "9 sets bench, 8 sets OHP", estimatedDuration: 90, workoutPlanName: "5/3/1 - Bench Day" },
        { dayNumber: 2, name: "Squat/Sumo", focus: "9 sets squat, 8 sets sumo", estimatedDuration: 90, workoutPlanName: "5/3/1 - Squat Day" },
        { dayNumber: 3, name: "OHP/Incline", focus: "9 sets OHP, 8 sets incline", estimatedDuration: 90, workoutPlanName: "5/3/1 - OHP Day" },
        { dayNumber: 5, name: "Deadlift/Front Squat", focus: "9 sets DL, 8 sets front squat", estimatedDuration: 90, workoutPlanName: "5/3/1 - Deadlift Day" },
        { dayNumber: 6, name: "Bench/CG Bench", focus: "9 sets bench, accessories", estimatedDuration: 75, workoutPlanName: "Chest Specialization" },
      ],
    })),
  },
  "Upper Lower Split": {
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "Upper/Lower hypertrophy",
      workouts: [
        { dayNumber: 1, name: "Upper A", focus: "Horizontal emphasis", estimatedDuration: 60, workoutPlanName: "Upper Body Hypertrophy" },
        { dayNumber: 2, name: "Lower A", focus: "Quad emphasis", estimatedDuration: 60, workoutPlanName: "Lower Body Hypertrophy" },
        { dayNumber: 4, name: "Upper B", focus: "Vertical emphasis", estimatedDuration: 60, workoutPlanName: "Upper Body Hypertrophy" },
        { dayNumber: 5, name: "Lower B", focus: "Posterior chain", estimatedDuration: 60, workoutPlanName: "Lower Body Hypertrophy" },
      ],
    })),
  },
  "German Volume Training (GVT)": {
    weeks: Array.from({ length: 6 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 3 ? "10x10 Phase" : "Intensification",
      workouts: [
        { dayNumber: 1, name: "Chest & Back", focus: "10x10 antagonist supersets", estimatedDuration: 75, workoutPlanName: "German Volume Training - Chest" },
        { dayNumber: 2, name: "Legs", focus: "10x10 squats + accessories", estimatedDuration: 75, workoutPlanName: "Leg Day Destroyer" },
        { dayNumber: 4, name: "Arms", focus: "10x10 biceps/triceps", estimatedDuration: 60, workoutPlanName: "Classic Arm Blaster" },
        { dayNumber: 5, name: "Shoulders", focus: "10x10 laterals + presses", estimatedDuration: 60, workoutPlanName: "FST-7 Shoulders" },
      ],
    })),
  },
  "Arnold Blueprint to Mass": {
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "High volume bodybuilding",
      workouts: [
        { dayNumber: 1, name: "Chest & Back", focus: "Supersets", estimatedDuration: 75, workoutPlanName: "Arnold Chest & Back" },
        { dayNumber: 2, name: "Shoulders & Arms", focus: "Giant sets", estimatedDuration: 60, workoutPlanName: "Shoulder Boulder Builder" },
        { dayNumber: 3, name: "Legs", focus: "High volume legs", estimatedDuration: 75, workoutPlanName: "Leg Day Destroyer" },
        { dayNumber: 4, name: "Chest & Back", focus: "Supersets", estimatedDuration: 75, workoutPlanName: "Arnold Chest & Back" },
        { dayNumber: 5, name: "Shoulders & Arms", focus: "Giant sets", estimatedDuration: 60, workoutPlanName: "Classic Arm Blaster" },
        { dayNumber: 6, name: "Legs", focus: "High volume legs", estimatedDuration: 75, workoutPlanName: "Legs Day (PPL)" },
      ],
    })),
  },
  "PHAT (Power Hypertrophy Adaptive Training)": {
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "Power + Hypertrophy",
      workouts: [
        { dayNumber: 1, name: "Upper Power", focus: "Heavy compounds", estimatedDuration: 60, workoutPlanName: "Heavy Singles Day" },
        { dayNumber: 2, name: "Lower Power", focus: "Heavy squats/deads", estimatedDuration: 60, workoutPlanName: "5/3/1 - Squat Day" },
        { dayNumber: 4, name: "Back & Shoulders", focus: "Hypertrophy", estimatedDuration: 60, workoutPlanName: "Back Width & Thickness" },
        { dayNumber: 5, name: "Lower Hypertrophy", focus: "Volume legs", estimatedDuration: 60, workoutPlanName: "Lower Body Hypertrophy" },
        { dayNumber: 6, name: "Chest & Arms", focus: "Hypertrophy", estimatedDuration: 60, workoutPlanName: "Bro Split - Chest Monday" },
      ],
    })),
  },
  "PHUL (Power Hypertrophy Upper Lower)": {
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "Power + Hypertrophy split",
      workouts: [
        { dayNumber: 1, name: "Upper Power", focus: "Heavy upper compounds", estimatedDuration: 60, workoutPlanName: "5/3/1 - Bench Day" },
        { dayNumber: 2, name: "Lower Power", focus: "Heavy lower compounds", estimatedDuration: 60, workoutPlanName: "5/3/1 - Squat Day" },
        { dayNumber: 4, name: "Upper Hypertrophy", focus: "Volume upper", estimatedDuration: 60, workoutPlanName: "Upper Body Hypertrophy" },
        { dayNumber: 5, name: "Lower Hypertrophy", focus: "Volume lower", estimatedDuration: 60, workoutPlanName: "Lower Body Hypertrophy" },
      ],
    })),
  },
  "Bro Split": {
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "Classic bodybuilding",
      workouts: [
        { dayNumber: 1, name: "Chest", focus: "Chest day", estimatedDuration: 60, workoutPlanName: "Bro Split - Chest Monday" },
        { dayNumber: 2, name: "Back", focus: "Back width & thickness", estimatedDuration: 60, workoutPlanName: "Back Width & Thickness" },
        { dayNumber: 3, name: "Shoulders", focus: "Boulder shoulders", estimatedDuration: 50, workoutPlanName: "Shoulder Boulder Builder" },
        { dayNumber: 4, name: "Legs", focus: "Leg day", estimatedDuration: 60, workoutPlanName: "Leg Day Destroyer" },
        { dayNumber: 5, name: "Arms", focus: "Arm blaster", estimatedDuration: 50, workoutPlanName: "Classic Arm Blaster" },
      ],
    })),
  },
  "FST-7 (Fascia Stretch Training)": {
    weeks: Array.from({ length: 6 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "Fascia stretch protocol",
      workouts: [
        { dayNumber: 1, name: "Chest & Triceps", focus: "FST-7 chest finisher", estimatedDuration: 60, workoutPlanName: "Chest Specialization" },
        { dayNumber: 2, name: "Back & Biceps", focus: "FST-7 back finisher", estimatedDuration: 60, workoutPlanName: "Back Width & Thickness" },
        { dayNumber: 3, name: "Shoulders", focus: "FST-7 shoulders", estimatedDuration: 50, workoutPlanName: "FST-7 Shoulders" },
        { dayNumber: 5, name: "Quads & Hams", focus: "FST-7 legs", estimatedDuration: 70, workoutPlanName: "Leg Day Destroyer" },
        { dayNumber: 6, name: "Arms", focus: "FST-7 arms finisher", estimatedDuration: 50, workoutPlanName: "Classic Arm Blaster" },
      ],
    })),
  },
  "Smolov Jr": {
    weeks: Array.from({ length: 3 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 2 ? "Building volume" : "Peak week",
      workouts: [
        { dayNumber: 1, name: "Day 1", focus: "6x6 @ 70%", estimatedDuration: 60, workoutPlanName: "5/3/1 - Bench Day" },
        { dayNumber: 2, name: "Day 2", focus: "7x5 @ 75%", estimatedDuration: 60, workoutPlanName: "5/3/1 - Bench Day" },
        { dayNumber: 4, name: "Day 3", focus: "8x4 @ 80%", estimatedDuration: 60, workoutPlanName: "5/3/1 - Bench Day" },
        { dayNumber: 5, name: "Day 4", focus: "10x3 @ 85%", estimatedDuration: 60, workoutPlanName: "Heavy Singles Day" },
      ],
    })),
  },
  "Couch to 5K (C25K)": {
    weeks: Array.from({ length: 9 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 3 ? "Walk/run intervals" : i < 6 ? "Building endurance" : "Race prep",
      workouts: [
        { dayNumber: 1, name: `Week ${i + 1} Day 1`, focus: "Run/walk intervals", estimatedDuration: 30, workoutPlanName: "Tempo Run" },
        { dayNumber: 3, name: `Week ${i + 1} Day 2`, focus: "Run/walk intervals", estimatedDuration: 30, workoutPlanName: "Tempo Run" },
        { dayNumber: 5, name: `Week ${i + 1} Day 3`, focus: "Run/walk intervals", estimatedDuration: 30, workoutPlanName: "Tempo Run" },
      ],
    })),
  },
  "10K Training Plan": {
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 4 ? "Base building" : "Speed work",
      workouts: [
        { dayNumber: 1, name: "Easy Run", focus: "Recovery pace", estimatedDuration: 40, workoutPlanName: "Long Slow Distance" },
        { dayNumber: 2, name: "Speed Work", focus: "Intervals", estimatedDuration: 45, workoutPlanName: "Sprint Intervals" },
        { dayNumber: 4, name: "Tempo Run", focus: "Threshold pace", estimatedDuration: 45, workoutPlanName: "Tempo Run" },
        { dayNumber: 6, name: "Long Run", focus: "Endurance", estimatedDuration: 60, workoutPlanName: "Long Slow Distance" },
      ],
    })),
  },
  "Half Marathon Training": {
    weeks: Array.from({ length: 12 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 4 ? "Base building" : i < 8 ? "Building mileage" : i < 11 ? "Peak training" : "Taper",
      workouts: [
        { dayNumber: 1, name: "Easy Run", focus: "Recovery", estimatedDuration: 45, workoutPlanName: "Long Slow Distance" },
        { dayNumber: 2, name: "Speed Work", focus: "Track work", estimatedDuration: 50, workoutPlanName: "Sprint Intervals" },
        { dayNumber: 4, name: "Tempo Run", focus: "Race pace", estimatedDuration: 50, workoutPlanName: "Tempo Run" },
        { dayNumber: 5, name: "Easy Run", focus: "Shake out", estimatedDuration: 30, workoutPlanName: "Long Slow Distance" },
        { dayNumber: 6, name: "Long Run", focus: "Endurance", estimatedDuration: 90, workoutPlanName: "Long Slow Distance" },
      ],
    })),
  },
  "Sprint Speed Development": {
    weeks: Array.from({ length: 6 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 2 ? "Acceleration" : i < 4 ? "Top speed" : "Race prep",
      workouts: [
        { dayNumber: 1, name: "Sprint Day", focus: "Short sprints", estimatedDuration: 60, workoutPlanName: "Sprint Intervals" },
        { dayNumber: 2, name: "Strength", focus: "Power development", estimatedDuration: 60, workoutPlanName: "5/3/1 - Squat Day" },
        { dayNumber: 4, name: "Speed Endurance", focus: "Longer sprints", estimatedDuration: 50, workoutPlanName: "Hill Sprint Session" },
        { dayNumber: 5, name: "Plyometrics", focus: "Explosive power", estimatedDuration: 45, workoutPlanName: "Full Body Pump" },
      ],
    })),
  },
  "Vertical Jump Program": {
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 3 ? "Strength phase" : i < 6 ? "Power phase" : "Peaking",
      workouts: [
        { dayNumber: 1, name: "Strength", focus: "Heavy squats", estimatedDuration: 60, workoutPlanName: "5/3/1 - Squat Day" },
        { dayNumber: 2, name: "Plyometrics", focus: "Jump training", estimatedDuration: 45, workoutPlanName: "Full Body Pump" },
        { dayNumber: 4, name: "Power", focus: "Olympic lifts", estimatedDuration: 50, workoutPlanName: "5/3/1 - Deadlift Day" },
        { dayNumber: 5, name: "Reactive", focus: "Depth jumps", estimatedDuration: 40, workoutPlanName: "Full Body Pump" },
      ],
    })),
  },
  "Athletic Performance": {
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "Well-rounded athleticism",
      workouts: [
        { dayNumber: 1, name: "Strength", focus: "Compound lifts", estimatedDuration: 60, workoutPlanName: "5/3/1 - Squat Day" },
        { dayNumber: 2, name: "Conditioning", focus: "MetCon", estimatedDuration: 45, workoutPlanName: "12-Minute AMRAP" },
        { dayNumber: 3, name: "Skill + Power", focus: "Olympic lifts", estimatedDuration: 50, workoutPlanName: "5/3/1 - Deadlift Day" },
        { dayNumber: 5, name: "HIIT", focus: "High intensity", estimatedDuration: 30, workoutPlanName: "Tabata Something Else" },
        { dayNumber: 6, name: "Active Recovery", focus: "Mobility + cardio", estimatedDuration: 40, workoutPlanName: "Long Slow Distance" },
      ],
    })),
  },
  "Muscle-Up Mastery": {
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 3 ? "Pull-up strength" : i < 6 ? "Transition work" : "Muscle-up practice",
      workouts: [
        { dayNumber: 1, name: "Pull Strength", focus: "Weighted pull-ups", estimatedDuration: 45, workoutPlanName: "Pull Day" },
        { dayNumber: 2, name: "Push Strength", focus: "Dips & pressing", estimatedDuration: 45, workoutPlanName: "Push Day" },
        { dayNumber: 4, name: "Skill Work", focus: "Transition drills", estimatedDuration: 30, workoutPlanName: "Full Body Pump" },
        { dayNumber: 5, name: "Full Upper", focus: "Volume work", estimatedDuration: 50, workoutPlanName: "Upper Body Hypertrophy" },
      ],
    })),
  },
  "Handstand Journey": {
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 3 ? "Wall work" : i < 6 ? "Balance practice" : "Freestanding",
      workouts: [
        { dayNumber: 1, name: "Handstand Practice", focus: "Wall handstands", estimatedDuration: 30, workoutPlanName: "Full Body Pump" },
        { dayNumber: 2, name: "Shoulder Strength", focus: "Press & support", estimatedDuration: 40, workoutPlanName: "Shoulder Boulder Builder" },
        { dayNumber: 4, name: "Balance Work", focus: "Kick-ups & holds", estimatedDuration: 25, workoutPlanName: "Full Body Pump" },
        { dayNumber: 5, name: "Core & Wrist", focus: "Prep work", estimatedDuration: 30, workoutPlanName: "Full Body Pump" },
      ],
    })),
  },
  "Mobility Overhaul": {
    weeks: Array.from({ length: 4 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "Flexibility & mobility",
      workouts: [
        { dayNumber: 1, name: "Lower Body", focus: "Hip & ankle mobility", estimatedDuration: 30, workoutPlanName: "Full Body Pump" },
        { dayNumber: 2, name: "Upper Body", focus: "Shoulder & thoracic", estimatedDuration: 30, workoutPlanName: "Full Body Pump" },
        { dayNumber: 4, name: "Spine", focus: "Spinal mobility", estimatedDuration: 25, workoutPlanName: "Full Body Pump" },
        { dayNumber: 5, name: "Full Body Flow", focus: "Dynamic stretching", estimatedDuration: 35, workoutPlanName: "Full Body Pump" },
        { dayNumber: 6, name: "Deep Stretch", focus: "Long holds", estimatedDuration: 40, workoutPlanName: "Full Body Pump" },
      ],
    })),
  },
};

async function fixProgramWorkouts() {
  console.log("\n=== Fixing Programs with 0 Workouts ===");
  
  // Get system circle
  let systemCircle = await db.query.circles.findFirst({
    where: (c, { eq }) => eq(c.name, "System"),
  });
  
  if (!systemCircle) {
    const [created] = await db.insert(circles).values({
      name: "System",
      description: "System-generated content",
      visibility: "private",
    }).returning();
    systemCircle = created;
  }
  
  // Get workout plan name to ID mapping
  const allWorkoutPlans = await db.query.workoutPlans.findMany({
    columns: { id: true, name: true },
  });
  const workoutPlanMap = new Map(allWorkoutPlans.map(w => [w.name, w.id]));
  
  // Get programs with 0 workouts
  const emptyPrograms = await db.execute(sql`
    SELECT cp.id, cp.name
    FROM community_programs cp
    LEFT JOIN program_workouts pw ON cp.id = pw.program_id
    GROUP BY cp.id, cp.name
    HAVING COUNT(pw.id) = 0
  `);
  
  for (const program of emptyPrograms.rows as { id: string; name: string }[]) {
    const structure = PROGRAM_STRUCTURES[program.name];
    
    if (!structure) {
      console.log(`  ○ Skipping "${program.name}" - no structure defined`);
      continue;
    }
    
    console.log(`  Processing "${program.name}"...`);
    let weekCount = 0;
    let workoutCount = 0;
    
    for (const weekDef of structure.weeks) {
      // Create week
      const [week] = await db.insert(programWeeks).values({
        programId: program.id,
        weekNumber: weekDef.weekNumber,
        name: weekDef.name,
        focus: weekDef.focus,
      }).returning();
      weekCount++;
      
      // Create workouts for this week
      for (const workoutDef of weekDef.workouts) {
        const workoutPlanId = workoutDef.workoutPlanName
          ? workoutPlanMap.get(workoutDef.workoutPlanName)
          : null;
        
        if (workoutDef.workoutPlanName && !workoutPlanId) {
          console.log(`    ! Workout plan not found: "${workoutDef.workoutPlanName}"`);
        }
        
        await db.insert(programWorkouts).values({
          programId: program.id,
          weekId: week.id,
          weekNumber: weekDef.weekNumber,
          dayNumber: workoutDef.dayNumber,
          name: workoutDef.name,
          focus: workoutDef.focus,
          estimatedDuration: workoutDef.estimatedDuration,
          workoutPlanId,
        });
        workoutCount++;
      }
    }
    
    console.log(`  ✓ Added ${weekCount} weeks and ${workoutCount} workouts to "${program.name}"`);
  }
}

// =============================================================================
// 4. FIX CHALLENGES MISSING DESCRIPTIONS
// =============================================================================

const CHALLENGE_DESCRIPTIONS: Record<string, string> = {
  "100 Burpees a Day": "30 days of 100 daily burpees. This isn't just a fitness challenge - it's a test of mental fortitude. Can you handle 3,000 burpees in a month?",
  "10K Steps Daily": "Walk 10,000 steps every day for 30 days. Simple but transformative for health, energy, and establishing a foundation of daily movement.",
  "30-Day Push-Up Challenge": "Transform your upper body strength in 30 days. Start wherever you are and build up to 100 push-ups through progressive daily practice.",
  "Couch to 5K": "The proven 9-week program that takes complete beginners from zero running to completing a 5K (3.1 miles). Gradual progression ensures sustainable improvement.",
  "Flexibility Flow": "21 days of dedicated stretching and mobility work. Improve your range of motion, reduce injury risk, and feel better in your body.",
  "HIIT Warrior": "Two weeks of intense daily HIIT training. Push your limits with high-intensity workouts designed to boost metabolism and build conditioning.",
  "Morning Yoga": "Start each morning with yoga for 30 days. Build a sustainable morning practice that energizes your day and improves flexibility.",
  "Muscle Up Mission": "The ultimate calisthenics achievement. This 90-day program takes you from strong pull-ups to your first muscle-up through structured progression.",
  "Pull-Up Progress": "Master the pull-up in 60 days. Whether you can't do one yet or want to hit double digits, this program will get you there.",
  "Summer Shred": "45 days of training and nutrition focus to get lean for summer. Combines HIIT workouts with strength training for maximum fat loss.",
};

async function fixChallengeDescriptions() {
  console.log("\n=== Fixing Challenges Missing Descriptions ===");
  
  for (const [name, description] of Object.entries(CHALLENGE_DESCRIPTIONS)) {
    try {
      const result = await db
        .update(challenges)
        .set({ description })
        .where(
          and(
            eq(challenges.name, name),
            or(
              isNull(challenges.description),
              eq(challenges.description, "")
            )
          )
        )
        .returning();
      
      if (result.length > 0) {
        console.log(`  ✓ Added description to "${name}"`);
      }
    } catch (error) {
      console.error(`  ✗ Error updating "${name}":`, error);
    }
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║           COMPREHENSIVE DATA FIX SCRIPT                       ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  
  try {
    await fixExerciseMuscleGroups();
    await fixWorkoutPlanExercises();
    await fixProgramWorkouts();
    await fixChallengeDescriptions();
    
    console.log("\n✅ All data fixes completed!");
    console.log("\nRun the audit again to verify all issues are resolved.");
  } catch (error) {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
