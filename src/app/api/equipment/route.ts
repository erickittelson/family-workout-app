import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circleEquipment } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const equipment = await db.query.circleEquipment.findMany({
      where: eq(circleEquipment.circleId, session.circleId),
      orderBy: (eq, { asc }) => [asc(eq.category), asc(eq.name)],
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
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
    const { name, category, description, quantity, brand, model } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "Name and category are required" },
        { status: 400 }
      );
    }

    const [item] = await db
      .insert(circleEquipment)
      .values({
        circleId: session.circleId,
        name,
        category,
        description,
        quantity: quantity || 1,
        brand,
        model,
      })
      .returning();

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error adding equipment:", error);
    return NextResponse.json(
      { error: "Failed to add equipment" },
      { status: 500 }
    );
  }
}
