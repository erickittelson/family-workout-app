import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  familyMembers,
  exercises,
  workoutPlans,
  workoutSessions,
  goals,
} from "@/lib/db/schema";
import { eq, count, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get counts
    const [membersCount] = await db
      .select({ count: count() })
      .from(familyMembers)
      .where(eq(familyMembers.familyId, session.familyId));

    const [exercisesCount] = await db.select({ count: count() }).from(exercises);

    const [workoutPlansCount] = await db
      .select({ count: count() })
      .from(workoutPlans)
      .where(eq(workoutPlans.familyId, session.familyId));

    // Get member IDs for session and goal counts
    const members = await db.query.familyMembers.findMany({
      where: eq(familyMembers.familyId, session.familyId),
      columns: { id: true },
    });

    const memberIds = members.map((m) => m.id);

    let workoutSessionsCount = { count: 0 };
    let goalsCount = { count: 0 };

    if (memberIds.length > 0) {
      [workoutSessionsCount] = await db
        .select({ count: count() })
        .from(workoutSessions)
        .where(inArray(workoutSessions.memberId, memberIds));

      [goalsCount] = await db
        .select({ count: count() })
        .from(goals)
        .where(inArray(goals.memberId, memberIds));
    }

    return NextResponse.json({
      members: membersCount.count,
      exercises: exercisesCount.count,
      workoutPlans: workoutPlansCount.count,
      workoutSessions: workoutSessionsCount.count,
      goals: goalsCount.count,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
