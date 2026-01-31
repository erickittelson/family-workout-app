/**
 * Master Seed Orchestrator
 * 
 * Seeds all production data in the correct order:
 * 1. Exercises (200+) - foundation for workouts
 * 2. Workouts (50) - with exercise linking
 * 3. Programs (12) - with workout plan linking
 * 4. Challenges (10) - with milestones
 * 5. Badges - for achievements
 * 
 * Run with: npx tsx scripts/seed-all-production-data.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { execSync } from "child_process";
import * as path from "path";

interface SeedStep {
  name: string;
  script: string;
  description: string;
}

const SEED_STEPS: SeedStep[] = [
  {
    name: "Exercises",
    script: "seed-exercises.ts",
    description: "Seed 200+ exercises with complete metadata",
  },
  {
    name: "Workouts",
    script: "seed-workouts-programs-challenges.ts",
    description: "Seed 50 workouts with exercise linking",
  },
  {
    name: "Programs",
    script: "seed-programs.ts",
    description: "Seed 12 programs with workout plan linking",
  },
  {
    name: "Challenges",
    script: "seed-challenge-milestones.ts",
    description: "Seed 10 challenges with milestones",
  },
  {
    name: "Badges",
    script: "seed-badges.ts",
    description: "Seed badge definitions for achievements",
  },
];

async function runSeedScript(step: SeedStep): Promise<boolean> {
  const scriptPath = path.join(__dirname, step.script);
  
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📦 ${step.name}`);
  console.log(`   ${step.description}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    execSync(`npx tsx ${scriptPath}`, {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    console.log(`\n✓ ${step.name} completed successfully`);
    return true;
  } catch (error) {
    console.error(`\n✗ ${step.name} failed:`, error);
    return false;
  }
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║            PRODUCTION DATA SEEDING ORCHESTRATOR               ║
║                                                               ║
║   This script seeds all production data in the correct order  ║
║   to ensure referential integrity.                            ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const startTime = Date.now();
  const results: { step: string; success: boolean }[] = [];

  for (const step of SEED_STEPS) {
    const success = await runSeedScript(step);
    results.push({ step: step.name, success });

    if (!success) {
      console.error(`\n⚠️  Stopping due to failure in ${step.name}`);
      console.log("   Fix the issue and run this script again.");
      console.log("   Already-seeded data will be skipped (idempotent).\n");
      break;
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                        SUMMARY                                ║
╚═══════════════════════════════════════════════════════════════╝
`);

  results.forEach(({ step, success }) => {
    const status = success ? "✓" : "✗";
    const color = success ? "" : "";
    console.log(`  ${status} ${step}`);
  });

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log(`
  Total: ${results.length} steps
  Success: ${successCount}
  Failed: ${failCount}
  Duration: ${duration}s
`);

  if (failCount === 0 && results.length === SEED_STEPS.length) {
    console.log(`
🎉 All production data seeded successfully!

Your database now contains:
  • 200+ exercises with complete metadata
  • 50 workouts (CrossFit, Bodybuilding, Strength, Cardio)
  • 12 multi-week training programs
  • 10 challenges with milestones
  • Badge definitions for achievements

Next steps:
  1. Test the app to ensure data is displaying correctly
  2. Run any necessary migrations
  3. Deploy to production
`);
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Master seed failed:", error);
  process.exit(1);
});
