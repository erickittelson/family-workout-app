import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { exercises } from "@/lib/db/schema";
import { eq, ilike, or, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const muscleGroup = searchParams.get("muscleGroup");
    const difficulty = searchParams.get("difficulty");
    const equipment = searchParams.get("equipment");

    let query = db.select().from(exercises);

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(exercises.name, `%${search}%`),
          ilike(exercises.description, `%${search}%`)
        )
      );
    }

    if (category) {
      conditions.push(eq(exercises.category, category));
    }

    if (difficulty) {
      conditions.push(eq(exercises.difficulty, difficulty));
    }

    if (muscleGroup) {
      conditions.push(
        sql`${exercises.muscleGroups}::jsonb ? ${muscleGroup}`
      );
    }

    if (equipment) {
      conditions.push(
        sql`${exercises.equipment}::jsonb ? ${equipment}`
      );
    }

    const results = conditions.length > 0
      ? await db.select().from(exercises).where(sql`${conditions.map(c => sql`(${c})`).reduce((a, b) => sql`${a} AND ${b}`)}`)
      : await db.select().from(exercises);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching exercises:", error);
    return NextResponse.json(
      { error: "Failed to fetch exercises" },
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
    const {
      name,
      description,
      instructions,
      category,
      muscleGroups,
      equipment,
      difficulty,
      videoUrl,
      imageUrl,
      createdByMemberId,
    } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "Name and category are required" },
        { status: 400 }
      );
    }

    const [exercise] = await db
      .insert(exercises)
      .values({
        name,
        description,
        instructions,
        category,
        muscleGroups,
        equipment,
        difficulty,
        videoUrl,
        imageUrl,
        isCustom: true,
        createdByMemberId,
      })
      .returning();

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("Error creating exercise:", error);
    return NextResponse.json(
      { error: "Failed to create exercise" },
      { status: 500 }
    );
  }
}
