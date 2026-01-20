import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circles, circleMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if circle name already exists
    const existing = await db.query.circles.findFirst({
      where: eq(circles.name, name),
    });

    if (existing) {
      return NextResponse.json(
        { error: "A circle with this name already exists" },
        { status: 400 }
      );
    }

    // Create the circle
    const [circle] = await db
      .insert(circles)
      .values({
        name,
        description,
      })
      .returning();

    // Add the creator as owner
    await db.insert(circleMembers).values({
      circleId: circle.id,
      userId: session.user.id,
      name: session.user.name,
      role: "owner",
    });

    return NextResponse.json({ id: circle.id, name: circle.name });
  } catch (error) {
    console.error("Error creating circle:", error);
    return NextResponse.json(
      { error: "Failed to create circle" },
      { status: 500 }
    );
  }
}
