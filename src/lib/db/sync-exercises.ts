// Sync exercises from Free Exercise DB and add custom exercises
// Free Exercise DB: https://github.com/yuhonas/free-exercise-db

import { allCustomExercises, type CustomExercise } from "./custom-exercises";

const FREE_EXERCISE_DB_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGE_BASE_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

interface FreeExerciseDBEntry {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

export interface ExerciseToInsert {
  name: string;
  description: string;
  instructions: string;
  category: string;
  muscleGroups: string[];
  secondaryMuscles: string[];
  equipment: string[];
  difficulty: string;
  force: string | null;
  mechanic: string | null;
  benefits: string[];
  progressions: string[];
  imageUrl: string | null;
}

function mapCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    strength: "strength",
    stretching: "flexibility",
    plyometrics: "plyometric",
    strongman: "strength",
    powerlifting: "strength",
    cardio: "cardio",
    "olympic weightlifting": "strength",
  };
  return categoryMap[category.toLowerCase()] || "strength";
}

function mapDifficulty(level: string): string {
  const levelMap: Record<string, string> = {
    beginner: "beginner",
    intermediate: "intermediate",
    expert: "advanced",
  };
  return levelMap[level.toLowerCase()] || "intermediate";
}

// Infer benefits based on exercise properties
function inferBenefits(ex: FreeExerciseDBEntry): string[] {
  const benefits: string[] = [];

  // Based on category
  if (ex.category === "strength" || ex.category === "powerlifting") {
    benefits.push("strength");
  }
  if (ex.category === "cardio") {
    benefits.push("endurance", "cardiovascular health");
  }
  if (ex.category === "stretching") {
    benefits.push("flexibility", "mobility");
  }
  if (ex.category === "plyometrics") {
    benefits.push("power", "explosiveness");
  }

  // Based on mechanic
  if (ex.mechanic === "compound") {
    benefits.push("functional strength");
  }

  // Based on muscles
  if (ex.primaryMuscles.includes("abdominals") || ex.primaryMuscles.includes("lower back")) {
    benefits.push("core stability");
  }

  return [...new Set(benefits)];
}

// Infer progressions based on exercise
function inferProgressions(ex: FreeExerciseDBEntry): string[] {
  const progressions: string[] = [];
  const name = ex.name.toLowerCase();

  // Pull exercises
  if (name.includes("pull") || name.includes("row") || name.includes("lat")) {
    progressions.push("pull-up strength", "back development");
    if (name.includes("pull-up") || name.includes("pullup")) {
      progressions.push("muscle-up preparation", "weighted pull-ups");
    }
  }

  // Push exercises
  if (name.includes("push") || name.includes("press") || name.includes("bench")) {
    progressions.push("pressing strength");
    if (name.includes("push-up") || name.includes("pushup")) {
      progressions.push("one-arm push-up", "handstand push-up preparation");
    }
  }

  // Squat variations
  if (name.includes("squat") || name.includes("leg press")) {
    progressions.push("leg strength", "squat numbers");
  }

  // Deadlift
  if (name.includes("deadlift")) {
    progressions.push("posterior chain strength", "deadlift numbers");
  }

  return progressions;
}

export async function fetchExercisesFromFreeDB(): Promise<ExerciseToInsert[]> {
  const response = await fetch(FREE_EXERCISE_DB_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch exercises: ${response.statusText}`);
  }

  const exercises: FreeExerciseDBEntry[] = await response.json();

  return exercises.map((ex) => ({
    name: ex.name,
    description: `${ex.force ? `${ex.force.charAt(0).toUpperCase() + ex.force.slice(1)} movement. ` : ""}${
      ex.mechanic ? `${ex.mechanic.charAt(0).toUpperCase() + ex.mechanic.slice(1)} exercise. ` : ""
    }Targets ${ex.primaryMuscles.join(", ")}${ex.secondaryMuscles.length > 0 ? ` with secondary activation of ${ex.secondaryMuscles.join(", ")}` : ""}.`,
    instructions: ex.instructions.join("\n"),
    category: mapCategory(ex.category),
    muscleGroups: ex.primaryMuscles,
    secondaryMuscles: ex.secondaryMuscles,
    equipment: ex.equipment ? [ex.equipment] : ["bodyweight"],
    difficulty: mapDifficulty(ex.level),
    force: ex.force,
    mechanic: ex.mechanic,
    benefits: inferBenefits(ex),
    progressions: inferProgressions(ex),
    imageUrl: ex.images.length > 0 ? `${IMAGE_BASE_URL}/${ex.images[0]}` : null,
  }));
}

export function getCustomExercises(): ExerciseToInsert[] {
  return allCustomExercises.map((ex: CustomExercise) => ({
    name: ex.name,
    description: ex.description,
    instructions: ex.instructions,
    category: ex.category,
    muscleGroups: ex.muscleGroups,
    secondaryMuscles: ex.secondaryMuscles,
    equipment: ex.equipment,
    difficulty: ex.difficulty,
    force: ex.force,
    mechanic: ex.mechanic,
    benefits: ex.benefits,
    progressions: ex.progressions,
    imageUrl: null, // Custom exercises don't have images yet
  }));
}

export async function getAllExercises(): Promise<ExerciseToInsert[]> {
  // Fetch from Free Exercise DB
  const freeDBExercises = await fetchExercisesFromFreeDB();

  // Get custom exercises
  const customExercises = getCustomExercises();

  // Combine, with custom exercises taking precedence for duplicates
  const exerciseMap = new Map<string, ExerciseToInsert>();

  // Add free DB exercises first
  for (const ex of freeDBExercises) {
    exerciseMap.set(ex.name.toLowerCase(), ex);
  }

  // Add/override with custom exercises
  for (const ex of customExercises) {
    exerciseMap.set(ex.name.toLowerCase(), ex);
  }

  return Array.from(exerciseMap.values());
}

export { FREE_EXERCISE_DB_URL, IMAGE_BASE_URL };
