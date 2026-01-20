import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circleMembers, memberMetrics } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// PUT - Update a specific metric entry
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: memberId } = await params;
    const body = await request.json();
    const { metricId, date, weight, height, bodyFatPercentage, fitnessLevel, notes } = body;

    if (!metricId) {
      return NextResponse.json({ error: "Metric ID required" }, { status: 400 });
    }

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, memberId),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Verify metric belongs to this member
    const metric = await db.query.memberMetrics.findFirst({
      where: and(
        eq(memberMetrics.id, metricId),
        eq(memberMetrics.memberId, memberId)
      ),
    });

    if (!metric) {
      return NextResponse.json({ error: "Metric not found" }, { status: 404 });
    }

    // Update the metric
    await db
      .update(memberMetrics)
      .set({
        date: date ? new Date(date) : undefined,
        weight: weight !== undefined ? weight : undefined,
        height: height !== undefined ? height : undefined,
        bodyFatPercentage: bodyFatPercentage !== undefined ? bodyFatPercentage : undefined,
        fitnessLevel: fitnessLevel !== undefined ? fitnessLevel : undefined,
        notes: notes !== undefined ? notes : undefined,
      })
      .where(eq(memberMetrics.id, metricId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating metric:", error);
    return NextResponse.json(
      { error: "Failed to update metric" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific metric entry
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: memberId } = await params;
    const { searchParams } = new URL(request.url);
    const metricId = searchParams.get("metricId");

    if (!metricId) {
      return NextResponse.json({ error: "Metric ID required" }, { status: 400 });
    }

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, memberId),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Verify metric belongs to this member
    const metric = await db.query.memberMetrics.findFirst({
      where: and(
        eq(memberMetrics.id, metricId),
        eq(memberMetrics.memberId, memberId)
      ),
    });

    if (!metric) {
      return NextResponse.json({ error: "Metric not found" }, { status: 404 });
    }

    // Delete the metric
    await db.delete(memberMetrics).where(eq(memberMetrics.id, metricId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting metric:", error);
    return NextResponse.json(
      { error: "Failed to delete metric" },
      { status: 500 }
    );
  }
}
