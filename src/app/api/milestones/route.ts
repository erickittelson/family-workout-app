import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { milestones, goals, circleMembers } from "@/lib/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get("goalId");
    const status = searchParams.get("status");

    // Get member IDs for this circle
    const members = await db.query.circleMembers.findMany({
      where: eq(circleMembers.circleId, session.circleId),
      columns: { id: true },
    });
    const memberIds = members.map((m) => m.id);

    if (memberIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get goals for these members
    const memberGoals = await db.query.goals.findMany({
      where: inArray(goals.memberId, memberIds),
      columns: { id: true },
    });
    const goalIds = memberGoals.map((g) => g.id);

    if (goalIds.length === 0) {
      return NextResponse.json([]);
    }

    // Build query conditions
    let whereClause = inArray(milestones.goalId, goalIds);

    if (goalId) {
      if (!goalIds.includes(goalId)) {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      }
      whereClause = eq(milestones.goalId, goalId);
    }

    const allMilestones = await db.query.milestones.findMany({
      where: whereClause,
      orderBy: [desc(milestones.createdAt)],
      with: {
        goal: {
          columns: {
            id: true,
            title: true,
            targetUnit: true,
          },
        },
      },
    });

    // Filter by status if provided
    const filtered = status
      ? allMilestones.filter((m) => m.status === status)
      : allMilestones;

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error fetching milestones:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestones" },
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
    const { goalId, title, description, targetValue, targetDate, order } = body;

    if (!goalId || !title) {
      return NextResponse.json(
        { error: "Goal ID and title are required" },
        { status: 400 }
      );
    }

    // Verify goal belongs to this circle
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
      with: {
        member: true,
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    if (goal.member.circleId !== session.circleId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current max order for this goal
    const existingMilestones = await db.query.milestones.findMany({
      where: eq(milestones.goalId, goalId),
      columns: { order: true },
    });
    const maxOrder = existingMilestones.length > 0
      ? Math.max(...existingMilestones.map((m) => m.order))
      : -1;

    const [milestone] = await db
      .insert(milestones)
      .values({
        goalId,
        title,
        description: description || null,
        targetValue: targetValue || null,
        targetDate: targetDate ? new Date(targetDate) : null,
        order: order ?? maxOrder + 1,
        aiGenerated: false,
      })
      .returning();

    return NextResponse.json(milestone);
  } catch (error) {
    console.error("Error creating milestone:", error);
    return NextResponse.json(
      { error: "Failed to create milestone" },
      { status: 500 }
    );
  }
}
