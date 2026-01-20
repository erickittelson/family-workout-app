import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { exercises } from "@/lib/db/schema";
import { eq, ilike, or, sql, asc, desc, and } from "drizzle-orm";

// Top compound exercises to prioritize
const PRIORITY_EXERCISES = [
  "squat", "deadlift", "bench press", "overhead press", "barbell row",
  "pull-up", "chin-up", "dip", "lunge", "hip thrust", "romanian deadlift",
  "front squat", "incline bench press", "pendlay row", "push-up",
  "clean", "snatch", "thruster", "kettlebell swing", "farmer's walk"
];

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
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const sortBy = searchParams.get("sortBy"); // name, category, mechanic, priority

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

    // Build where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine ordering
    const orderClause = sortBy === "name"
      ? [asc(exercises.name)]
      : sortBy === "category"
      ? [asc(exercises.category), asc(exercises.name)]
      : [sql`CASE WHEN ${exercises.mechanic} = 'compound' THEN 0 ELSE 1 END`, asc(exercises.name)];

    // Build and execute query
    const query = db.select().from(exercises);

    const results = await (whereClause
      ? query.where(whereClause).orderBy(...orderClause).limit(limit ? parseInt(limit) : 1000).offset(offset ? parseInt(offset) : 0)
      : query.orderBy(...orderClause).limit(limit ? parseInt(limit) : 1000).offset(offset ? parseInt(offset) : 0));

    // Sort priority exercises to top if no specific sort requested
    if (!sortBy) {
      results.sort((a, b) => {
        const aIsPriority = PRIORITY_EXERCISES.some(p =>
          a.name.toLowerCase().includes(p)
        );
        const bIsPriority = PRIORITY_EXERCISES.some(p =>
          b.name.toLowerCase().includes(p)
        );

        if (aIsPriority && !bIsPriority) return -1;
        if (!aIsPriority && bIsPriority) return 1;

        // Compound before isolation
        if (a.mechanic === 'compound' && b.mechanic !== 'compound') return -1;
        if (a.mechanic !== 'compound' && b.mechanic === 'compound') return 1;

        return a.name.localeCompare(b.name);
      });
    }

    return NextResponse.json(results, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
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
      secondaryMuscles,
      equipment,
      difficulty,
      force,
      mechanic,
      benefits,
      progressions,
      videoUrl,
      imageUrl,
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
        secondaryMuscles,
        equipment,
        difficulty,
        force,
        mechanic,
        benefits,
        progressions,
        videoUrl,
        imageUrl,
        isCustom: true,
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
