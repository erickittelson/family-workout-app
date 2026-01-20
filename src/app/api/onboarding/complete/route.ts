/**
 * Onboarding Complete API
 *
 * Creates the user's profile from AI-extracted onboarding data.
 * This creates:
 * - A personal circle for the user
 * - Their member profile with collected data
 * - Initial metrics
 * - Limitations (if any)
 * - Goals (if any)
 * - Personal records (if any)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import {
  circles,
  circleMembers,
  memberMetrics,
  memberLimitations,
  goals,
  personalRecords,
  exercises,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

const ACTIVE_CIRCLE_COOKIE = "active_circle";

// Schema for the extracted onboarding data
const onboardingDataSchema = z.object({
  name: z.string().optional(),
  age: z.number().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  heightFeet: z.number().optional(),
  heightInches: z.number().optional(),
  weight: z.number().optional(),
  bodyFatPercentage: z.number().optional(),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
  primaryMotivation: z.string().optional(),
  primaryGoal: z.object({
    type: z.string(),
    description: z.string(),
    targetValue: z.number().optional(),
    targetUnit: z.string().optional(),
  }).optional(),
  secondaryGoals: z.array(z.string()).optional(),
  timeline: z.string().optional(),
  targetWeight: z.number().optional(),
  limitations: z.array(z.object({
    bodyPart: z.string(),
    condition: z.string(),
    severity: z.enum(["mild", "moderate", "severe"]).optional(),
    avoidMovements: z.array(z.string()).optional(),
  })).optional(),
  personalRecords: z.array(z.object({
    exercise: z.string(),
    value: z.number(),
    unit: z.string(),
    isEstimate: z.boolean().optional(),
  })).optional(),
  workoutDuration: z.number().optional(),
  equipmentAccess: z.array(z.string()).optional(),
  workoutDays: z.array(z.string()).optional(),
  trainingFrequency: z.number().optional(),
  currentActivity: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = onboardingDataSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const data = validation.data;
    const userName = data.name || session.user.name || "User";

    // Check if user already has a personal circle
    const existingCircles = session.circles || [];
    let circleId: string;
    let memberId: string;

    if (existingCircles.length > 0) {
      // Use existing circle
      circleId = existingCircles[0].id;
      memberId = existingCircles[0].memberId;

      // Update the existing member profile
      await db
        .update(circleMembers)
        .set({
          name: userName,
          gender: data.gender || null,
          dateOfBirth: data.age
            ? new Date(
                new Date().getFullYear() - data.age,
                new Date().getMonth(),
                new Date().getDate()
              )
            : null,
          updatedAt: new Date(),
        })
        .where(eq(circleMembers.id, memberId));
    } else {
      // Create a personal circle for the user
      const [newCircle] = await db
        .insert(circles)
        .values({
          name: `${userName}'s Circle`,
          description: "Your personal workout space",
        })
        .returning();

      circleId = newCircle.id;

      // Create member profile
      const [newMember] = await db
        .insert(circleMembers)
        .values({
          circleId,
          userId: session.user.id,
          name: userName,
          gender: data.gender || null,
          dateOfBirth: data.age
            ? new Date(
                new Date().getFullYear() - data.age,
                new Date().getMonth(),
                new Date().getDate()
              )
            : null,
          role: "owner",
        })
        .returning();

      memberId = newMember.id;

      // Set the active circle cookie
      const cookieStore = await cookies();
      cookieStore.set(ACTIVE_CIRCLE_COOKIE, circleId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });
    }

    // Create initial metrics if we have any
    if (
      data.weight ||
      data.heightFeet ||
      data.bodyFatPercentage ||
      data.fitnessLevel
    ) {
      const heightInches = data.heightFeet
        ? data.heightFeet * 12 + (data.heightInches || 0)
        : null;

      await db.insert(memberMetrics).values({
        memberId,
        weight: data.weight || null,
        height: heightInches,
        bodyFatPercentage: data.bodyFatPercentage || null,
        fitnessLevel: data.fitnessLevel || null,
        notes: "Initial profile from onboarding",
      });
    }

    // Create limitations if any
    if (data.limitations && data.limitations.length > 0) {
      await db.insert(memberLimitations).values(
        data.limitations.map((l) => ({
          memberId,
          type: "injury",
          description: `${l.bodyPart}: ${l.condition}`,
          affectedAreas: [l.bodyPart],
          severity: l.severity || null,
          active: true,
        }))
      );
    }

    // Create primary goal if provided
    if (data.primaryGoal) {
      // Determine category from goal type
      const categoryMap: Record<string, string> = {
        strength: "strength",
        weight_loss: "weight",
        muscle_building: "strength",
        cardio: "cardio",
        skill: "skill",
        aesthetic: "weight",
        health: "health",
      };

      // Parse timeline into target date
      let targetDate: Date | null = null;
      if (data.timeline) {
        const match = data.timeline.match(/(\d+)\s*(week|month|year)/i);
        if (match) {
          const amount = parseInt(match[1], 10);
          const unit = match[2].toLowerCase();
          targetDate = new Date();
          if (unit === "week") {
            targetDate.setDate(targetDate.getDate() + amount * 7);
          } else if (unit === "month") {
            targetDate.setMonth(targetDate.getMonth() + amount);
          } else if (unit === "year") {
            targetDate.setFullYear(targetDate.getFullYear() + amount);
          }
        }
      }

      await db.insert(goals).values({
        memberId,
        title: data.primaryGoal.description,
        description: data.primaryMotivation || null,
        category: categoryMap[data.primaryGoal.type] || "health",
        targetValue: data.primaryGoal.targetValue || null,
        targetUnit: data.primaryGoal.targetUnit || null,
        targetDate,
        status: "active",
        aiGenerated: true,
      });
    }

    // Create personal records if any
    if (data.personalRecords && data.personalRecords.length > 0) {
      for (const pr of data.personalRecords) {
        // Find or create the exercise
        let exercise = await db.query.exercises.findFirst({
          where: (ex, { ilike }) => ilike(ex.name, pr.exercise),
        });

        if (!exercise) {
          // Create a custom exercise for this PR
          const [newExercise] = await db
            .insert(exercises)
            .values({
              name: pr.exercise,
              category: "custom",
              muscleGroups: [],
              equipment: [],
              difficulty: "intermediate",
              isCustom: true,
            })
            .returning();
          exercise = newExercise;
        }

        await db.insert(personalRecords).values({
          memberId,
          exerciseId: exercise.id,
          value: pr.value,
          unit: pr.unit,
          recordType: pr.isEstimate ? "estimated" : "current",
          repMax: pr.unit === "lbs" || pr.unit === "kg" ? 1 : null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      circleId,
      memberId,
      message: "Profile created successfully",
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
