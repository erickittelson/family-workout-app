/**
 * Handle API
 * 
 * Manages user handles (unique usernames) for profile sharing.
 * - POST: Set or update the user's handle
 * - GET: Check if a handle is available (via ?check=handle query param)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { 
  validateHandle, 
  normalizeHandle, 
  suggestAlternativeHandles 
} from "@/lib/validations/handle";

/**
 * GET /api/user/handle?check=somehandle
 * Check if a handle is available
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const handleToCheck = searchParams.get("check");

    if (!handleToCheck) {
      return NextResponse.json(
        { error: "Missing 'check' query parameter" },
        { status: 400 }
      );
    }

    const normalizedHandle = normalizeHandle(handleToCheck);

    // Validate format, profanity, and reserved words
    const validation = validateHandle(normalizedHandle);
    if (!validation.valid) {
      return NextResponse.json({
        available: false,
        error: validation.error,
        errorType: validation.errorType,
      });
    }

    // Check if handle is already taken
    const existing = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(sql`LOWER(${userProfiles.handle})`, normalizedHandle))
      .limit(1);

    if (existing.length > 0) {
      // Get session to check if it's the user's own handle
      const session = await getSession();
      if (session) {
        const ownProfile = await db
          .select({ handle: userProfiles.handle })
          .from(userProfiles)
          .where(eq(userProfiles.userId, session.user.id))
          .limit(1);

        if (ownProfile[0]?.handle?.toLowerCase() === normalizedHandle) {
          // User is checking their own current handle
          return NextResponse.json({
            available: true,
            isOwn: true,
          });
        }
      }

      return NextResponse.json({
        available: false,
        error: "This handle is already taken",
        errorType: "taken",
        suggestions: suggestAlternativeHandles(normalizedHandle),
      });
    }

    return NextResponse.json({
      available: true,
    });
  } catch (error) {
    console.error("Error checking handle:", error);
    return NextResponse.json(
      { error: "Failed to check handle availability" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/handle
 * Set or update the user's handle
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { handle } = body;

    if (!handle || typeof handle !== "string") {
      return NextResponse.json(
        { error: "Handle is required" },
        { status: 400 }
      );
    }

    const normalizedHandle = normalizeHandle(handle);

    // Validate format, profanity, and reserved words
    const validation = validateHandle(normalizedHandle);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: validation.error,
          errorType: validation.errorType,
        },
        { status: 400 }
      );
    }

    // Check if handle is already taken by another user
    const existing = await db
      .select({ id: userProfiles.id, userId: userProfiles.userId })
      .from(userProfiles)
      .where(
        and(
          eq(sql`LOWER(${userProfiles.handle})`, normalizedHandle),
          ne(userProfiles.userId, session.user.id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: "This handle is already taken",
          errorType: "taken",
          suggestions: suggestAlternativeHandles(normalizedHandle),
        },
        { status: 409 }
      );
    }

    // Update or create the user's profile with the handle
    await db
      .insert(userProfiles)
      .values({
        userId: session.user.id,
        handle: normalizedHandle,
      })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          handle: normalizedHandle,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      success: true,
      handle: normalizedHandle,
      profileUrl: `/@${normalizedHandle}`,
    });
  } catch (error) {
    console.error("Error setting handle:", error);
    return NextResponse.json(
      { error: "Failed to set handle" },
      { status: 500 }
    );
  }
}
