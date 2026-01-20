import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  workoutSessions,
  workoutSessionExercises,
  exerciseSets,
  workoutPlans,
  workoutPlanExercises,
  circleMembers,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { startWorkoutSessionSchema, validateBody } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validation = await validateBody(request, startWorkoutSessionSchema);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { memberId, memberIds, planId, name } = validation.data;

    // Build list of member IDs (support both single and array)
    let allMemberIds: string[] = [];
    if (memberIds && memberIds.length > 0) {
      allMemberIds = memberIds;
    } else if (memberId) {
      allMemberIds = [memberId];
    }

    if (allMemberIds.length === 0) {
      return NextResponse.json({ error: "At least one member is required" }, { status: 400 });
    }

    // Verify all members belong to this circle
    const members = await db.query.circleMembers.findMany({
      where: and(
        inArray(circleMembers.id, allMemberIds),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (members.length !== allMemberIds.length) {
      return NextResponse.json({ error: "One or more members not found" }, { status: 404 });
    }

    let workoutName = name;
    let planExercises: any[] = [];

    // If a plan is provided, load its exercises
    if (planId) {
      const plan = await db.query.workoutPlans.findFirst({
        where: and(
          eq(workoutPlans.id, planId),
          eq(workoutPlans.circleId, session.circleId)
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

      workoutName = workoutName || plan.name;
      planExercises = plan.exercises;
    }

    if (!workoutName) {
      workoutName = `Workout - ${new Date().toLocaleDateString()}`;
    }

    // Generate a group ID if multiple members
    const groupId = allMemberIds.length > 1 ? crypto.randomUUID() : null;
    const isGroupWorkout = allMemberIds.length > 1;

    // For group workouts, add member names to the workout name
    const memberNames = members.map(m => m.name);
    const displayName = isGroupWorkout
      ? `${workoutName} (${memberNames.join(", ")})`
      : workoutName;

    // Create workout sessions for each member
    const createdSessions: { id: string; memberId: string; memberName: string }[] = [];

    for (const member of members) {
      // Create the workout session
      const [workoutSession] = await db
        .insert(workoutSessions)
        .values({
          memberId: member.id,
          planId: planId || null,
          name: workoutName,
          date: new Date(),
          status: "planned",
          // Store group info in notes field as JSON for now (avoids schema change)
          notes: groupId ? JSON.stringify({ groupId, memberIds: allMemberIds }) : null,
        })
        .returning();

      createdSessions.push({
        id: workoutSession.id,
        memberId: member.id,
        memberName: member.name,
      });

      // Add exercises from the plan
      for (const planEx of planExercises) {
        const [sessionExercise] = await db
          .insert(workoutSessionExercises)
          .values({
            sessionId: workoutSession.id,
            exerciseId: planEx.exerciseId,
            order: planEx.order,
          })
          .returning();

        // Create sets for each exercise
        const numSets = planEx.sets || 3;
        const targetReps = planEx.reps ? parseInt(planEx.reps) : undefined;
        const targetWeight = planEx.weight ? parseFloat(planEx.weight) : undefined;

        const setsToCreate = [];
        for (let i = 1; i <= numSets; i++) {
          setsToCreate.push({
            sessionExerciseId: sessionExercise.id,
            setNumber: i,
            targetReps,
            targetWeight,
            targetDuration: planEx.duration || undefined,
            completed: false,
          });
        }

        if (setsToCreate.length > 0) {
          await db.insert(exerciseSets).values(setsToCreate);
        }
      }
    }

    // Return the first session ID for navigation, plus info about the group
    return NextResponse.json({
      id: createdSessions[0].id,
      name: displayName,
      isGroupWorkout,
      groupId,
      sessions: createdSessions,
    });
  } catch (error) {
    console.error("Error starting workout:", error);
    return NextResponse.json(
      { error: "Failed to start workout" },
      { status: 500 }
    );
  }
}
