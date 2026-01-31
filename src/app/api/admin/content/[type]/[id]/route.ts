/**
 * Admin Content Item Management API
 * 
 * PUT - Update content (mark as official, featured, edit details)
 * DELETE - Soft delete / archive content
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { circles, challenges, workoutPlans, communityPrograms, contentReports } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Check if user has admin access (owner/admin of system circle)
async function checkAdminAccess(session: any): Promise<boolean> {
  if (!session?.activeCircle) return false;
  
  const circle = await db.query.circles.findFirst({
    where: and(
      eq(circles.id, session.activeCircle.id),
      eq(circles.isSystemCircle, true)
    ),
  });
  
  if (!circle) return false;
  return session.activeCircle.role === "owner" || session.activeCircle.role === "admin";
}

const updateChallengeSchema = z.object({
  isOfficial: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  visibility: z.enum(["public", "private", "circle"]).optional(),
});

const updateProgramSchema = z.object({
  isOfficial: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

const resolveReportSchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
  resolutionNotes: z.string().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await checkAdminAccess(session);
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { type, id } = await params;
    const body = await request.json();

    if (type === "challenges") {
      const validation = updateChallengeSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ error: validation.error.message }, { status: 400 });
      }

      const [updated] = await db
        .update(challenges)
        .set({
          ...validation.data,
          updatedAt: new Date(),
        })
        .where(eq(challenges.id, id))
        .returning();

      return NextResponse.json({ success: true, data: updated });
    } else if (type === "programs") {
      const validation = updateProgramSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ error: validation.error.message }, { status: 400 });
      }

      const [updated] = await db
        .update(communityPrograms)
        .set({
          ...validation.data,
          updatedAt: new Date(),
        })
        .where(eq(communityPrograms.id, id))
        .returning();

      return NextResponse.json({ success: true, data: updated });
    } else if (type === "workouts") {
      const [updated] = await db
        .update(workoutPlans)
        .set({
          isOfficial: body.isOfficial,
          updatedAt: new Date(),
        })
        .where(eq(workoutPlans.id, id))
        .returning();

      return NextResponse.json({ success: true, data: updated });
    } else if (type === "reports") {
      const validation = resolveReportSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ error: validation.error.message }, { status: 400 });
      }

      const [updated] = await db
        .update(contentReports)
        .set({
          status: validation.data.status,
          resolutionNotes: validation.data.resolutionNotes,
          resolvedAt: new Date(),
          resolvedBy: session.user.id,
        })
        .where(eq(contentReports.id, id))
        .returning();

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
  } catch (error) {
    console.error("Error updating content:", error);
    return NextResponse.json(
      { error: "Failed to update content" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await checkAdminAccess(session);
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { type, id } = await params;

    // Soft delete by setting visibility to private
    if (type === "challenges") {
      await db
        .update(challenges)
        .set({ visibility: "private", updatedAt: new Date() })
        .where(eq(challenges.id, id));
    } else if (type === "programs") {
      await db
        .update(communityPrograms)
        .set({ visibility: "private", updatedAt: new Date() })
        .where(eq(communityPrograms.id, id));
    }

    return NextResponse.json({ success: true, message: "Content archived" });
  } catch (error) {
    console.error("Error deleting content:", error);
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 500 }
    );
  }
}
