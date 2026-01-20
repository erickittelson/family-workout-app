import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  workoutSessions,
  workoutSessionExercises,
  exerciseSets,
  circleMembers,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Get a single workout session with all details
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

    const workoutSession = await db.query.workoutSessions.findFirst({
      where: eq(workoutSessions.id, id),
      with: {
        member: true,
        plan: true,
        exercises: {
          with: {
            exercise: true,
            sets: {
              orderBy: (sets, { asc }) => [asc(sets.setNumber)],
            },
          },
          orderBy: (exercises, { asc }) => [asc(exercises.order)],
        },
      },
    });

    if (!workoutSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify member belongs to this circle
    if (workoutSession.member.circleId !== session.circleId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(workoutSession);
  } catch (error) {
    console.error("Error fetching workout session:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout session" },
      { status: 500 }
    );
  }
}

// Update workout session (start, pause, etc.)
export async function PATCH(
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
    const { status, startTime, endTime, notes, rating } = body;

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

    // Verify member belongs to this circle
    if (workoutSession.member.circleId !== session.circleId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (status) updateData.status = status;
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (notes !== undefined) updateData.notes = notes;
    if (rating !== undefined) updateData.rating = rating;

    const [updated] = await db
      .update(workoutSessions)
      .set(updateData)
      .where(eq(workoutSessions.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating workout session:", error);
    return NextResponse.json(
      { error: "Failed to update workout session" },
      { status: 500 }
    );
  }
}
