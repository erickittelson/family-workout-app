import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circleMembers, workoutSessions, workoutSessionExercises, exerciseSets } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

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

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get workout sessions for this member with exercises and sets
    const workouts = await db.query.workoutSessions.findMany({
      where: eq(workoutSessions.memberId, id),
      orderBy: [desc(workoutSessions.date)],
      limit: 50,
      with: {
        exercises: {
          with: {
            exercise: true,
            sets: true,
          },
        },
      },
    });

    // Transform the data for the frontend
    const transformedWorkouts = workouts.map((workout) => ({
      id: workout.id,
      name: workout.name,
      date: workout.date,
      status: workout.status,
      rating: workout.rating,
      startTime: workout.startTime,
      endTime: workout.endTime,
      notes: workout.notes,
      exercises: workout.exercises.map((we) => ({
        name: we.exercise.name,
        category: we.exercise.category,
        muscleGroups: we.exercise.muscleGroups || [],
        setsCompleted: we.sets.filter((s) => s.completed).length,
        totalSets: we.sets.length,
        maxWeight: Math.max(...we.sets.map((s) => s.actualWeight || s.targetWeight || 0), 0),
        avgReps: we.sets.length > 0
          ? Math.round(
              we.sets.reduce((sum, s) => sum + (s.actualReps || s.targetReps || 0), 0) /
                we.sets.length
            )
          : 0,
      })),
    }));

    return NextResponse.json(transformedWorkouts);
  } catch (error) {
    console.error("Error fetching workout history:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout history" },
      { status: 500 }
    );
  }
}
