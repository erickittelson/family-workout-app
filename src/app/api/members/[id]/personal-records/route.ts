import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circleMembers, personalRecords, exercises } from "@/lib/db/schema";
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

    const records = await db.query.personalRecords.findMany({
      where: eq(personalRecords.memberId, id),
      orderBy: [desc(personalRecords.date)],
      with: {
        exercise: true,
      },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("Error fetching personal records:", error);
    return NextResponse.json(
      { error: "Failed to fetch personal records" },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const { exerciseId, exerciseName, value, unit, repMax, date, notes, recordType } = body;

    if ((!exerciseId && !exerciseName) || value === undefined || !unit) {
      return NextResponse.json(
        { error: "Exercise (id or name), value, and unit are required" },
        { status: 400 }
      );
    }

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

    // If exerciseName provided instead of ID, look up or create the exercise
    let finalExerciseId = exerciseId;
    if (!exerciseId && exerciseName) {
      const existingExercise = await db.query.exercises.findFirst({
        where: eq(exercises.name, exerciseName),
      });

      if (existingExercise) {
        finalExerciseId = existingExercise.id;
      } else {
        // Create the exercise (for custom exercises like "Mile Run", "400m Run", etc.)
        const category = exerciseName.toLowerCase().includes("run") ? "cardio" : "strength";
        const [newExercise] = await db
          .insert(exercises)
          .values({
            name: exerciseName,
            category,
            isCustom: true,
          })
          .returning();
        finalExerciseId = newExercise.id;
      }
    }

    const [record] = await db
      .insert(personalRecords)
      .values({
        memberId: id,
        exerciseId: finalExerciseId,
        value,
        unit,
        repMax: repMax || 1,
        date: date ? new Date(date) : new Date(),
        notes,
        recordType: recordType || "current",
      })
      .returning();

    // Fetch with exercise relation
    const recordWithExercise = await db.query.personalRecords.findFirst({
      where: eq(personalRecords.id, record.id),
      with: {
        exercise: true,
      },
    });

    return NextResponse.json(recordWithExercise);
  } catch (error) {
    console.error("Error creating personal record:", error);
    return NextResponse.json(
      { error: "Failed to create personal record" },
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
    const { recordId, value, unit, repMax, date, notes, recordType } = body;

    if (!recordId) {
      return NextResponse.json({ error: "Record ID required" }, { status: 400 });
    }

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

    const updateData: Record<string, unknown> = {};
    if (value !== undefined) updateData.value = value;
    if (unit !== undefined) updateData.unit = unit;
    if (repMax !== undefined) updateData.repMax = repMax;
    if (date !== undefined) updateData.date = new Date(date);
    if (notes !== undefined) updateData.notes = notes;
    if (recordType !== undefined) updateData.recordType = recordType;

    await db
      .update(personalRecords)
      .set(updateData)
      .where(
        and(
          eq(personalRecords.id, recordId),
          eq(personalRecords.memberId, id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating personal record:", error);
    return NextResponse.json(
      { error: "Failed to update personal record" },
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
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get("recordId");

    if (!recordId) {
      return NextResponse.json({ error: "Record ID required" }, { status: 400 });
    }

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

    await db
      .delete(personalRecords)
      .where(
        and(
          eq(personalRecords.id, recordId),
          eq(personalRecords.memberId, id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting personal record:", error);
    return NextResponse.json(
      { error: "Failed to delete personal record" },
      { status: 500 }
    );
  }
}
