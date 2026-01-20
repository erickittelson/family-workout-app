import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { goals, circleMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

    // Get the goal and verify ownership
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, id),
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

    const updates: Record<string, any> = { updatedAt: new Date() };

    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === "completed") {
        updates.completedAt = new Date();
      } else if (body.status === "active") {
        updates.completedAt = null;
      }
    }

    if (body.currentValue !== undefined) {
      updates.currentValue = body.currentValue;
    }

    if (body.title !== undefined) {
      updates.title = body.title;
    }

    if (body.description !== undefined) {
      updates.description = body.description;
    }

    if (body.category !== undefined) {
      updates.category = body.category;
    }

    if (body.targetValue !== undefined) {
      updates.targetValue = body.targetValue;
    }

    if (body.targetUnit !== undefined) {
      updates.targetUnit = body.targetUnit;
    }

    if (body.targetDate !== undefined) {
      updates.targetDate = body.targetDate ? new Date(body.targetDate) : null;
    }

    await db.update(goals).set(updates).where(eq(goals.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating goal:", error);
    return NextResponse.json(
      { error: "Failed to update goal" },
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

    // Get the goal and verify ownership
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, id),
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

    await db.delete(goals).where(eq(goals.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting goal:", error);
    return NextResponse.json(
      { error: "Failed to delete goal" },
      { status: 500 }
    );
  }
}
