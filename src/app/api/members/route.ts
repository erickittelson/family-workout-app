import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { familyMembers, memberMetrics } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const members = await db.query.familyMembers.findMany({
      where: eq(familyMembers.familyId, session.familyId),
      with: {
        metrics: {
          orderBy: (metrics, { desc }) => [desc(metrics.date)],
          limit: 1,
        },
      },
    });

    const formattedMembers = members.map((member) => ({
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      dateOfBirth: member.dateOfBirth?.toISOString().split("T")[0],
      gender: member.gender,
      latestMetrics: member.metrics[0]
        ? {
            weight: member.metrics[0].weight,
            height: member.metrics[0].height,
            bodyFatPercentage: member.metrics[0].bodyFatPercentage,
            fitnessLevel: member.metrics[0].fitnessLevel,
          }
        : null,
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
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, dateOfBirth, gender, metrics } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Create the member
    const [member] = await db
      .insert(familyMembers)
      .values({
        familyId: session.familyId,
        name,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
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
