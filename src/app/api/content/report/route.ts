/**
 * Content Report API
 * 
 * POST - Report inappropriate content for moderation
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { contentReports } from "@/lib/db/schema";

const reportSchema = z.object({
  contentType: z.enum(["challenge", "workout", "program", "comment", "circle"]),
  contentId: z.string().uuid(),
  reason: z.enum(["inappropriate", "spam", "harassment", "copyright", "misinformation", "other"]),
  details: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = reportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { contentType, contentId, reason, details } = validation.data;

    // Create the report
    const [report] = await db
      .insert(contentReports)
      .values({
        reporterId: session.user.id,
        contentType,
        contentId,
        reason,
        details: details || null,
        status: "pending",
      })
      .returning();

    return NextResponse.json({
      success: true,
      reportId: report.id,
      message: "Report submitted successfully. Thank you for helping keep our community safe.",
    });
  } catch (error) {
    console.error("Error creating content report:", error);
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 }
    );
  }
}
