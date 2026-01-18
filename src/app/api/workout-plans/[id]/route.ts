import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workoutPlans, workoutPlanExercises } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const plan = await db.query.workoutPlans.findFirst({
      where: and(
        eq(workoutPlans.id, id),
        eq(workoutPlans.familyId, session.familyId)
      ),
      with: {
        exercises: {
          with: {
            exercise: true,
          },
          orderBy: (exercises, { asc }) => [asc(exercises.order)],
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      category: plan.category,
      difficulty: plan.difficulty,
      estimatedDuration: plan.estimatedDuration,
      exercises: plan.exercises,
    });
  } catch (error) {
    console.error("Error fetching workout plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout plan" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      category,
      difficulty,
      estimatedDuration,
      exercises,
    } = body;

    // Verify plan belongs to this family
    const existingPlan = await db.query.workoutPlans.findFirst({
      where: and(
        eq(workoutPlans.id, id),
        eq(workoutPlans.familyId, session.familyId)
      ),
    });

    if (!existingPlan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Update the plan
    await db
      .update(workoutPlans)
      .set({
        name,
        description,
        category,
        difficulty,
        estimatedDuration,
        updatedAt: new Date(),
      })
      .where(eq(workoutPlans.id, id));

    // Delete existing exercises and re-add
    await db
      .delete(workoutPlanExercises)
      .where(eq(workoutPlanExercises.planId, id));

    if (exercises && exercises.length > 0) {
      await db.insert(workoutPlanExercises).values(
        exercises.map((ex: any) => ({
          planId: id,
          exerciseId: ex.exerciseId,
          order: ex.order,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          duration: ex.duration,
          restBetweenSets: ex.restBetweenSets,
          notes: ex.notes,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating workout plan:", error);
    return NextResponse.json(
      { error: "Failed to update workout plan" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify plan belongs to this family
    const existingPlan = await db.query.workoutPlans.findFirst({
      where: and(
        eq(workoutPlans.id, id),
        eq(workoutPlans.familyId, session.familyId)
      ),
    });

    if (!existingPlan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    await db.delete(workoutPlans).where(eq(workoutPlans.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workout plan:", error);
    return NextResponse.json(
      { error: "Failed to delete workout plan" },
      { status: 500 }
    );
  }
}
