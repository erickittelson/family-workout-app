import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  workoutSessions,
  workoutSessionExercises,
  exerciseSets,
  familyMembers,
} from "@/lib/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get family member IDs
    const members = await db.query.familyMembers.findMany({
      where: eq(familyMembers.familyId, session.familyId),
      columns: { id: true, name: true },
    });

    const memberIds = members.map((m) => m.id);
    const memberMap = Object.fromEntries(members.map((m) => [m.id, m.name]));

    if (memberIds.length === 0) {
      return NextResponse.json([]);
    }

    const sessions = await db.query.workoutSessions.findMany({
      where: inArray(workoutSessions.memberId, memberIds),
      orderBy: [desc(workoutSessions.date)],
      limit: 50,
    });

    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      name: s.name,
      date: s.date.toISOString(),
      status: s.status,
      memberName: memberMap[s.memberId] || "Unknown",
      rating: s.rating,
    }));

    return NextResponse.json(formattedSessions);
  } catch (error) {
    console.error("Error fetching workout sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, planId, name, date, exercises } = body;

    if (!memberId || !name) {
      return NextResponse.json(
        { error: "Member and name are required" },
        { status: 400 }
      );
    }

    // Verify member belongs to this family
    const member = await db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.id, memberId),
        eq(familyMembers.familyId, session.familyId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Create the workout session
    const [workoutSession] = await db
      .insert(workoutSessions)
      .values({
        memberId,
        planId: planId || null,
        name,
        date: date ? new Date(date) : new Date(),
        status: "planned",
      })
      .returning();

    // Add exercises to the session
    if (exercises && exercises.length > 0) {
      for (const ex of exercises) {
        const [sessionExercise] = await db
          .insert(workoutSessionExercises)
          .values({
            sessionId: workoutSession.id,
            exerciseId: ex.exerciseId,
            order: ex.order,
          })
          .returning();

        // Add sets for each exercise
        if (ex.sets && ex.sets.length > 0) {
          await db.insert(exerciseSets).values(
            ex.sets.map((set: any, index: number) => ({
              sessionExerciseId: sessionExercise.id,
              setNumber: index + 1,
              targetReps: set.targetReps,
              targetWeight: set.targetWeight,
              targetDuration: set.targetDuration,
            }))
          );
        }
      }
    }

    return NextResponse.json({ id: workoutSession.id });
  } catch (error) {
    console.error("Error creating workout session:", error);
    return NextResponse.json(
      { error: "Failed to create workout session" },
      { status: 500 }
    );
  }
}
