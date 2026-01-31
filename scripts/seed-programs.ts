/**
 * Seed script to create official multi-week training programs
 * 
 * Run with: npx tsx scripts/seed-programs.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import {
  communityPrograms,
  programWeeks,
  programWorkouts,
  workoutPlans,
  circles,
} from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Cache for workout plan IDs
const workoutPlanCache: Map<string, string> = new Map();

// Get workout plan ID by name
async function getWorkoutPlanId(name: string, circleId: string): Promise<string | null> {
  const cacheKey = `${circleId}:${name}`;
  if (workoutPlanCache.has(cacheKey)) {
    return workoutPlanCache.get(cacheKey)!;
  }

  const plan = await db.query.workoutPlans.findFirst({
    where: (w, { and, eq }) => and(
      eq(w.name, name),
      eq(w.circleId, circleId)
    ),
    columns: { id: true },
  });

  if (plan) {
    workoutPlanCache.set(cacheKey, plan.id);
    return plan.id;
  }

  return null;
}

// Workout name mappings for programs
const WORKOUT_NAMES = {
  // Strength - 5/3/1
  "531_squat": "5/3/1 - Squat Day",
  "531_bench": "5/3/1 - Bench Day",
  "531_deadlift": "5/3/1 - Deadlift Day",
  "531_ohp": "5/3/1 - OHP Day",
  
  // StrongLifts
  "sl_a": "StrongLifts 5x5 - Workout A",
  "sl_b": "StrongLifts 5x5 - Workout B",
  
  // Texas Method
  "texas_volume": "Texas Method - Volume Day",
  "texas_intensity": "Texas Method - Intensity Day",
  
  // PPL
  "push": "Push Day",
  "pull": "Pull Day",
  "legs_ppl": "Legs Day (PPL)",
  
  // Hypertrophy
  "upper_hypertrophy": "Upper Body Hypertrophy",
  "lower_hypertrophy": "Lower Body Hypertrophy",
  
  // Arnold
  "arnold_chest_back": "Arnold Chest & Back",
  
  // GVT
  "gvt_chest": "German Volume Training - Chest",
  
  // Specialization
  "deadlift_special": "Deadlift Specialization",
  "chest_special": "Chest Specialization",
  "shoulder_builder": "Shoulder Boulder Builder",
  "back_builder": "Back Width & Thickness",
  "arm_blaster": "Classic Arm Blaster",
  "leg_destroyer": "Leg Day Destroyer",
  "heavy_singles": "Heavy Singles Day",
  "full_body_pump": "Full Body Pump",
  "bro_chest": "Bro Split - Chest Monday",
  "fst7_shoulders": "FST-7 Shoulders",
  
  // CrossFit/HIIT
  "fran": "Fran",
  "murph": "Murph",
  "helen": "Helen",
  "grace": "Grace",
  "isabel": "Isabel",
  "cindy": "Cindy",
  "dt": "DT",
  "filthy_fifty": "Filthy Fifty",
  "chipper": "The Chipper",
  "fight_gone_bad": "Fight Gone Bad",
  "death_burpees": "Death by Burpees",
  "tabata": "Tabata Something Else",
  "amrap_12": "12-Minute AMRAP",
  "emom_20": "EMOM 20",
  
  // Cardio
  "tempo_run": "Tempo Run",
  "sprint_intervals": "Sprint Intervals",
  "hill_sprints": "Hill Sprint Session",
  "fartlek": "Fartlek Run",
  "long_slow": "Long Slow Distance",
  "rowing_intervals": "Rowing Intervals",
  "row_ladder": "Row Ladder",
  "bike_pyramid": "Bike Pyramid",
  "assault_bike": "Assault Bike Intervals",
  "jump_rope": "Jump Rope Conditioning",
};

interface ProgramDefinition {
  name: string;
  description: string;
  category: string;
  difficulty: string;
  durationWeeks: number;
  daysPerWeek: number;
  avgWorkoutDuration: number;
  primaryGoal: string;
  targetMuscles: string[];
  equipmentRequired: string[];
  weeks: {
    weekNumber: number;
    name: string;
    focus: string;
    notes?: string;
    workouts: {
      dayNumber: number;
      name: string;
      focus: string;
      workoutKey?: keyof typeof WORKOUT_NAMES;
      estimatedDuration: number;
      notes?: string;
    }[];
  }[];
}

const PROGRAMS: ProgramDefinition[] = [
  // 1. StrongLifts 5x5
  {
    name: "StrongLifts 5x5",
    description: "The classic beginner strength program. Build a foundation of strength with compound lifts, adding weight every session. Perfect for new lifters looking to get strong fast.",
    category: "strength",
    difficulty: "beginner",
    durationWeeks: 12,
    daysPerWeek: 3,
    avgWorkoutDuration: 45,
    primaryGoal: "Build strength foundation",
    targetMuscles: ["chest", "back", "legs", "shoulders", "arms"],
    equipmentRequired: ["barbell", "squat rack", "bench"],
    weeks: Array.from({ length: 12 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 4 ? "Learning the lifts" : i < 8 ? "Building strength" : "Pushing limits",
      notes: i === 0 ? "Start light, focus on form" : undefined,
      workouts: [
        { dayNumber: 1, name: "Workout A", focus: "Squat, Bench, Row", workoutKey: "sl_a" as const, estimatedDuration: 45 },
        { dayNumber: 3, name: "Workout B", focus: "Squat, OHP, Deadlift", workoutKey: "sl_b" as const, estimatedDuration: 45 },
        { dayNumber: 5, name: "Workout A", focus: "Squat, Bench, Row", workoutKey: "sl_a" as const, estimatedDuration: 45 },
      ],
    })),
  },
  
  // 2. 5/3/1 For Beginners
  {
    name: "5/3/1 Beginner",
    description: "Jim Wendler's proven strength program adapted for beginners. Four days per week focusing on the big four lifts with submaximal training for steady, sustainable progress.",
    category: "powerlifting",
    difficulty: "intermediate",
    durationWeeks: 16,
    daysPerWeek: 4,
    avgWorkoutDuration: 60,
    primaryGoal: "Long-term strength development",
    targetMuscles: ["chest", "back", "legs", "shoulders"],
    equipmentRequired: ["barbell", "squat rack", "bench", "pull-up bar"],
    weeks: Array.from({ length: 16 }, (_, i) => {
      const cycleWeek = (i % 4) + 1;
      return {
        weekNumber: i + 1,
        name: `Week ${i + 1} (Cycle ${Math.floor(i / 4) + 1}, Week ${cycleWeek})`,
        focus: cycleWeek === 1 ? "5s Week" : cycleWeek === 2 ? "3s Week" : cycleWeek === 3 ? "5/3/1 Week" : "Deload",
        workouts: [
          { dayNumber: 1, name: "Squat Day", focus: "Squat + assistance", workoutKey: "531_squat" as const, estimatedDuration: 60 },
          { dayNumber: 2, name: "Bench Day", focus: "Bench + assistance", workoutKey: "531_bench" as const, estimatedDuration: 60 },
          { dayNumber: 4, name: "Deadlift Day", focus: "Deadlift + assistance", workoutKey: "531_deadlift" as const, estimatedDuration: 60 },
          { dayNumber: 5, name: "OHP Day", focus: "Overhead Press + assistance", workoutKey: "531_ohp" as const, estimatedDuration: 60 },
        ],
      };
    }),
  },
  
  // 3. Texas Method
  {
    name: "Texas Method",
    description: "An intermediate program built around weekly periodization. Volume day builds work capacity, recovery day maintains, and intensity day sets PRs.",
    category: "powerlifting",
    difficulty: "intermediate",
    durationWeeks: 8,
    daysPerWeek: 3,
    avgWorkoutDuration: 75,
    primaryGoal: "Break through plateaus",
    targetMuscles: ["chest", "back", "legs"],
    equipmentRequired: ["barbell", "squat rack", "bench"],
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 2 ? "Adaptation" : i < 6 ? "Progressive overload" : "Peaking",
      workouts: [
        { dayNumber: 1, name: "Volume Day", focus: "5x5 @ 90% of 5RM", workoutKey: "texas_volume" as const, estimatedDuration: 90 },
        { dayNumber: 3, name: "Recovery Day", focus: "Light technique work", workoutKey: "full_body_pump" as const, estimatedDuration: 45 },
        { dayNumber: 5, name: "Intensity Day", focus: "Work up to new 5RM", workoutKey: "texas_intensity" as const, estimatedDuration: 75 },
      ],
    })),
  },
  
  // 4. Push/Pull/Legs
  {
    name: "Push Pull Legs (PPL)",
    description: "The classic bodybuilding split run twice per week. Great balance of volume and frequency for building muscle. Perfect for intermediate lifters.",
    category: "hypertrophy",
    difficulty: "intermediate",
    durationWeeks: 8,
    daysPerWeek: 6,
    avgWorkoutDuration: 60,
    primaryGoal: "Build muscle mass",
    targetMuscles: ["chest", "back", "legs", "shoulders", "arms"],
    equipmentRequired: ["barbell", "dumbbells", "cable machine", "squat rack"],
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 2 ? "Building volume tolerance" : i < 6 ? "Progressive overload" : "Intensification",
      workouts: [
        { dayNumber: 1, name: "Push A", focus: "Chest, shoulders, triceps", workoutKey: "push" as const, estimatedDuration: 60 },
        { dayNumber: 2, name: "Pull A", focus: "Back, biceps, rear delts", workoutKey: "pull" as const, estimatedDuration: 60 },
        { dayNumber: 3, name: "Legs A", focus: "Quads, hamstrings, calves", workoutKey: "legs_ppl" as const, estimatedDuration: 60 },
        { dayNumber: 4, name: "Push B", focus: "Chest, shoulders, triceps", workoutKey: "push" as const, estimatedDuration: 60 },
        { dayNumber: 5, name: "Pull B", focus: "Back, biceps, rear delts", workoutKey: "pull" as const, estimatedDuration: 60 },
        { dayNumber: 6, name: "Legs B", focus: "Quads, hamstrings, calves", workoutKey: "legs_ppl" as const, estimatedDuration: 60 },
      ],
    })),
  },
  
  // 5. Upper/Lower Split
  {
    name: "Upper Lower Hypertrophy",
    description: "A 4-day hypertrophy-focused split hitting each muscle group twice per week. Optimal frequency for muscle growth with manageable time commitment.",
    category: "hypertrophy",
    difficulty: "intermediate",
    durationWeeks: 8,
    daysPerWeek: 4,
    avgWorkoutDuration: 60,
    primaryGoal: "Maximize muscle growth",
    targetMuscles: ["chest", "back", "legs", "shoulders", "arms"],
    equipmentRequired: ["barbell", "dumbbells", "cable machine"],
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 2 ? "Volume accumulation" : i < 6 ? "Progressive overload" : "Deload/Intensify",
      workouts: [
        { dayNumber: 1, name: "Upper A", focus: "Horizontal push/pull emphasis", workoutKey: "upper_hypertrophy" as const, estimatedDuration: 60 },
        { dayNumber: 2, name: "Lower A", focus: "Quad emphasis", workoutKey: "lower_hypertrophy" as const, estimatedDuration: 60 },
        { dayNumber: 4, name: "Upper B", focus: "Vertical push/pull emphasis", workoutKey: "upper_hypertrophy" as const, estimatedDuration: 60 },
        { dayNumber: 5, name: "Lower B", focus: "Posterior chain emphasis", workoutKey: "lower_hypertrophy" as const, estimatedDuration: 60 },
      ],
    })),
  },
  
  // 6. German Volume Training
  {
    name: "German Volume Training",
    description: "The legendary 10x10 program for extreme muscle growth. Not for the faint of heart - this high-volume program will challenge even experienced lifters.",
    category: "hypertrophy",
    difficulty: "advanced",
    durationWeeks: 6,
    daysPerWeek: 4,
    avgWorkoutDuration: 75,
    primaryGoal: "Extreme muscle hypertrophy",
    targetMuscles: ["chest", "back", "legs", "shoulders"],
    equipmentRequired: ["barbell", "dumbbells"],
    weeks: Array.from({ length: 6 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 3 ? "10x10 Phase" : "Intensification Phase",
      notes: i === 0 ? "Start with 60% 1RM for 10x10" : undefined,
      workouts: [
        { dayNumber: 1, name: "Chest & Back", focus: "10x10 antagonist supersets", workoutKey: "gvt_chest" as const, estimatedDuration: 75 },
        { dayNumber: 2, name: "Legs", focus: "10x10 squats + accessories", workoutKey: "leg_destroyer" as const, estimatedDuration: 75 },
        { dayNumber: 4, name: "Arms", focus: "10x10 biceps/triceps supersets", workoutKey: "arm_blaster" as const, estimatedDuration: 60 },
        { dayNumber: 5, name: "Shoulders", focus: "10x10 lateral raises + presses", workoutKey: "fst7_shoulders" as const, estimatedDuration: 60 },
      ],
    })),
  },
  
  // 7. CrossFit Benchmark Series
  {
    name: "CrossFit Benchmark Series",
    description: "Master the classic CrossFit benchmark workouts. From Fran to Murph, build work capacity and test yourself against the community standards.",
    category: "functional",
    difficulty: "advanced",
    durationWeeks: 4,
    daysPerWeek: 5,
    avgWorkoutDuration: 45,
    primaryGoal: "Improve work capacity",
    targetMuscles: ["full body"],
    equipmentRequired: ["barbell", "pull-up bar", "kettlebell", "box", "rower"],
    weeks: [
      {
        weekNumber: 1,
        name: "The Girls",
        focus: "Classic benchmark workouts",
        workouts: [
          { dayNumber: 1, name: "Fran", focus: "Thrusters + Pull-ups", workoutKey: "fran" as const, estimatedDuration: 20 },
          { dayNumber: 2, name: "Grace", focus: "Clean & Jerks", workoutKey: "grace" as const, estimatedDuration: 15 },
          { dayNumber: 3, name: "Helen", focus: "Run, Swings, Pull-ups", workoutKey: "helen" as const, estimatedDuration: 25 },
          { dayNumber: 4, name: "Isabel", focus: "Snatches for time", workoutKey: "isabel" as const, estimatedDuration: 15 },
          { dayNumber: 5, name: "Cindy", focus: "20min AMRAP", workoutKey: "cindy" as const, estimatedDuration: 20 },
        ],
      },
      {
        weekNumber: 2,
        name: "Hero WODs",
        focus: "Honor workout series",
        workouts: [
          { dayNumber: 1, name: "Murph", focus: "The classic hero WOD", workoutKey: "murph" as const, estimatedDuration: 60 },
          { dayNumber: 2, name: "DT", focus: "Deadlift, Hang Clean, Push Jerk", workoutKey: "dt" as const, estimatedDuration: 20 },
          { dayNumber: 3, name: "Recovery", focus: "Active recovery", workoutKey: "long_slow" as const, estimatedDuration: 30 },
          { dayNumber: 4, name: "Fight Gone Bad", focus: "3 rounds, 5 stations", workoutKey: "fight_gone_bad" as const, estimatedDuration: 25 },
          { dayNumber: 5, name: "Filthy Fifty", focus: "50 reps of 10 movements", workoutKey: "filthy_fifty" as const, estimatedDuration: 45 },
        ],
      },
      {
        weekNumber: 3,
        name: "Conditioning",
        focus: "Build work capacity",
        workouts: [
          { dayNumber: 1, name: "Chipper", focus: "Long format work", workoutKey: "chipper" as const, estimatedDuration: 40 },
          { dayNumber: 2, name: "EMOM 20", focus: "Every minute on the minute", workoutKey: "emom_20" as const, estimatedDuration: 20 },
          { dayNumber: 3, name: "12-Min AMRAP", focus: "Max rounds", workoutKey: "amrap_12" as const, estimatedDuration: 15 },
          { dayNumber: 4, name: "Tabata Mix", focus: "20s on, 10s off", workoutKey: "tabata" as const, estimatedDuration: 25 },
          { dayNumber: 5, name: "Death by Burpees", focus: "EMOM burpee ladder", workoutKey: "death_burpees" as const, estimatedDuration: 20 },
        ],
      },
      {
        weekNumber: 4,
        name: "Test Week",
        focus: "Retest benchmarks",
        workouts: [
          { dayNumber: 1, name: "Fran Retest", focus: "Beat your time", workoutKey: "fran" as const, estimatedDuration: 20 },
          { dayNumber: 2, name: "Grace Retest", focus: "Beat your time", workoutKey: "grace" as const, estimatedDuration: 15 },
          { dayNumber: 3, name: "Helen Retest", focus: "Beat your time", workoutKey: "helen" as const, estimatedDuration: 25 },
          { dayNumber: 4, name: "Cindy Retest", focus: "Beat your score", workoutKey: "cindy" as const, estimatedDuration: 20 },
          { dayNumber: 5, name: "Murph Retest", focus: "Beat your time", workoutKey: "murph" as const, estimatedDuration: 60 },
        ],
      },
    ],
  },
  
  // 8. Couch to 5K
  {
    name: "Couch to 5K",
    description: "The proven running program for absolute beginners. Go from zero to running 5K (3.1 miles) in 9 weeks with gradual, sustainable progression.",
    category: "cardio",
    difficulty: "beginner",
    durationWeeks: 9,
    daysPerWeek: 3,
    avgWorkoutDuration: 30,
    primaryGoal: "Run 5K without stopping",
    targetMuscles: ["legs", "cardiovascular"],
    equipmentRequired: ["running shoes"],
    weeks: [
      { weekNumber: 1, name: "Week 1", focus: "Walk/run intervals", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "60s run, 90s walk x8", estimatedDuration: 25, notes: "Run at conversational pace" },
        { dayNumber: 3, name: "Day 2", focus: "60s run, 90s walk x8", estimatedDuration: 25 },
        { dayNumber: 5, name: "Day 3", focus: "60s run, 90s walk x8", estimatedDuration: 25 },
      ]},
      { weekNumber: 2, name: "Week 2", focus: "Longer run intervals", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "90s run, 2min walk x6", estimatedDuration: 25 },
        { dayNumber: 3, name: "Day 2", focus: "90s run, 2min walk x6", estimatedDuration: 25 },
        { dayNumber: 5, name: "Day 3", focus: "90s run, 2min walk x6", estimatedDuration: 25 },
      ]},
      { weekNumber: 3, name: "Week 3", focus: "Mixed intervals", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "90s, 3min, 90s, 3min run", estimatedDuration: 28 },
        { dayNumber: 3, name: "Day 2", focus: "90s, 3min, 90s, 3min run", estimatedDuration: 28 },
        { dayNumber: 5, name: "Day 3", focus: "90s, 3min, 90s, 3min run", estimatedDuration: 28 },
      ]},
      { weekNumber: 4, name: "Week 4", focus: "Longer runs", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "3, 5, 3, 5 min runs", estimatedDuration: 30 },
        { dayNumber: 3, name: "Day 2", focus: "3, 5, 3, 5 min runs", estimatedDuration: 30 },
        { dayNumber: 5, name: "Day 3", focus: "3, 5, 3, 5 min runs", estimatedDuration: 30 },
      ]},
      { weekNumber: 5, name: "Week 5", focus: "Building endurance", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "5, 3, 5, 3, 5 min runs", workoutKey: "fartlek" as const, estimatedDuration: 30 },
        { dayNumber: 3, name: "Day 2", focus: "8 min, 8 min runs", estimatedDuration: 30 },
        { dayNumber: 5, name: "Day 3", focus: "20 min continuous run", workoutKey: "tempo_run" as const, estimatedDuration: 30, notes: "Big milestone!" },
      ]},
      { weekNumber: 6, name: "Week 6", focus: "Extending runs", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "5, 8, 5 min runs", estimatedDuration: 30 },
        { dayNumber: 3, name: "Day 2", focus: "10 min, 10 min runs", estimatedDuration: 30 },
        { dayNumber: 5, name: "Day 3", focus: "25 min continuous", workoutKey: "tempo_run" as const, estimatedDuration: 35 },
      ]},
      { weekNumber: 7, name: "Week 7", focus: "25 minute runs", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "25 min continuous", workoutKey: "tempo_run" as const, estimatedDuration: 35 },
        { dayNumber: 3, name: "Day 2", focus: "25 min continuous", workoutKey: "tempo_run" as const, estimatedDuration: 35 },
        { dayNumber: 5, name: "Day 3", focus: "25 min continuous", workoutKey: "tempo_run" as const, estimatedDuration: 35 },
      ]},
      { weekNumber: 8, name: "Week 8", focus: "28 minute runs", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "28 min continuous", workoutKey: "tempo_run" as const, estimatedDuration: 38 },
        { dayNumber: 3, name: "Day 2", focus: "28 min continuous", workoutKey: "tempo_run" as const, estimatedDuration: 38 },
        { dayNumber: 5, name: "Day 3", focus: "28 min continuous", workoutKey: "tempo_run" as const, estimatedDuration: 38 },
      ]},
      { weekNumber: 9, name: "Week 9 - Race Week!", focus: "30 min / 5K", workouts: [
        { dayNumber: 1, name: "Day 1", focus: "30 min or 5K", workoutKey: "tempo_run" as const, estimatedDuration: 40, notes: "You can do this!" },
        { dayNumber: 3, name: "Day 2", focus: "30 min or 5K", workoutKey: "tempo_run" as const, estimatedDuration: 40 },
        { dayNumber: 5, name: "Race Day!", focus: "Run your 5K!", workoutKey: "tempo_run" as const, estimatedDuration: 40, notes: "Congratulations!" },
      ]},
    ],
  },
  
  // 9. Deadlift Specialization
  {
    name: "Deadlift Specialization",
    description: "A 6-week program focused on building your deadlift. Includes technique work, volume blocks, and heavy singles to push your max.",
    category: "powerlifting",
    difficulty: "advanced",
    durationWeeks: 6,
    daysPerWeek: 4,
    avgWorkoutDuration: 60,
    primaryGoal: "Maximize deadlift",
    targetMuscles: ["back", "legs", "grip"],
    equipmentRequired: ["barbell", "squat rack"],
    weeks: Array.from({ length: 6 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i < 2 ? "Volume phase" : i < 4 ? "Intensity phase" : "Peaking",
      workouts: [
        { dayNumber: 1, name: "Heavy Deadlift", focus: "Competition deadlift", workoutKey: "deadlift_special" as const, estimatedDuration: 75 },
        { dayNumber: 2, name: "Back Accessory", focus: "Pull-ups, rows, shrugs", workoutKey: "back_builder" as const, estimatedDuration: 60 },
        { dayNumber: 4, name: "Squat Day", focus: "Maintain squat strength", workoutKey: "531_squat" as const, estimatedDuration: 60 },
        { dayNumber: 5, name: "Deadlift Variations", focus: "Deficit, pause, Romanian", workoutKey: "deadlift_special" as const, estimatedDuration: 60 },
      ],
    })),
  },
  
  // 10. Cardio Conditioning
  {
    name: "Cardio Conditioning",
    description: "A varied cardio program mixing running, rowing, and cycling. Build aerobic capacity and improve conditioning with different modalities.",
    category: "cardio",
    difficulty: "intermediate",
    durationWeeks: 8,
    daysPerWeek: 4,
    avgWorkoutDuration: 40,
    primaryGoal: "Improve cardiovascular fitness",
    targetMuscles: ["cardiovascular", "legs"],
    equipmentRequired: ["treadmill", "rower", "assault bike"],
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: i % 2 === 0 ? "Endurance" : "Intervals",
      workouts: [
        { dayNumber: 1, name: "Run Day", focus: "Tempo or intervals", workoutKey: (i % 2 === 0 ? "tempo_run" : "sprint_intervals") as const, estimatedDuration: 35 },
        { dayNumber: 2, name: "Row Day", focus: "Rowing workout", workoutKey: (i % 2 === 0 ? "rowing_intervals" : "row_ladder") as const, estimatedDuration: 30 },
        { dayNumber: 4, name: "Bike Day", focus: "Cycling workout", workoutKey: (i % 2 === 0 ? "bike_pyramid" : "assault_bike") as const, estimatedDuration: 35 },
        { dayNumber: 6, name: "Mixed Conditioning", focus: "Various modalities", workoutKey: "jump_rope" as const, estimatedDuration: 30 },
      ],
    })),
  },
  
  // 11. Full Body Strength (3 days)
  {
    name: "Full Body Strength",
    description: "A beginner-friendly 3-day program hitting the whole body each session. Perfect for those with limited gym time who want full-body development.",
    category: "strength",
    difficulty: "beginner",
    durationWeeks: 8,
    daysPerWeek: 3,
    avgWorkoutDuration: 50,
    primaryGoal: "Build overall strength",
    targetMuscles: ["full body"],
    equipmentRequired: ["barbell", "dumbbells", "squat rack"],
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "Full body development",
      workouts: [
        { dayNumber: 1, name: "Full Body A", focus: "Squat emphasis", workoutKey: "full_body_pump" as const, estimatedDuration: 50 },
        { dayNumber: 3, name: "Full Body B", focus: "Deadlift emphasis", workoutKey: "full_body_pump" as const, estimatedDuration: 50 },
        { dayNumber: 5, name: "Full Body C", focus: "Bench emphasis", workoutKey: "full_body_pump" as const, estimatedDuration: 50 },
      ],
    })),
  },
  
  // 12. Arm Specialization
  {
    name: "Arm Specialization",
    description: "A 4-week arm-focused program for those wanting bigger biceps and triceps. High frequency arm training while maintaining other muscle groups.",
    category: "hypertrophy",
    difficulty: "intermediate",
    durationWeeks: 4,
    daysPerWeek: 5,
    avgWorkoutDuration: 50,
    primaryGoal: "Build arm size",
    targetMuscles: ["biceps", "triceps", "forearms"],
    equipmentRequired: ["dumbbells", "cable machine", "barbell"],
    weeks: Array.from({ length: 4 }, (_, i) => ({
      weekNumber: i + 1,
      name: `Week ${i + 1}`,
      focus: "Arm hypertrophy",
      workouts: [
        { dayNumber: 1, name: "Arms A", focus: "Heavy compounds", workoutKey: "arm_blaster" as const, estimatedDuration: 45 },
        { dayNumber: 2, name: "Chest & Triceps", focus: "Push day", workoutKey: "push" as const, estimatedDuration: 60 },
        { dayNumber: 3, name: "Back & Biceps", focus: "Pull day", workoutKey: "pull" as const, estimatedDuration: 60 },
        { dayNumber: 4, name: "Arms B", focus: "Isolation focus", workoutKey: "arm_blaster" as const, estimatedDuration: 45 },
        { dayNumber: 6, name: "Legs & Arms", focus: "Legs + arm finisher", workoutKey: "legs_ppl" as const, estimatedDuration: 60 },
      ],
    })),
  },
];

async function seedPrograms() {
  console.log("Starting program seeding...\n");

  // Get or create the system circle
  let systemCircle = await db.query.circles.findFirst({
    where: (c, { eq }) => eq(c.name, "System"),
  });

  if (!systemCircle) {
    console.log("Creating system circle...");
    const [newCircle] = await db.insert(circles).values({
      name: "System",
      description: "System-generated content",
      visibility: "private",
    }).returning();
    systemCircle = newCircle;
  }

  const circleId = systemCircle.id;
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const programDef of PROGRAMS) {
    try {
      console.log(`Creating program: ${programDef.name}`);

      // Check if program already exists
      const existing = await db.query.communityPrograms.findFirst({
        where: eq(communityPrograms.name, programDef.name),
      });

      if (existing) {
        console.log(`  ○ Program "${programDef.name}" already exists, skipping...\n`);
        skipCount++;
        continue;
      }

      // Create program
      const [program] = await db
        .insert(communityPrograms)
        .values({
          name: programDef.name,
          description: programDef.description,
          category: programDef.category,
          difficulty: programDef.difficulty,
          durationWeeks: programDef.durationWeeks,
          daysPerWeek: programDef.daysPerWeek,
          avgWorkoutDuration: programDef.avgWorkoutDuration,
          primaryGoal: programDef.primaryGoal,
          targetMuscles: programDef.targetMuscles,
          equipmentRequired: programDef.equipmentRequired,
          isOfficial: true,
          isFeatured: true,
          visibility: "public",
          enrollmentCount: Math.floor(Math.random() * 1000) + 100,
          completionCount: Math.floor(Math.random() * 200) + 20,
          avgRating: 4 + Math.random() * 1, // 4.0 - 5.0
        })
        .returning();

      console.log(`  ✓ Created program: ${program.id}`);

      // Create weeks and workouts
      for (const weekDef of programDef.weeks) {
        // Create week
        const [week] = await db
          .insert(programWeeks)
          .values({
            programId: program.id,
            weekNumber: weekDef.weekNumber,
            name: weekDef.name,
            focus: weekDef.focus,
            notes: weekDef.notes,
          })
          .returning();

        console.log(`    Week ${weekDef.weekNumber}: ${weekDef.focus}`);

        // Create workouts for this week
        for (const workoutDef of weekDef.workouts) {
          // Get workout plan ID if workoutKey is provided
          let workoutPlanId: string | null = null;
          if (workoutDef.workoutKey) {
            const workoutName = WORKOUT_NAMES[workoutDef.workoutKey];
            if (workoutName) {
              workoutPlanId = await getWorkoutPlanId(workoutName, circleId);
              if (!workoutPlanId) {
                console.warn(`      Warning: Workout "${workoutName}" not found`);
              }
            }
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
            notes: workoutDef.notes,
          });
        }
      }

      console.log(`  ✓ Created ${programDef.weeks.length} weeks with workouts\n`);
      successCount++;
    } catch (error) {
      console.error(`  ✗ Error creating program "${programDef.name}":`, error);
      errorCount++;
    }
  }

  console.log("\nProgram seeding complete!");
  console.log(`  ✓ Inserted: ${successCount}`);
  console.log(`  ○ Skipped (existing): ${skipCount}`);
  console.log(`  ✗ Errors: ${errorCount}`);
  console.log(`  Total: ${PROGRAMS.length}`);
}

// Run the seed
seedPrograms()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
