import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { milestones, goals, circleMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

    const milestone = await db.query.milestones.findFirst({
      where: eq(milestones.id, id),
      with: {
        goal: {
          with: {
            member: true,
          },
        },
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    if (milestone.goal.member.circleId !== session.circleId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(milestone);
  } catch (error) {
    console.error("Error fetching milestone:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestone" },
      { status: 500 }
    );
  }
}

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

    // Get the milestone and verify ownership
    const milestone = await db.query.milestones.findFirst({
      where: eq(milestones.id, id),
      with: {
        goal: {
          with: {
            member: true,
          },
        },
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    if (milestone.goal.member.circleId !== session.circleId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === "completed") {
        updates.completedAt = new Date();
      } else {
        updates.completedAt = null;
      }
    }

    if (body.title !== undefined) {
      updates.title = body.title;
    }

    if (body.description !== undefined) {
      updates.description = body.description;
    }

    if (body.targetValue !== undefined) {
      updates.targetValue = body.targetValue;
    }

    if (body.targetDate !== undefined) {
      updates.targetDate = body.targetDate ? new Date(body.targetDate) : null;
    }

    await db.update(milestones).set(updates).where(eq(milestones.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating milestone:", error);
    return NextResponse.json(
      { error: "Failed to update milestone" },
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

    // Get the milestone and verify ownership
    const milestone = await db.query.milestones.findFirst({
      where: eq(milestones.id, id),
      with: {
        goal: {
          with: {
            member: true,
          },
        },
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    if (milestone.goal.member.circleId !== session.circleId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.delete(milestones).where(eq(milestones.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting milestone:", error);
    return NextResponse.json(
      { error: "Failed to delete milestone" },
      { status: 500 }
    );
  }
}
