#!/usr/bin/env npx tsx
/**
 * Generate Exercise Embeddings Script
 *
 * Generates OpenAI embeddings for all exercises in the database
 * to enable AI similarity search and smart exercise recommendations.
 *
 * Usage:
 *   npx tsx scripts/generate-exercise-embeddings.ts
 *   npx tsx scripts/generate-exercise-embeddings.ts --dry-run
 *   npx tsx scripts/generate-exercise-embeddings.ts --batch-size=50
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exercises } from "../src/lib/db/schema";
import { eq, isNull, sql } from "drizzle-orm";
import OpenAI from "openai";

// Configuration
const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions, cost-effective
const DEFAULT_BATCH_SIZE = 100;

// Parse args
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const batchSizeArg = args.find(a => a.startsWith("--batch-size="));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split("=")[1]) : DEFAULT_BATCH_SIZE;

// Initialize clients
const sqlClient = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlClient);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Create embedding text from exercise data
 * Combines relevant fields into a searchable text blob
 */
function createEmbeddingText(exercise: {
  name: string;
  description: string | null;
  instructions: string | null;
  category: string;
  muscleGroups: string[] | null;
  secondaryMuscles: string[] | null;
  equipment: string[] | null;
  difficulty: string | null;
  benefits: string[] | null;
  tags: string[] | null;
}): string {
  const parts: string[] = [
    `Exercise: ${exercise.name}`,
    exercise.category ? `Category: ${exercise.category}` : "",
    exercise.difficulty ? `Difficulty: ${exercise.difficulty}` : "",
    exercise.muscleGroups?.length ? `Primary muscles: ${exercise.muscleGroups.join(", ")}` : "",
    exercise.secondaryMuscles?.length ? `Secondary muscles: ${exercise.secondaryMuscles.join(", ")}` : "",
    exercise.equipment?.length ? `Equipment: ${exercise.equipment.join(", ")}` : "",
    exercise.benefits?.length ? `Benefits: ${exercise.benefits.join(", ")}` : "",
    exercise.tags?.length ? `Tags: ${exercise.tags.join(", ")}` : "",
    exercise.description ? `Description: ${exercise.description}` : "",
    exercise.instructions ? `Instructions: ${exercise.instructions.substring(0, 500)}` : "",
  ];

  return parts.filter(Boolean).join(". ");
}

/**
 * Generate embeddings for a batch of texts
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  return response.data.map(d => d.embedding);
}

/**
 * Main function
 */
async function main() {
  console.log("🧠 Exercise Embeddings Generator");
  console.log("=================================");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Model: ${EMBEDDING_MODEL}`);
  console.log("");

  // Fetch exercises without embeddings
  console.log("📥 Fetching exercises without embeddings...");

  const exercisesWithoutEmbeddings = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      description: exercises.description,
      instructions: exercises.instructions,
      category: exercises.category,
      muscleGroups: exercises.muscleGroups,
      secondaryMuscles: exercises.secondaryMuscles,
      equipment: exercises.equipment,
      difficulty: exercises.difficulty,
      benefits: exercises.benefits,
      tags: exercises.tags,
    })
    .from(exercises)
    .where(isNull(exercises.embedding));

  console.log(`   Found ${exercisesWithoutEmbeddings.length} exercises without embeddings`);

  if (exercisesWithoutEmbeddings.length === 0) {
    console.log("\n✅ All exercises already have embeddings!");
    return;
  }

  if (dryRun) {
    console.log("\n📊 Dry run - sample embedding texts:");
    for (const ex of exercisesWithoutEmbeddings.slice(0, 3)) {
      const text = createEmbeddingText(ex);
      console.log(`\n--- ${ex.name} ---`);
      console.log(text.substring(0, 200) + "...");
    }
    console.log("\n✅ Dry run complete. No embeddings generated.");
    return;
  }

  // Process in batches
  console.log(`\n🔄 Generating embeddings in batches of ${batchSize}...`);

  let processed = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < exercisesWithoutEmbeddings.length; i += batchSize) {
    const batch = exercisesWithoutEmbeddings.slice(i, i + batchSize);

    try {
      // Create embedding texts
      const texts = batch.map(createEmbeddingText);

      // Generate embeddings via OpenAI
      const embeddings = await generateEmbeddings(texts);

      // Update database
      for (let j = 0; j < batch.length; j++) {
        const exercise = batch[j];
        const embedding = embeddings[j];

        // Convert embedding array to PostgreSQL vector format
        const vectorStr = `[${embedding.join(",")}]`;

        await db
          .update(exercises)
          .set({
            embedding: sql`${vectorStr}::vector`,
          })
          .where(eq(exercises.id, exercise.id));

        processed++;
      }

      const progress = Math.round((i + batch.length) / exercisesWithoutEmbeddings.length * 100);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\r   Progress: ${progress}% (${processed} processed, ${errors} errors) - ${elapsed}s elapsed`);

      // Small delay to respect rate limits
      if (i + batchSize < exercisesWithoutEmbeddings.length) {
        await new Promise(r => setTimeout(r, 100));
      }

    } catch (error) {
      console.error(`\n   Error processing batch at index ${i}:`, error);
      errors += batch.length;
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n\n✅ Embedding generation complete!");
  console.log(`   Processed: ${processed}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total time: ${totalTime}s`);
  console.log(`   Avg time per exercise: ${(parseFloat(totalTime) / processed * 1000).toFixed(0)}ms`);
}

main().catch((error) => {
  console.error("\n❌ Script failed:", error);
  process.exit(1);
});
