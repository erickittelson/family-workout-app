import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  exerciseSets,
  workoutSessionExercises,
  workoutSessions,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateSetSchema, validateBody } from "@/lib/validations";

// Update a single set in real-time
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; setId: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId, setId } = await params;

    const validation = await validateBody(request, updateSetSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { actualReps, actualWeight, actualDuration, actualDistance, completed, rpe, notes } = validation.data;

    // Verify the set belongs to a session in this circle
    const set = await db.query.exerciseSets.findFirst({
      where: eq(exerciseSets.id, setId),
      with: {
        sessionExercise: {
          with: {
            session: {
              with: {
                member: true,
              },
            },
          },
        },
      },
    });

    if (!set) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    if (set.sessionExercise.session.id !== sessionId) {
      return NextResponse.json({ error: "Set does not belong to this session" }, { status: 400 });
    }

    if (set.sessionExercise.session.member.circleId !== session.circleId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateData: Record<string, unknown> = {};
    if (actualReps !== undefined) updateData.actualReps = actualReps;
    if (actualWeight !== undefined) updateData.actualWeight = actualWeight;
    if (actualDuration !== undefined) updateData.actualDuration = actualDuration;
    if (actualDistance !== undefined) updateData.actualDistance = actualDistance;
    if (completed !== undefined) updateData.completed = completed;
    if (rpe !== undefined) updateData.rpe = rpe;
    if (notes !== undefined) updateData.notes = notes;

    const [updated] = await db
      .update(exerciseSets)
      .set(updateData)
      .where(eq(exerciseSets.id, setId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating set:", error);
    return NextResponse.json(
      { error: "Failed to update set" },
      { status: 500 }
    );
  }
}
