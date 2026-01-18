import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { exercises } from "@/lib/db/schema";
import { seedExercises } from "@/lib/db/seed-exercises";
import { count } from "drizzle-orm";

export async function POST() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if exercises already exist
    const [existingCount] = await db.select({ count: count() }).from(exercises);

    if (existingCount.count > 0) {
      return NextResponse.json({
        message: "Exercises already seeded",
        count: existingCount.count,
      });
    }

    // Seed exercises
    await db.insert(exercises).values(seedExercises);

    return NextResponse.json({
      message: "Exercises seeded successfully",
      count: seedExercises.length,
    });
  } catch (error) {
    console.error("Error seeding exercises:", error);
    return NextResponse.json(
      { error: "Failed to seed exercises" },
      { status: 500 }
    );
  }
}
