import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { families } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const family = await db.query.families.findFirst({
      where: eq(families.id, session.familyId),
      columns: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    return NextResponse.json(family);
  } catch (error) {
    console.error("Error fetching family:", error);
    return NextResponse.json(
      { error: "Failed to fetch family" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, passkey } = body;

    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name) {
      updates.name = name;
    }

    if (passkey) {
      if (passkey.length < 4) {
        return NextResponse.json(
          { error: "Passkey must be at least 4 characters" },
          { status: 400 }
        );
      }
      updates.passkey = passkey; // In production, hash this
    }

    await db
      .update(families)
      .set(updates)
      .where(eq(families.id, session.familyId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating family:", error);
    return NextResponse.json(
      { error: "Failed to update family" },
      { status: 500 }
    );
  }
}
