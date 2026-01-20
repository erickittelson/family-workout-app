import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circleMembers, memberMetrics, memberLimitations, goals, personalRecords, memberSkills } from "@/lib/db/schema";
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

    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
      with: {
        metrics: {
          orderBy: (metrics, { desc }) => [desc(metrics.date)],
        },
        limitations: {
          where: eq(memberLimitations.active, true),
        },
        goals: true,
        personalRecords: {
          with: {
            exercise: true,
          },
          orderBy: (pr, { desc }) => [desc(pr.date)],
        },
        skills: {
          orderBy: (skills, { desc }) => [desc(skills.createdAt)],
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: member.id,
      name: member.name,
      profilePicture: member.profilePicture,
      dateOfBirth: member.dateOfBirth?.toISOString().split("T")[0],
      gender: member.gender,
      role: member.role,
      metrics: member.metrics,
      limitations: member.limitations,
      goals: member.goals,
      personalRecords: member.personalRecords,
      skills: member.skills,
    });
  } catch (error) {
    console.error("Error fetching member:", error);
    return NextResponse.json(
      { error: "Failed to fetch member" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const { name, dateOfBirth, gender, metrics, profilePicture } = body;

    // Verify member belongs to this circle
    const existingMember = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Update member
    await db
      .update(circleMembers)
      .set({
        name,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        profilePicture,
        updatedAt: new Date(),
      })
      .where(eq(circleMembers.id, id));

    // Add new metrics entry if provided
    if (metrics && (metrics.weight || metrics.height || metrics.bodyFatPercentage || metrics.fitnessLevel)) {
      await db.insert(memberMetrics).values({
        memberId: id,
        weight: metrics.weight,
        height: metrics.height,
        bodyFatPercentage: metrics.bodyFatPercentage,
        fitnessLevel: metrics.fitnessLevel,
        notes: metrics.notes,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
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

    // Verify member belongs to this circle
    const existingMember = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, id),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Delete member (cascade will handle related records)
    await db.delete(circleMembers).where(eq(circleMembers.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting member:", error);
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 }
    );
  }
}
