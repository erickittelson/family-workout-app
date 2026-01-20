import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circleEquipment } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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
    const { name, category, description, quantity, brand, model } = body;

    // Verify equipment belongs to this circle
    const existing = await db.query.circleEquipment.findFirst({
      where: and(
        eq(circleEquipment.id, id),
        eq(circleEquipment.circleId, session.circleId)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(circleEquipment)
      .set({
        name,
        category,
        description,
        quantity,
        brand,
        model,
      })
      .where(eq(circleEquipment.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating equipment:", error);
    return NextResponse.json(
      { error: "Failed to update equipment" },
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

    // Verify equipment belongs to this circle
    const existing = await db.query.circleEquipment.findFirst({
      where: and(
        eq(circleEquipment.id, id),
        eq(circleEquipment.circleId, session.circleId)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    await db.delete(circleEquipment).where(eq(circleEquipment.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting equipment:", error);
    return NextResponse.json(
      { error: "Failed to delete equipment" },
      { status: 500 }
    );
  }
}
