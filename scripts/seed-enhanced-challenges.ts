/**
 * Seed Enhanced Challenges
 * 
 * Creates new PR-linked, streak-based, and lifestyle challenges
 * with corresponding badges.
 * 
 * Run with: npx tsx scripts/seed-enhanced-challenges.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { challenges, badgeDefinitions, challengeMilestones } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

interface EnhancedChallenge {
  name: string;
  description: string;
  shortDescription: string;
  category: "strength" | "cardio" | "wellness" | "hybrid" | "transformation";
  difficulty: "beginner" | "intermediate" | "advanced" | "extreme";
  durationDays: number;
  dailyTasks: Array<{
    name: string;
    type: string;
    isRequired: boolean;
    description: string;
    exercise?: string;
    targetValue?: number;
    targetUnit?: string;
  }>;
  rules: string[];
  restartOnFail: boolean;
  progressionType: "linear" | "progressive" | "flexible";
  badge?: {
    name: string;
    description: string;
    icon: string;
    tier: "bronze" | "silver" | "gold" | "platinum";
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
    unlockMessage: string;
  };
  milestones?: Array<{
    order: number;
    name: string;
    description: string;
    completionType: "days" | "goal" | "workout" | "manual";
    requiredCompletions: number;
    unlockMessage: string;
  }>;
}

const ENHANCED_CHALLENGES: EnhancedChallenge[] = [
  // PR-LINKED CHALLENGES
  {
    name: "1000lb Club Quest",
    description: "The ultimate strength milestone. Achieve a combined total of 1000 lbs across squat, bench press, and deadlift. This challenge helps you track your progress toward this prestigious goal with daily training and PR tracking.",
    shortDescription: "Reach the coveted 1000lb powerlifting total",
    category: "strength",
    difficulty: "advanced",
    durationDays: 90,
    dailyTasks: [
      {
        name: "Complete Strength Training",
        type: "workout",
        isRequired: true,
        description: "Perform your scheduled squat, bench, or deadlift workout",
      },
      {
        name: "Squat PR Check (335 lbs)",
        type: "pr_check",
        isRequired: false,
        description: "Track progress toward 335 lb squat",
        exercise: "squat",
        targetValue: 335,
        targetUnit: "lbs",
      },
      {
        name: "Bench PR Check (225 lbs)",
        type: "pr_check",
        isRequired: false,
        description: "Track progress toward 225 lb bench",
        exercise: "bench press",
        targetValue: 225,
        targetUnit: "lbs",
      },
      {
        name: "Deadlift PR Check (440 lbs)",
        type: "pr_check",
        isRequired: false,
        description: "Track progress toward 440 lb deadlift",
        exercise: "deadlift",
        targetValue: 440,
        targetUnit: "lbs",
      },
      {
        name: "Log Nutrition",
        type: "nutrition",
        isRequired: true,
        description: "Track protein intake (aim for 0.8-1g per lb bodyweight)",
      },
    ],
    rules: [
      "Train at least 4 days per week",
      "Follow progressive overload principles",
      "PRs must be performed with proper form",
      "Rest at least 48 hours between same muscle groups",
      "Challenge complete when 1000lb total is achieved",
    ],
    restartOnFail: false,
    progressionType: "progressive",
    badge: {
      name: "1000lb Quest Warrior",
      description: "Completed the 1000lb Club Quest challenge",
      icon: "medal",
      tier: "gold",
      rarity: "rare",
      unlockMessage: "You've conquered the 1000lb Club Quest! Your dedication to strength is inspiring.",
    },
    milestones: [
      {
        order: 1,
        name: "Week 1 Complete",
        description: "Complete the first week of training",
        completionType: "days",
        requiredCompletions: 7,
        unlockMessage: "Great start! Keep the momentum going.",
      },
      {
        order: 2,
        name: "First PR",
        description: "Hit your first new PR during the challenge",
        completionType: "manual",
        requiredCompletions: 1,
        unlockMessage: "Your first PR! The gains are coming.",
      },
      {
        order: 3,
        name: "Halfway There",
        description: "Reach day 45 of the challenge",
        completionType: "days",
        requiredCompletions: 45,
        unlockMessage: "Halfway to greatness. Stay focused.",
      },
      {
        order: 4,
        name: "1000lb Total",
        description: "Achieve the 1000lb combined total",
        completionType: "goal",
        requiredCompletions: 1,
        unlockMessage: "LEGENDARY! You've joined the 1000lb Club!",
      },
    ],
  },
  {
    name: "PR Hunter",
    description: "Set 5 new personal records in 60 days. Focus on progressive overload and proper technique to break through your plateaus. Track your improvements across any exercises you choose.",
    shortDescription: "Set 5 new PRs in 60 days",
    category: "strength",
    difficulty: "intermediate",
    durationDays: 60,
    dailyTasks: [
      {
        name: "Complete Training Session",
        type: "workout",
        isRequired: true,
        description: "Complete your scheduled workout",
      },
      {
        name: "Log Any PR Attempts",
        type: "custom",
        isRequired: false,
        description: "Record any PR attempts (successful or not)",
      },
      {
        name: "Recovery Protocol",
        type: "recovery",
        isRequired: false,
        description: "Sleep 7+ hours and stay hydrated",
      },
    ],
    rules: [
      "PRs can be in any exercise",
      "Train at least 3 times per week",
      "PRs must be logged with video or witness",
      "Complete 5 PRs to finish the challenge",
    ],
    restartOnFail: false,
    progressionType: "flexible",
    badge: {
      name: "PR Hunter",
      description: "Set 5 new PRs in 60 days",
      icon: "target",
      tier: "silver",
      rarity: "uncommon",
      unlockMessage: "You're a true PR Hunter! 5 records broken!",
    },
  },
  
  // STREAK CHALLENGES
  {
    name: "Streak Master",
    description: "Build the ultimate workout habit by training every single day for 30 days straight. No excuses, no rest days - just consistent effort. Even a 10-minute active recovery session counts.",
    shortDescription: "Work out every day for 30 days",
    category: "hybrid",
    difficulty: "intermediate",
    durationDays: 30,
    dailyTasks: [
      {
        name: "Complete Any Workout",
        type: "workout",
        isRequired: true,
        description: "Any workout counts: gym, run, yoga, home workout, or active recovery",
      },
      {
        name: "Log Activity",
        type: "custom",
        isRequired: true,
        description: "Record what you did and for how long",
      },
    ],
    rules: [
      "Minimum 10 minutes of activity per day",
      "Active recovery (walking, stretching) counts",
      "Must log activity before midnight",
      "Missing one day resets the streak",
      "30 consecutive days completes the challenge",
    ],
    restartOnFail: true,
    progressionType: "linear",
    badge: {
      name: "Streak Master",
      description: "Completed 30 consecutive days of activity",
      icon: "flame",
      tier: "gold",
      rarity: "rare",
      unlockMessage: "30 days without missing once! You've mastered consistency.",
    },
  },
  {
    name: "Morning Warrior",
    description: "Transform into an early bird by completing your workout before 7 AM for 21 days. Studies show morning exercisers are more consistent - build this powerful habit.",
    shortDescription: "Workout before 7 AM for 21 days",
    category: "wellness",
    difficulty: "intermediate",
    durationDays: 21,
    dailyTasks: [
      {
        name: "Morning Workout (before 7 AM)",
        type: "workout",
        isRequired: true,
        description: "Complete any workout before 7:00 AM",
      },
      {
        name: "Log Workout Time",
        type: "custom",
        isRequired: true,
        description: "Record the time you started your workout",
      },
    ],
    rules: [
      "Workout must start before 7:00 AM local time",
      "Minimum 20 minutes of activity",
      "Rest days are allowed (max 2 per week)",
      "Log your start time as proof",
    ],
    restartOnFail: false,
    progressionType: "linear",
    badge: {
      name: "Early Riser",
      description: "Completed 21 days of morning workouts",
      icon: "sunrise",
      tier: "silver",
      rarity: "uncommon",
      unlockMessage: "Rise and grind! You've become a morning warrior.",
    },
  },

  // WELLNESS CHALLENGES
  {
    name: "Step Champion",
    description: "Walk your way to better health with 10,000 steps every day for 30 days. A simple but powerful habit that improves cardiovascular health, mood, and energy levels.",
    shortDescription: "10,000 steps daily for 30 days",
    category: "wellness",
    difficulty: "beginner",
    durationDays: 30,
    dailyTasks: [
      {
        name: "Reach 10,000 Steps",
        type: "steps",
        isRequired: true,
        description: "Walk at least 10,000 steps today",
      },
      {
        name: "Log Step Count",
        type: "custom",
        isRequired: true,
        description: "Record your total step count",
      },
    ],
    rules: [
      "Use any fitness tracker or phone to count steps",
      "10,000 steps minimum per day",
      "Running/jogging steps count",
      "Must log steps before midnight",
    ],
    restartOnFail: false,
    progressionType: "linear",
    badge: {
      name: "Step Champion",
      description: "Walked 10,000+ steps daily for 30 days",
      icon: "footprints",
      tier: "silver",
      rarity: "uncommon",
      unlockMessage: "That's over 300,000 steps! You're a walking legend.",
    },
  },
  {
    name: "Hydration Hero",
    description: "Drink a gallon of water every day for 30 days. Proper hydration improves performance, recovery, skin health, and cognitive function. Track your intake and feel the difference.",
    shortDescription: "Drink 1 gallon of water daily",
    category: "wellness",
    difficulty: "beginner",
    durationDays: 30,
    dailyTasks: [
      {
        name: "Drink 1 Gallon of Water",
        type: "hydration",
        isRequired: true,
        description: "Consume 128 oz (1 gallon) of water",
      },
      {
        name: "Log Water Intake",
        type: "custom",
        isRequired: false,
        description: "Track how much water you've consumed",
      },
    ],
    rules: [
      "1 gallon = 128 oz = 3.8 liters",
      "Plain water, sparkling water, and herbal tea count",
      "Coffee and sugary drinks don't count",
      "Spread intake throughout the day",
    ],
    restartOnFail: false,
    progressionType: "linear",
    badge: {
      name: "Hydration Hero",
      description: "Drank 1 gallon of water daily for 30 days",
      icon: "droplet",
      tier: "bronze",
      rarity: "common",
      unlockMessage: "That's 30 gallons of water! Your body thanks you.",
    },
  },

  // HYBRID/LIFESTYLE CHALLENGES
  {
    name: "No Sugar November",
    description: "Eliminate added sugars from your diet for 30 days. This challenge helps reset your palate, stabilize blood sugar, and break the sugar addiction cycle.",
    shortDescription: "No added sugars for 30 days",
    category: "wellness",
    difficulty: "intermediate",
    durationDays: 30,
    dailyTasks: [
      {
        name: "No Added Sugar",
        type: "nutrition",
        isRequired: true,
        description: "Avoid all foods with added sugars",
      },
      {
        name: "Log Meals",
        type: "custom",
        isRequired: false,
        description: "Track what you eat to stay accountable",
      },
    ],
    rules: [
      "No added sugars (check labels!)",
      "Natural sugars from fruit are allowed",
      "Honey, maple syrup, agave count as added sugar",
      "One slip-up restarts the challenge",
    ],
    restartOnFail: true,
    progressionType: "linear",
    badge: {
      name: "Sugar-Free Warrior",
      description: "Completed 30 days without added sugar",
      icon: "apple",
      tier: "silver",
      rarity: "uncommon",
      unlockMessage: "You beat the sugar addiction! Sweet victory.",
    },
  },
  {
    name: "Digital Detox",
    description: "Take a break from screens before bed for 21 days. No phones, tablets, or TV for 1 hour before sleep. Improve your sleep quality and evening routine.",
    shortDescription: "No screens 1 hour before bed for 21 days",
    category: "wellness",
    difficulty: "intermediate",
    durationDays: 21,
    dailyTasks: [
      {
        name: "Screen-Free Hour",
        type: "mindset",
        isRequired: true,
        description: "No screens for 1 hour before bed",
      },
      {
        name: "Log Sleep Quality",
        type: "custom",
        isRequired: false,
        description: "Rate your sleep quality 1-10",
      },
    ],
    rules: [
      "No phones, tablets, TV, or computers",
      "E-readers with E-ink are allowed",
      "Start the screen-free hour before your target bedtime",
      "Track your sleep quality improvement",
    ],
    restartOnFail: false,
    progressionType: "linear",
    badge: {
      name: "Digital Detox Pro",
      description: "21 days of screen-free evenings",
      icon: "moon",
      tier: "bronze",
      rarity: "common",
      unlockMessage: "Your sleep thanks you! Digital balance achieved.",
    },
  },

  // EXTREME CHALLENGES
  {
    name: "Iron Mind",
    description: "A mental toughness challenge inspired by Navy SEAL training. Cold showers, early wake-ups, and pushing through discomfort. Build unshakeable discipline.",
    shortDescription: "21 days of mental toughness training",
    category: "transformation",
    difficulty: "extreme",
    durationDays: 21,
    dailyTasks: [
      {
        name: "5 AM Wake Up",
        type: "mindset",
        isRequired: true,
        description: "Wake up at 5 AM - no snoozing",
      },
      {
        name: "Cold Shower",
        type: "recovery",
        isRequired: true,
        description: "End your shower with 2 minutes of cold water",
      },
      {
        name: "Complete Workout",
        type: "workout",
        isRequired: true,
        description: "Full workout (strength, cardio, or both)",
      },
      {
        name: "No Complaints",
        type: "mindset",
        isRequired: true,
        description: "No complaining or negative self-talk all day",
      },
    ],
    rules: [
      "Wake up at 5 AM every day",
      "Cold shower must be at least 2 minutes",
      "Workout must be challenging",
      "Track your compliance honestly",
      "Missing any task restarts the challenge",
    ],
    restartOnFail: true,
    progressionType: "linear",
    badge: {
      name: "Iron Mind",
      description: "Completed 21 days of mental toughness training",
      icon: "shield",
      tier: "platinum",
      rarity: "legendary",
      unlockMessage: "Your mind is forged in iron. Nothing can break you.",
    },
  },
];

async function seedEnhancedChallenges() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║            SEEDING ENHANCED CHALLENGES                        ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  for (const challengeData of ENHANCED_CHALLENGES) {
    console.log(`Processing: ${challengeData.name}`);
    
    // Check if challenge already exists
    const existing = await db.query.challenges.findFirst({
      where: eq(challenges.name, challengeData.name),
    });

    if (existing) {
      console.log(`  - Challenge already exists, skipping`);
      continue;
    }

    // Create the challenge
    const [newChallenge] = await db
      .insert(challenges)
      .values({
        name: challengeData.name,
        description: challengeData.description,
        shortDescription: challengeData.shortDescription,
        category: challengeData.category,
        difficulty: challengeData.difficulty,
        durationDays: challengeData.durationDays,
        dailyTasks: challengeData.dailyTasks,
        rules: challengeData.rules,
        restartOnFail: challengeData.restartOnFail,
        progressionType: challengeData.progressionType,
        visibility: "public",
        isOfficial: true,
        isFeatured: false,
        participantCount: 0,
        completionCount: 0,
      })
      .returning();

    console.log(`  ✓ Created challenge: ${newChallenge.id}`);

    // Create badge if defined
    if (challengeData.badge) {
      const existingBadge = await db.query.badgeDefinitions.findFirst({
        where: eq(badgeDefinitions.name, challengeData.badge.name),
      });

      if (!existingBadge) {
        const [newBadge] = await db
          .insert(badgeDefinitions)
          .values({
            name: challengeData.badge.name,
            description: challengeData.badge.description,
            icon: challengeData.badge.icon,
            category: "challenge",
            tier: challengeData.badge.tier,
            criteria: {
              type: "challenge_complete",
              challengeId: newChallenge.id,
            },
            criteriaDescription: `Complete the ${challengeData.name} challenge`,
            rarity: challengeData.badge.rarity,
            unlockMessage: challengeData.badge.unlockMessage,
            isAutomatic: true,
            isActive: true,
          })
          .returning();

        console.log(`  ✓ Created badge: ${newBadge.name}`);
      } else {
        console.log(`  - Badge already exists: ${challengeData.badge.name}`);
      }
    }

    // Create milestones if defined
    if (challengeData.milestones) {
      for (const milestone of challengeData.milestones) {
        await db.insert(challengeMilestones).values({
          challengeId: newChallenge.id,
          order: milestone.order,
          name: milestone.name,
          description: milestone.description,
          completionType: milestone.completionType,
          requiredCompletions: milestone.requiredCompletions,
          unlockMessage: milestone.unlockMessage,
        });
      }
      console.log(`  ✓ Created ${challengeData.milestones.length} milestones`);
    }
  }

  console.log("\n✅ Enhanced challenges seeded successfully!");
}

seedEnhancedChallenges()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error seeding challenges:", err);
    process.exit(1);
  });
