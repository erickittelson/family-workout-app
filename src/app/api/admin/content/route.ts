/**
 * Admin Content Management API
 * 
 * GET - List content by type (challenges, workouts, programs)
 * POST - Create official content
 * 
 * Requires: User must be owner/admin of a system circle
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { circles, challenges, workoutPlans, communityPrograms, contentReports } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// Check if user has admin access (owner/admin of system circle)
async function checkAdminAccess(session: any): Promise<boolean> {
  if (!session?.activeCircle) return false;
  
  // Check if user's active circle is a system circle
  const circle = await db.query.circles.findFirst({
    where: and(
      eq(circles.id, session.activeCircle.id),
      eq(circles.isSystemCircle, true)
    ),
  });
  
  if (!circle) return false;
  
  // Check role
  return session.activeCircle.role === "owner" || session.activeCircle.role === "admin";
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await checkAdminAccess(session);
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "challenges";
    const status = searchParams.get("status"); // official, featured, all

    let data: any[] = [];

    if (type === "challenges") {
      const query = db.query.challenges.findMany({
        orderBy: (c, { desc }) => [desc(c.createdAt)],
        limit: 100,
      });
      data = await query;
    } else if (type === "workouts") {
      data = await db.query.workoutPlans.findMany({
        where: eq(workoutPlans.isOfficial, true),
        orderBy: (w, { desc }) => [desc(w.createdAt)],
        limit: 100,
      });
    } else if (type === "programs") {
      data = await db.query.communityPrograms.findMany({
        orderBy: (p, { desc }) => [desc(p.createdAt)],
        limit: 100,
      });
    } else if (type === "reports") {
      data = await db.query.contentReports.findMany({
        where: status === "pending" ? eq(contentReports.status, "pending") : undefined,
        orderBy: (r, { desc }) => [desc(r.createdAt)],
        limit: 100,
      });
    }

    // Get counts for dashboard
    const [challengeCount] = await db.select({ count: sql<number>`count(*)` }).from(challenges);
    const [programCount] = await db.select({ count: sql<number>`count(*)` }).from(communityPrograms);
    const [reportCount] = await db.select({ count: sql<number>`count(*)` }).from(contentReports).where(eq(contentReports.status, "pending"));

    return NextResponse.json({
      data,
      counts: {
        challenges: Number(challengeCount?.count || 0),
        programs: Number(programCount?.count || 0),
        pendingReports: Number(reportCount?.count || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching admin content:", error);
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    );
  }
}
