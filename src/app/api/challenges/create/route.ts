/**
 * User Challenge Creation API
 * 
 * POST - Create a new user challenge (can be private, circle, or public/community)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { challenges } from "@/lib/db/schema";
import { moderateText } from "@/lib/moderation";

const dailyTaskSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["workout", "nutrition", "hydration", "mindset", "custom", "pr_check"]).default("custom"),
  isRequired: z.boolean().default(true),
  description: z.string().optional(),
  // For PR-linked tasks
  exercise: z.string().optional(),
  targetValue: z.number().optional(),
  targetUnit: z.string().optional(),
});

const createChallengeSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  shortDescription: z.string().max(200).optional(),
  category: z.enum(["strength", "cardio", "wellness", "hybrid", "transformation"]),
  difficulty: z.enum(["beginner", "intermediate", "advanced", "extreme"]),
  durationDays: z.number().min(1).max(365),
  dailyTasks: z.array(dailyTaskSchema).min(1).max(10),
  rules: z.array(z.string()).optional(),
  visibility: z.enum(["private", "circle", "public"]).default("private"),
  circleId: z.string().uuid().optional(), // Required if visibility is "circle"
  restartOnFail: z.boolean().default(false),
  progressionType: z.enum(["linear", "progressive", "flexible"]).default("linear"),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createChallengeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Moderate content
    const nameModeration = moderateText(data.name);
    const descModeration = moderateText(data.description);

    if (!nameModeration.isClean || !descModeration.isClean) {
      return NextResponse.json(
        { error: "Content contains inappropriate language. Please revise and try again." },
        { status: 400 }
      );
    }

    // Validate circle visibility
    if (data.visibility === "circle" && !data.circleId) {
      return NextResponse.json(
        { error: "Circle ID is required for circle-visible challenges" },
        { status: 400 }
      );
    }

    // Create the challenge
    const [newChallenge] = await db
      .insert(challenges)
      .values({
        name: data.name,
        description: data.description,
        shortDescription: data.shortDescription || data.description.substring(0, 200),
        category: data.category,
        difficulty: data.difficulty,
        durationDays: data.durationDays,
        dailyTasks: data.dailyTasks,
        rules: data.rules || [],
        visibility: data.visibility,
        circleId: data.circleId || null,
        createdByUserId: session.user.id,
        isOfficial: false, // User-created challenges are never official
        isFeatured: false,
        restartOnFail: data.restartOnFail,
        progressionType: data.progressionType,
        participantCount: 0,
        completionCount: 0,
      })
      .returning();

    return NextResponse.json({
      success: true,
      challenge: {
        id: newChallenge.id,
        name: newChallenge.name,
        visibility: newChallenge.visibility,
      },
      message: data.visibility === "public" 
        ? "Challenge created and published to the community!" 
        : "Challenge created successfully!",
    });
  } catch (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json(
      { error: "Failed to create challenge" },
      { status: 500 }
    );
  }
}
