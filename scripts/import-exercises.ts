#!/usr/bin/env npx tsx
/**
 * Exercise Import Script - January 2026
 *
 * Imports 800+ exercises from Free Exercise DB into dim_exercises table
 * Optionally uploads images to Vercel Blob for faster delivery
 *
 * Usage:
 *   npx tsx scripts/import-exercises.ts
 *   npx tsx scripts/import-exercises.ts --with-images
 *   npx tsx scripts/import-exercises.ts --dry-run
 */

import { put } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exercises as exercisesTable } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Configuration
const FREE_EXERCISE_DB_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGE_BASE_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

// Parse command line args
const args = process.argv.slice(2);
const withImages = args.includes("--with-images");
const dryRun = args.includes("--dry-run");
const batchSize = 50;

// Database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// =============================================================================
// TYPES
// =============================================================================

interface FreeExerciseDbEntry {
  id: string;
  name: string;
  force?: string;
  level?: string;
  mechanic?: string;
  equipment?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  category?: string;
  images?: string[];
}

// =============================================================================
// HELPERS
// =============================================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mapCategory(category?: string): string {
  const categoryMap: Record<string, string> = {
    strength: "strength",
    stretching: "flexibility",
    plyometrics: "plyometric",
    strongman: "strength",
    powerlifting: "strength",
    "olympic weightlifting": "strength",
    cardio: "cardio",
  };

  return categoryMap[category?.toLowerCase() || ""] || "strength";
}

function mapDifficulty(level?: string): string {
  const difficultyMap: Record<string, string> = {
    beginner: "beginner",
    intermediate: "intermediate",
    expert: "advanced",
  };

  return difficultyMap[level?.toLowerCase() || ""] || "intermediate";
}

async function uploadImageToBlob(
  imageUrl: string,
  exerciseSlug: string
): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn("BLOB_READ_WRITE_TOKEN not set, skipping image upload");
    return null;
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch image: ${imageUrl}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const extension = imageUrl.split(".").pop() || "jpg";
    const filename = `exercises/${exerciseSlug}.${extension}`;

    const blob = await put(filename, Buffer.from(buffer), {
      access: "public",
      contentType: `image/${extension === "jpg" ? "jpeg" : extension}`,
    });

    return blob.url;
  } catch (error) {
    console.error(`Error uploading image for ${exerciseSlug}:`, error);
    return null;
  }
}

// =============================================================================
// MAIN IMPORT FUNCTION
// =============================================================================

async function importExercises() {
  console.log("🏋️ Exercise Import Script - January 2026");
  console.log("=========================================");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Images: ${withImages ? "Upload to Vercel Blob" : "Use CDN URLs"}`);
  console.log("");

  // Fetch exercises from Free Exercise DB
  console.log("📥 Fetching exercises from Free Exercise DB...");
  const response = await fetch(FREE_EXERCISE_DB_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch exercises: ${response.status}`);
  }

  const exercises: FreeExerciseDbEntry[] = await response.json();
  console.log(`   Found ${exercises.length} exercises`);

  // Transform and prepare for insert
  console.log("\n🔄 Transforming exercises...");
  const transformed = exercises.map((ex) => {
    const firstImage = ex.images?.[0];
    const imageUrl = firstImage ? `${IMAGE_BASE_URL}/${ex.id}/${firstImage}` : null;

    return {
      name: ex.name,
      description: ex.instructions?.slice(0, 3).join(" ") || null,
      instructions: ex.instructions?.join("\n\n") || null,
      category: mapCategory(ex.category),
      force: ex.force || null,
      mechanic: ex.mechanic || null,
      muscleGroups: ex.primaryMuscles || [],
      secondaryMuscles: ex.secondaryMuscles || [],
      equipment: ex.equipment ? [ex.equipment] : [],
      difficulty: mapDifficulty(ex.level),
      imageUrl: imageUrl,
      source: "free_exercise_db",
      isActive: true,
      isCustom: false,
    };
  });

  if (dryRun) {
    console.log("\n📊 Dry run summary:");
    console.log(`   Total exercises: ${transformed.length}`);
    console.log(`   Categories: ${[...new Set(transformed.map((e) => e.category))].join(", ")}`);
    console.log(`   Sample:`, transformed.slice(0, 3).map((e) => e.name));
    console.log("\n✅ Dry run complete. No data was written.");
    return;
  }

  // Import in batches
  console.log(`\n📤 Importing ${transformed.length} exercises in batches of ${batchSize}...`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let imagesUploaded = 0;

  for (let i = 0; i < transformed.length; i += batchSize) {
    const batch = transformed.slice(i, i + batchSize);

    for (const exercise of batch) {
      try {
        // Check if already exists by name
        const existing = await db
          .select({ id: exercisesTable.id })
          .from(exercisesTable)
          .where(eq(exercisesTable.name, exercise.name))
          .limit(1);

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        // Upload image if requested
        let finalImageUrl = exercise.imageUrl;
        if (withImages && exercise.imageUrl) {
          const slugName = slugify(exercise.name);
          const blobUrl = await uploadImageToBlob(exercise.imageUrl, slugName);
          if (blobUrl) {
            finalImageUrl = blobUrl;
            imagesUploaded++;
          }
        }

        // Insert exercise
        await db.insert(exercisesTable).values({
          ...exercise,
          imageUrl: finalImageUrl,
        });

        imported++;
      } catch (error) {
        console.error(`Error importing ${exercise.name}:`, error);
        errors++;
      }
    }

    const progress = Math.round(((i + batch.length) / transformed.length) * 100);
    process.stdout.write(`\r   Progress: ${progress}% (${imported} imported, ${skipped} skipped, ${errors} errors)`);
  }

  console.log("\n\n✅ Import complete!");
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (already exist): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  if (withImages) {
    console.log(`   Images uploaded to Blob: ${imagesUploaded}`);
  }
}

// =============================================================================
// ADDITIONAL UTILITIES
// =============================================================================

async function generateEmbeddings() {
  console.log("\n🧠 Generating embeddings for exercises...");
  console.log("   (This requires OpenAI API key and may take a while)");

  // This would use OpenAI's embedding API to generate vectors
  // for similarity search. Implementation depends on your AI setup.
  console.log("   TODO: Implement embedding generation");
}

// Time dimension functionality removed - using materialized views with generate_series() instead

// =============================================================================
// RUN
// =============================================================================

async function main() {
  try {
    await importExercises();

    if (!dryRun && args.includes("--with-embeddings")) {
      await generateEmbeddings();
    }

    console.log("\n🎉 All done!");
  } catch (error) {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  }
}

main();
