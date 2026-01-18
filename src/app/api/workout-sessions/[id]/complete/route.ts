import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  workoutSessions,
  workoutSessionExercises,
  exerciseSets,
  familyMembers,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
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
    const { exercises, notes, rating } = body;

    // Get the workout session
    const workoutSession = await db.query.workoutSessions.findFirst({
      where: eq(workoutSessions.id, id),
      with: {
        member: true,
      },
    });

    if (!workoutSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify member belongs to this family
    if (workoutSession.member.familyId !== session.familyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update the session with completion info
    await db
      .update(workoutSessions)
      .set({
        status: "completed",
        notes,
        rating,
        endTime: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workoutSessions.id, id));

    // Update exercise completion and sets
    if (exercises && exercises.length > 0) {
      const sessionExercises = await db.query.workoutSessionExercises.findMany({
        where: eq(workoutSessionExercises.sessionId, id),
      });

      for (const ex of exercises) {
        const sessionEx = sessionExercises.find(
          (se) => se.exerciseId === ex.exerciseId
        );

        if (sessionEx) {
          // Update exercise completion
          await db
            .update(workoutSessionExercises)
            .set({
              completed: ex.completed,
              notes: ex.notes,
            })
            .where(eq(workoutSessionExercises.id, sessionEx.id));

          // Update or create sets
          if (ex.sets && ex.sets.length > 0) {
            // Delete existing sets and create new ones
            await db
              .delete(exerciseSets)
              .where(eq(exerciseSets.sessionExerciseId, sessionEx.id));

            await db.insert(exerciseSets).values(
              ex.sets.map((set: any) => ({
                sessionExerciseId: sessionEx.id,
                setNumber: set.setNumber,
                targetReps: set.targetReps,
                actualReps: set.actualReps,
                targetWeight: set.targetWeight,
                actualWeight: set.actualWeight,
                completed: set.completed,
              }))
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error completing workout session:", error);
    return NextResponse.json(
      { error: "Failed to complete workout session" },
      { status: 500 }
    );
  }
}
