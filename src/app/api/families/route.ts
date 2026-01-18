import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { families } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, passkey } = body;

    if (!name || !passkey) {
      return NextResponse.json(
        { error: "Family name and passkey are required" },
        { status: 400 }
      );
    }

    if (passkey.length < 4) {
      return NextResponse.json(
        { error: "Passkey must be at least 4 characters" },
        { status: 400 }
      );
    }

    // Check if family name already exists
    const existing = await db.query.families.findFirst({
      where: eq(families.name, name),
    });

    if (existing) {
      return NextResponse.json(
        { error: "A family with this name already exists" },
        { status: 400 }
      );
    }

    // Create the family
    const [family] = await db
      .insert(families)
      .values({
        name,
        passkey, // In production, hash this with bcrypt
      })
      .returning();

    return NextResponse.json({ id: family.id, name: family.name });
  } catch (error) {
    console.error("Error creating family:", error);
    return NextResponse.json(
      { error: "Failed to create family" },
      { status: 500 }
    );
  }
}
