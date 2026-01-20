import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { circleMembers, memberMetrics, memberLimitations } from "@/lib/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.activeCircle) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const circleId = session.activeCircle.id;

    // Check for specific member IDs filter
    const { searchParams } = new URL(request.url);
    const memberIds = searchParams.getAll("ids");

    // Build where clause - always filter by circle, optionally by specific IDs
    const whereClause = memberIds.length > 0
      ? and(
          eq(circleMembers.circleId, circleId),
          inArray(circleMembers.id, memberIds)
        )
      : eq(circleMembers.circleId, circleId);

    const members = await db.query.circleMembers.findMany({
      where: whereClause,
      with: {
        metrics: {
          orderBy: (metrics, { desc }) => [desc(metrics.date)],
          limit: 1,
        },
        limitations: {
          where: eq(memberLimitations.active, true),
        },
        goals: true,
      },
    });

    const formattedMembers = members.map((member) => ({
      id: member.id,
      name: member.name,
      profilePicture: member.profilePicture,
      dateOfBirth: member.dateOfBirth?.toISOString().split("T")[0],
      gender: member.gender,
      role: member.role,
      latestMetrics: member.metrics[0]
        ? {
            weight: member.metrics[0].weight,
            height: member.metrics[0].height,
            bodyFatPercentage: member.metrics[0].bodyFatPercentage,
            fitnessLevel: member.metrics[0].fitnessLevel,
          }
        : null,
      limitations: member.limitations.map((l) => ({
        id: l.id,
        type: l.type,
        description: l.description,
        affectedAreas: l.affectedAreas,
        severity: l.severity,
        active: l.active,
      })),
      goals: member.goals.map((g) => ({
        id: g.id,
        title: g.title,
        category: g.category,
        status: g.status,
      })),
    }));

    return NextResponse.json(formattedMembers);
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.activeCircle) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, dateOfBirth, gender, metrics, profilePicture } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Create the member
    const [member] = await db
      .insert(circleMembers)
      .values({
        circleId: session.activeCircle.id,
        name,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        profilePicture,
      })
      .returning();

    // Create initial metrics if provided
    if (metrics && (metrics.weight || metrics.height || metrics.bodyFatPercentage || metrics.fitnessLevel)) {
      await db.insert(memberMetrics).values({
        memberId: member.id,
        weight: metrics.weight,
        height: metrics.height,
        bodyFatPercentage: metrics.bodyFatPercentage,
        fitnessLevel: metrics.fitnessLevel,
        notes: metrics.notes,
      });
    }

    return NextResponse.json({
      id: member.id,
      name: member.name,
    });
  } catch (error) {
    console.error("Error creating member:", error);
    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 }
    );
  }
}
