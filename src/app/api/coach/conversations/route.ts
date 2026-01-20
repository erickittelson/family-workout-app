import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { coachConversations, coachMessages, circleMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET - List conversations for a member
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const mode = searchParams.get("mode");
    const status = searchParams.get("status") || "active";
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!memberId) {
      return NextResponse.json({ error: "Member ID required" }, { status: 400 });
    }

    // Verify member belongs to circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, memberId),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Build query
    const conversations = await db.query.coachConversations.findMany({
      where: and(
        eq(coachConversations.memberId, memberId),
        mode ? eq(coachConversations.mode, mode) : undefined,
        status !== "all" ? eq(coachConversations.status, status) : undefined
      ),
      with: {
        messages: {
          limit: 1,
          orderBy: [desc(coachMessages.createdAt)],
        },
      },
      orderBy: [desc(coachConversations.lastMessageAt)],
      limit,
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST - Create new conversation
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, mode = "general", initialMessage } = body;

    if (!memberId) {
      return NextResponse.json({ error: "Member ID required" }, { status: 400 });
    }

    // Verify member belongs to circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, memberId),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Create conversation
    const [conversation] = await db
      .insert(coachConversations)
      .values({
        memberId,
        mode,
        context: initialMessage ? { initialTopic: initialMessage } : undefined,
      })
      .returning();

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
