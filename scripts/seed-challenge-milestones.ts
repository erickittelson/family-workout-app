/**
 * Seed Challenges and Milestones
 * 
 * Creates challenges with:
 * - Complete metadata and rules
 * - Structured milestones for progression
 * - Fun difficulty labels and branding
 * 
 * Run with: npx tsx scripts/seed-challenge-milestones.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { challenges, challengeMilestones } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

// Challenge definition
interface ChallengeDefinition {
  name: string;
  description: string;
  shortDescription: string;
  category: "strength" | "cardio" | "wellness" | "hybrid" | "transformation";
  difficulty: "beginner" | "intermediate" | "advanced" | "extreme";
  durationDays: number;
  rules: string[];
  dailyTasks: {
    name: string;
    description?: string;
    type: "workout" | "nutrition" | "mindset" | "recovery" | "custom";
    isRequired: boolean;
  }[];
  progressionType: "linear" | "pyramid" | "random" | "custom";
  restartOnFail: boolean;
  unlockMessage: string;
  milestones: MilestoneDefinition[];
}

interface MilestoneDefinition {
  order: number;
  name: string;
  description: string;
  durationDays?: number;
  completionType: "workout" | "days" | "goal" | "manual";
  requiredCompletions: number;
  goalTargetValue?: number;
  goalTargetUnit?: string;
  unlockMessage: string;
}

const CHALLENGES: ChallengeDefinition[] = [
  // 1. Couch to 5K
  {
    name: "Couch to 5K",
    description: "The proven 9-week program that takes complete beginners from zero running to completing a 5K. Gradual progression ensures sustainable improvement and prevents injury.",
    shortDescription: "Go from zero to running 5K in 9 weeks",
    category: "cardio",
    difficulty: "beginner",
    durationDays: 63,
    rules: [
      "Complete 3 running sessions per week",
      "Rest at least one day between runs",
      "Run at conversational pace",
      "Walk breaks are allowed and encouraged",
    ],
    dailyTasks: [
      { name: "Running Session", type: "workout", isRequired: true },
      { name: "Stretching", type: "recovery", isRequired: false, description: "5-10 min post-run stretch" },
    ],
    progressionType: "linear",
    restartOnFail: false,
    unlockMessage: "🎉 YOU'RE A 5K RUNNER! You've proven that consistency beats talent!",
    milestones: [
      {
        order: 1,
        name: "Baby Steps",
        description: "Week 1-2: Walk/run intervals - 60 seconds running, 90 seconds walking",
        durationDays: 14,
        completionType: "days",
        requiredCompletions: 6,
        unlockMessage: "You're off the couch! 🛋️➡️🏃 Keep going!",
      },
      {
        order: 2,
        name: "Finding Your Rhythm",
        description: "Week 3-4: Increase run intervals to 90 seconds",
        durationDays: 14,
        completionType: "days",
        requiredCompletions: 6,
        unlockMessage: "You're building momentum! Your body is adapting 💪",
      },
      {
        order: 3,
        name: "Building Endurance",
        description: "Week 5-6: 5-minute continuous runs",
        durationDays: 14,
        completionType: "days",
        requiredCompletions: 6,
        unlockMessage: "5 minutes non-stop! You're becoming a runner! 🏃‍♂️",
      },
      {
        order: 4,
        name: "The Final Push",
        description: "Week 7-8: 20-25 minute continuous runs",
        durationDays: 14,
        completionType: "days",
        requiredCompletions: 6,
        unlockMessage: "Almost there! One more phase to glory! 🌟",
      },
      {
        order: 5,
        name: "5K Victory!",
        description: "Run your first 5K without stopping",
        durationDays: 7,
        completionType: "manual",
        requiredCompletions: 1,
        goalTargetValue: 5,
        goalTargetUnit: "km",
        unlockMessage: "🏅 YOU DID IT! You're officially a 5K runner!",
      },
    ],
  },

  // 2. 30-Day Push-Up Challenge
  {
    name: "30-Day Push-Up Challenge",
    description: "Transform your upper body strength in 30 days. Start wherever you are and build up to 100 push-ups through progressive daily practice.",
    shortDescription: "Build to 100 push-ups in 30 days",
    category: "strength",
    difficulty: "beginner",
    durationDays: 30,
    rules: [
      "Complete daily push-up quota",
      "Focus on form over speed",
      "Can break into sets throughout the day",
      "Modification allowed (knee push-ups to start)",
    ],
    dailyTasks: [
      { name: "Daily Push-ups", type: "workout", isRequired: true },
    ],
    progressionType: "linear",
    restartOnFail: false,
    unlockMessage: "💪 CENTURY CLUB! You can do 100 push-ups! That's incredible!",
    milestones: [
      {
        order: 1,
        name: "Foundation Week",
        description: "Days 1-7: Start with 10-20 push-ups daily, focus on form",
        durationDays: 7,
        completionType: "days",
        requiredCompletions: 7,
        unlockMessage: "Week 1 complete! Your form is solid 💪",
      },
      {
        order: 2,
        name: "Building Volume",
        description: "Days 8-15: Increase to 30-50 push-ups daily",
        durationDays: 8,
        completionType: "days",
        requiredCompletions: 8,
        unlockMessage: "Volume is building! You're getting stronger! 🔥",
      },
      {
        order: 3,
        name: "Push Your Limits",
        description: "Days 16-23: Hit 60-80 push-ups daily",
        durationDays: 8,
        completionType: "days",
        requiredCompletions: 8,
        unlockMessage: "Over 60 push-ups daily! You're a machine! 🤖",
      },
      {
        order: 4,
        name: "The Century Club",
        description: "Days 24-30: Achieve 100 push-ups in a day",
        durationDays: 7,
        completionType: "goal",
        requiredCompletions: 1,
        goalTargetValue: 100,
        goalTargetUnit: "push-ups",
        unlockMessage: "🎯 100 PUSH-UPS! Welcome to the Century Club! 🏆",
      },
    ],
  },

  // 3. Pull-Up Progress
  {
    name: "Pull-Up Progress",
    description: "Master the pull-up in 10 weeks. Whether you can't do one yet or want to hit double digits, this program will get you there.",
    shortDescription: "From zero to 10 pull-ups",
    category: "strength",
    difficulty: "intermediate",
    durationDays: 70,
    rules: [
      "Train pull-ups 3-4 times per week",
      "Rest at least one day between sessions",
      "Use assisted variations if needed",
      "Focus on full range of motion",
    ],
    dailyTasks: [
      { name: "Pull-up Training", type: "workout", isRequired: true },
      { name: "Grip Work", type: "workout", isRequired: false, description: "Dead hangs or farmer carries" },
    ],
    progressionType: "linear",
    restartOnFail: false,
    unlockMessage: "🦍 10 PULL-UPS! You've developed serious pulling power!",
    milestones: [
      {
        order: 1,
        name: "Hang Time",
        description: "Week 1-2: Dead hangs and negative pull-ups",
        durationDays: 14,
        completionType: "days",
        requiredCompletions: 10,
        unlockMessage: "Grip strength activated! You're building the foundation 🧱",
      },
      {
        order: 2,
        name: "First Rep",
        description: "Week 3-4: Achieve your first full pull-up",
        durationDays: 14,
        completionType: "manual",
        requiredCompletions: 1,
        goalTargetValue: 1,
        goalTargetUnit: "pull-up",
        unlockMessage: "YOUR FIRST PULL-UP! This is a huge milestone! 🎉",
      },
      {
        order: 3,
        name: "Triple Threat",
        description: "Week 5-6: Hit 3 consecutive pull-ups",
        durationDays: 14,
        completionType: "manual",
        requiredCompletions: 1,
        goalTargetValue: 3,
        goalTargetUnit: "pull-ups",
        unlockMessage: "3 in a row! You're officially doing pull-ups! 💪",
      },
      {
        order: 4,
        name: "Building Sets",
        description: "Week 7-8: Complete 3 sets of 3+ pull-ups",
        durationDays: 14,
        completionType: "days",
        requiredCompletions: 10,
        unlockMessage: "Multiple sets! Your back is getting strong 🦍",
      },
      {
        order: 5,
        name: "The Double Digits",
        description: "Week 9+: Achieve 10 pull-ups in a single set",
        durationDays: 14,
        completionType: "manual",
        requiredCompletions: 1,
        goalTargetValue: 10,
        goalTargetUnit: "pull-ups",
        unlockMessage: "🔟 TEN PULL-UPS! You've mastered the pull-up! 🏆",
      },
    ],
  },

  // 4. Muscle Up Mission
  {
    name: "Muscle Up Mission",
    description: "The ultimate calisthenics achievement. This 12-week program takes you from strong pull-ups to your first muscle-up.",
    shortDescription: "Achieve your first muscle-up",
    category: "strength",
    difficulty: "advanced",
    durationDays: 84,
    rules: [
      "Must have 10+ strict pull-ups before starting",
      "Train 4-5 times per week",
      "Include explosive pulling practice",
      "Prioritize technique over strength",
    ],
    dailyTasks: [
      { name: "Muscle-up Progressions", type: "workout", isRequired: true },
      { name: "Dip Training", type: "workout", isRequired: true },
    ],
    progressionType: "linear",
    restartOnFail: false,
    unlockMessage: "🦾 MUSCLE UP ACHIEVED! You've reached elite calisthenics status!",
    milestones: [
      {
        order: 1,
        name: "Pull-Up Mastery",
        description: "Week 1-3: Achieve 15+ strict pull-ups",
        durationDays: 21,
        completionType: "manual",
        requiredCompletions: 1,
        goalTargetValue: 15,
        goalTargetUnit: "pull-ups",
        unlockMessage: "15 pull-ups! You've got the pulling power 💪",
      },
      {
        order: 2,
        name: "Dip Strength",
        description: "Week 4-6: 20+ strict dips with full ROM",
        durationDays: 21,
        completionType: "manual",
        requiredCompletions: 1,
        goalTargetValue: 20,
        goalTargetUnit: "dips",
        unlockMessage: "Dip game strong! The pressing power is there 🔥",
      },
      {
        order: 3,
        name: "Explosive Pull",
        description: "Week 7-9: High pull-ups (chest to bar)",
        durationDays: 21,
        completionType: "days",
        requiredCompletions: 15,
        unlockMessage: "Chest to bar! You're getting explosive! 💥",
      },
      {
        order: 4,
        name: "The Transition",
        description: "Week 10-12: Practice the transition with bands or negatives",
        durationDays: 21,
        completionType: "days",
        requiredCompletions: 15,
        unlockMessage: "The transition is clicking! Almost there! ⚡",
      },
      {
        order: 5,
        name: "MUSCLE UP!",
        description: "Achieve your first muscle up",
        durationDays: 7,
        completionType: "manual",
        requiredCompletions: 1,
        unlockMessage: "🎯 MUSCLE UP ACHIEVED! You're a certified beast! 🦾",
      },
    ],
  },

  // 5. 100 Burpees a Day
  {
    name: "100 Burpees a Day",
    description: "30 days of 100 daily burpees. This isn't just a fitness challenge - it's a test of mental fortitude.",
    shortDescription: "100 burpees every day for 30 days",
    category: "hybrid",
    difficulty: "extreme",
    durationDays: 30,
    rules: [
      "100 burpees every single day",
      "No rest days",
      "Can break into sets throughout the day",
      "Standard burpee with jump and chest to floor",
    ],
    dailyTasks: [
      { name: "100 Burpees", type: "workout", isRequired: true },
    ],
    progressionType: "linear",
    restartOnFail: true,
    unlockMessage: "👑 LEGEND STATUS! 3,000 burpees in 30 days. You're unbreakable!",
    milestones: [
      {
        order: 1,
        name: "Survive Day 1",
        description: "Just get through day 1 with 100 burpees",
        durationDays: 1,
        completionType: "days",
        requiredCompletions: 1,
        unlockMessage: "Day 1 DONE! You're tougher than you thought 💀",
      },
      {
        order: 2,
        name: "Week of Pain",
        description: "Days 2-7: Complete your first week",
        durationDays: 6,
        completionType: "days",
        requiredCompletions: 6,
        unlockMessage: "One week of 100 daily burpees! You're insane! 🔥",
      },
      {
        order: 3,
        name: "The Grind",
        description: "Days 8-15: Push through the middle",
        durationDays: 8,
        completionType: "days",
        requiredCompletions: 8,
        unlockMessage: "Halfway there! You're forged in fire now 🔥🔥",
      },
      {
        order: 4,
        name: "Final Push",
        description: "Days 16-30: Finish strong",
        durationDays: 15,
        completionType: "days",
        requiredCompletions: 15,
        unlockMessage: "3,000 BURPEES COMPLETED! You are a LEGEND! 👑",
      },
    ],
  },

  // 6. Squat Challenge
  {
    name: "30-Day Squat Challenge",
    description: "Build powerful legs and glutes with daily squats. Progress from 50 to 250 squats over 30 days.",
    shortDescription: "Work up to 250 squats per day",
    category: "strength",
    difficulty: "intermediate",
    durationDays: 30,
    rules: [
      "Complete daily squat target",
      "Full depth squats only",
      "Can break into sets",
      "Rest days built into progression",
    ],
    dailyTasks: [
      { name: "Daily Squats", type: "workout", isRequired: true },
    ],
    progressionType: "linear",
    restartOnFail: false,
    unlockMessage: "🦵 SQUAT MASTER! Your legs are legendary!",
    milestones: [
      {
        order: 1,
        name: "Foundation Phase",
        description: "Days 1-10: 50-100 daily squats, perfecting form",
        durationDays: 10,
        completionType: "days",
        requiredCompletions: 10,
        unlockMessage: "Form is dialed in! Your legs are waking up 🦵",
      },
      {
        order: 2,
        name: "Volume Building",
        description: "Days 11-20: 150-200 daily squats",
        durationDays: 10,
        completionType: "days",
        requiredCompletions: 10,
        unlockMessage: "200 squats a day! Your legs are on fire! 🔥",
      },
      {
        order: 3,
        name: "Peak Performance",
        description: "Days 21-30: Hit 250 squats in a single day",
        durationDays: 10,
        completionType: "goal",
        requiredCompletions: 1,
        goalTargetValue: 250,
        goalTargetUnit: "squats",
        unlockMessage: "250 SQUATS! Your legs are legendary now! 🦵👑",
      },
    ],
  },

  // 7. Plank Challenge
  {
    name: "30-Day Plank Challenge",
    description: "Build an iron core. Progress from 30-second holds to a 5-minute plank over 30 days.",
    shortDescription: "Build to a 5-minute plank",
    category: "strength",
    difficulty: "beginner",
    durationDays: 30,
    rules: [
      "One plank attempt per day",
      "Strict plank form - no sagging or piking",
      "Time your holds accurately",
      "Rest days included in progression",
    ],
    dailyTasks: [
      { name: "Plank Hold", type: "workout", isRequired: true },
    ],
    progressionType: "linear",
    restartOnFail: false,
    unlockMessage: "🔩 IRON CORE! A 5-minute plank is elite level!",
    milestones: [
      {
        order: 1,
        name: "The First Minute",
        description: "Days 1-10: Hold a plank for 60 seconds",
        durationDays: 10,
        completionType: "goal",
        requiredCompletions: 1,
        goalTargetValue: 60,
        goalTargetUnit: "seconds",
        unlockMessage: "1 minute plank! Your core is engaged 🧘",
      },
      {
        order: 2,
        name: "Two Minutes of Steel",
        description: "Days 11-20: Reach a 2-minute plank",
        durationDays: 10,
        completionType: "goal",
        requiredCompletions: 1,
        goalTargetValue: 120,
        goalTargetUnit: "seconds",
        unlockMessage: "2 minutes! Your core is solid steel! 🔩",
      },
      {
        order: 3,
        name: "The 5-Minute Club",
        description: "Days 21-30: Achieve a 5-minute plank",
        durationDays: 10,
        completionType: "goal",
        requiredCompletions: 1,
        goalTargetValue: 300,
        goalTargetUnit: "seconds",
        unlockMessage: "5 MINUTE PLANK! You have an unbreakable core! 💪",
      },
    ],
  },

  // 8. 14-Day HIIT Warrior
  {
    name: "14-Day HIIT Warrior",
    description: "Two weeks of intense HIIT training. Daily high-intensity workouts to boost metabolism and build conditioning.",
    shortDescription: "14 days of daily HIIT",
    category: "cardio",
    difficulty: "advanced",
    durationDays: 14,
    rules: [
      "Complete a HIIT workout every day",
      "Each session 20-30 minutes",
      "Give maximum effort on work intervals",
      "Stay hydrated and fuel properly",
    ],
    dailyTasks: [
      { name: "HIIT Workout", type: "workout", isRequired: true },
      { name: "Hydration", type: "recovery", isRequired: false, description: "Drink 3+ liters of water" },
    ],
    progressionType: "linear",
    restartOnFail: false,
    unlockMessage: "⚔️ HIIT WARRIOR! You thrive in the fire!",
    milestones: [
      {
        order: 1,
        name: "Initiation",
        description: "Days 1-4: Complete 4 consecutive HIIT sessions",
        durationDays: 4,
        completionType: "days",
        requiredCompletions: 4,
        unlockMessage: "Initiation complete! You're a warrior now ⚔️",
      },
      {
        order: 2,
        name: "Battle Tested",
        description: "Days 5-10: Push through the fire",
        durationDays: 6,
        completionType: "days",
        requiredCompletions: 6,
        unlockMessage: "Battle tested! You thrive in the intensity 🔥",
      },
      {
        order: 3,
        name: "HIIT Legend",
        description: "Days 11-14: Complete the warrior gauntlet",
        durationDays: 4,
        completionType: "days",
        requiredCompletions: 4,
        unlockMessage: "14 days of HIIT! You are a true WARRIOR! ⚔️👑",
      },
    ],
  },

  // 9. 10K Steps Daily
  {
    name: "30-Day 10K Steps",
    description: "Walk 10,000 steps every day for 30 days. Simple but transformative for health and energy.",
    shortDescription: "10,000 steps daily for a month",
    category: "wellness",
    difficulty: "beginner",
    durationDays: 30,
    rules: [
      "Hit 10,000 steps every day",
      "Track with phone or fitness device",
      "No rest days",
      "Any activity counts towards steps",
    ],
    dailyTasks: [
      { name: "10K Steps", type: "custom", isRequired: true },
    ],
    progressionType: "linear",
    restartOnFail: false,
    unlockMessage: "🚶 WALKING CHAMPION! 300,000 steps completed!",
    milestones: [
      {
        order: 1,
        name: "First Steps",
        description: "Days 1-7: Hit 10K steps for a full week",
        durationDays: 7,
        completionType: "days",
        requiredCompletions: 7,
        goalTargetValue: 10000,
        goalTargetUnit: "steps",
        unlockMessage: "One week of walking! You're on the move! 🚶",
      },
      {
        order: 2,
        name: "Building the Habit",
        description: "Days 8-15: Keep the streak alive",
        durationDays: 8,
        completionType: "days",
        requiredCompletions: 8,
        unlockMessage: "2 weeks! This is becoming a habit! 🏃",
      },
      {
        order: 3,
        name: "Walking Champion",
        description: "Days 16-30: Complete the full month",
        durationDays: 15,
        completionType: "days",
        requiredCompletions: 15,
        unlockMessage: "30 DAYS of 10K steps! That's 300,000 steps! 🏆",
      },
    ],
  },

  // 10. 75 Hard
  {
    name: "75 Hard",
    description: "The ultimate mental toughness program. 75 days of strict discipline with zero compromise.",
    shortDescription: "75 days of uncompromising discipline",
    category: "transformation",
    difficulty: "extreme",
    durationDays: 75,
    rules: [
      "Follow a diet (any diet, no cheat meals, no alcohol)",
      "Two 45-minute workouts per day (one must be outdoor)",
      "Drink 1 gallon of water daily",
      "Read 10 pages of non-fiction daily",
      "Take a progress photo daily",
      "If you miss any task, restart from Day 1",
    ],
    dailyTasks: [
      { name: "Workout 1", type: "workout", isRequired: true, description: "45+ minutes, one must be outdoor" },
      { name: "Workout 2", type: "workout", isRequired: true, description: "45+ minutes, one must be outdoor" },
      { name: "Diet Compliance", type: "nutrition", isRequired: true, description: "No cheat meals, no alcohol" },
      { name: "Water", type: "recovery", isRequired: true, description: "1 gallon minimum" },
      { name: "Reading", type: "mindset", isRequired: true, description: "10 pages non-fiction" },
      { name: "Progress Photo", type: "custom", isRequired: true },
    ],
    progressionType: "linear",
    restartOnFail: true,
    unlockMessage: "🏆 75 HARD COMPLETE! You've developed unbreakable mental fortitude!",
    milestones: [
      {
        order: 1,
        name: "Week 1: Initiation",
        description: "Survive the first 7 days without restarting",
        durationDays: 7,
        completionType: "days",
        requiredCompletions: 7,
        unlockMessage: "First week down! The hardest part is starting 💪",
      },
      {
        order: 2,
        name: "Phase 1 Complete",
        description: "Days 8-25: Build the foundation",
        durationDays: 18,
        completionType: "days",
        requiredCompletions: 18,
        unlockMessage: "25 days! You're adapting to the grind 🔥",
      },
      {
        order: 3,
        name: "Halfway There",
        description: "Days 26-37: Push through the middle",
        durationDays: 12,
        completionType: "days",
        requiredCompletions: 12,
        unlockMessage: "HALFWAY! You've built serious discipline 💪💪",
      },
      {
        order: 4,
        name: "Phase 2 Complete",
        description: "Days 38-55: Mental fortress",
        durationDays: 18,
        completionType: "days",
        requiredCompletions: 18,
        unlockMessage: "Day 55! You're becoming mentally unbreakable ⚔️",
      },
      {
        order: 5,
        name: "Final Stretch",
        description: "Days 56-75: Finish what you started",
        durationDays: 20,
        completionType: "days",
        requiredCompletions: 20,
        unlockMessage: "🏆 75 HARD CHAMPION! You did the impossible!",
      },
    ],
  },
];

async function seedChallenges() {
  console.log(`Starting challenge seeding... (${CHALLENGES.length} challenges)`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const challengeDef of CHALLENGES) {
    try {
      // Check if challenge already exists
      const existing = await db.query.challenges.findFirst({
        where: (c, { eq }) => eq(c.name, challengeDef.name),
      });

      if (existing) {
        console.log(`  ○ Challenge "${challengeDef.name}" already exists, skipping...`);
        skipCount++;
        continue;
      }

      console.log(`Creating challenge: ${challengeDef.name}`);

      // Insert challenge
      const [challenge] = await db.insert(challenges).values({
        name: challengeDef.name,
        description: challengeDef.description,
        shortDescription: challengeDef.shortDescription,
        category: challengeDef.category,
        difficulty: challengeDef.difficulty,
        durationDays: challengeDef.durationDays,
        rules: challengeDef.rules,
        dailyTasks: challengeDef.dailyTasks,
        progressionType: challengeDef.progressionType,
        restartOnFail: challengeDef.restartOnFail,
        unlockMessage: challengeDef.unlockMessage,
        visibility: "public",
        isOfficial: true,
        isFeatured: true,
        participantCount: Math.floor(Math.random() * 500) + 50,
        completionCount: Math.floor(Math.random() * 100) + 10,
        avgCompletionRate: 0.3 + Math.random() * 0.4, // 30-70%
        avgRating: 4 + Math.random(),
        ratingCount: Math.floor(Math.random() * 50) + 10,
        popularityScore: Math.random() * 100,
      }).returning();

      console.log(`  ✓ Created challenge: ${challenge.id}`);

      // Insert milestones
      for (const milestoneDef of challengeDef.milestones) {
        await db.insert(challengeMilestones).values({
          challengeId: challenge.id,
          order: milestoneDef.order,
          name: milestoneDef.name,
          description: milestoneDef.description,
          durationDays: milestoneDef.durationDays,
          completionType: milestoneDef.completionType,
          requiredCompletions: milestoneDef.requiredCompletions,
          goalTargetValue: milestoneDef.goalTargetValue,
          goalTargetUnit: milestoneDef.goalTargetUnit,
          unlockMessage: milestoneDef.unlockMessage,
        });
      }

      console.log(`    ✓ Created ${challengeDef.milestones.length} milestones`);
      successCount++;
    } catch (error) {
      console.error(`  ✗ Error creating challenge "${challengeDef.name}":`, error);
      errorCount++;
    }
  }

  console.log(`\nChallenge seeding complete:`);
  console.log(`  ✓ Inserted: ${successCount}`);
  console.log(`  ○ Skipped (existing): ${skipCount}`);
  console.log(`  ✗ Errors: ${errorCount}`);
  console.log(`  Total: ${CHALLENGES.length}`);
}

// Run the seed
seedChallenges()
  .then(() => {
    console.log("\nSeeding finished successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
