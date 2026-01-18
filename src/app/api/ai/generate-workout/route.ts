import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workoutPlans, workoutPlanExercises, exercises, familyMembers } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getMemberContext, buildSystemPrompt } from "@/lib/ai";

const workoutSchema = z.object({
  name: z.string().describe("Name of the workout"),
  description: z.string().describe("Brief description of the workout focus"),
  exercises: z.array(
    z.object({
      name: z.string().describe("Exercise name (must match available exercises)"),
      sets: z.number().describe("Number of sets"),
      reps: z.string().describe("Rep range or scheme (e.g., '8-12', '5x5', 'AMRAP')"),
      restSeconds: z.number().describe("Rest between sets in seconds"),
      notes: z.string().optional().describe("Any special instructions"),
    })
  ),
  estimatedDuration: z.number().describe("Estimated duration in minutes"),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { memberId, focus, saveAsPlan } = await request.json();

    if (!memberId) {
      return new Response("Member ID is required", { status: 400 });
    }

    // Verify member belongs to family
    const member = await db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.id, memberId),
        eq(familyMembers.familyId, session.familyId)
      ),
    });

    if (!member) {
      return new Response("Member not found", { status: 404 });
    }

    // Get available exercises
    const availableExercises = await db.query.exercises.findMany({
      columns: { id: true, name: true, category: true, muscleGroups: true },
    });

    const exerciseNames = availableExercises.map((e) => e.name);

    // Get member context
    const context = await getMemberContext(memberId);
    const systemPrompt = buildSystemPrompt(context);

    const prompt = `Generate a workout for today.
${focus ? `Focus: ${focus}` : "Choose an appropriate focus based on recent workout history and goals."}

Available exercises (you MUST only use exercises from this list):
${exerciseNames.join(", ")}

Requirements:
1. Choose 5-8 exercises appropriate for the focus
2. Include warm-up considerations in the notes
3. Order exercises logically (compound movements first)
4. Set appropriate sets, reps, and rest based on the goal
5. Consider the person's fitness level and any limitations
6. Avoid exercises that target the same muscles worked heavily in recent workouts`;

    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: workoutSchema,
      system: systemPrompt,
      prompt,
    });

    // If requested, save as a workout plan
    if (saveAsPlan) {
      const [plan] = await db
        .insert(workoutPlans)
        .values({
          familyId: session.familyId,
          name: result.object.name,
          description: result.object.description,
          estimatedDuration: result.object.estimatedDuration,
          aiGenerated: true,
          createdByMemberId: memberId,
        })
        .returning();

      // Match exercises to database and add to plan
      const exerciseMap = new Map(
        availableExercises.map((e) => [e.name.toLowerCase(), e])
      );

      const planExercises = result.object.exercises
        .map((ex, index) => {
          const dbExercise = exerciseMap.get(ex.name.toLowerCase());
          if (!dbExercise) return null;

          return {
            planId: plan.id,
            exerciseId: dbExercise.id,
            order: index,
            sets: ex.sets,
            reps: ex.reps,
            restBetweenSets: ex.restSeconds,
            notes: ex.notes,
          };
        })
        .filter(Boolean);

      if (planExercises.length > 0) {
        await db.insert(workoutPlanExercises).values(planExercises as any);
      }

      return Response.json({
        success: true,
        workout: result.object,
        planId: plan.id,
      });
    }

    return Response.json({
      success: true,
      workout: result.object,
    });
  } catch (error) {
    console.error("Error generating workout:", error);
    return new Response("Failed to generate workout", { status: 500 });
  }
}
