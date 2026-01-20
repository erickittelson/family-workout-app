import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { circleInvitations, circleMembers } from "@/lib/db/schema";
import { getSession } from "@/lib/neon-auth";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Generate a short, readable invite code
 */
function generateInviteCode(): string {
  return nanoid(8).toUpperCase();
}

/**
 * POST /api/circles/invite
 * Create a new circle invitation
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.activeCircle) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to invite (owner or admin)
    if (!["owner", "admin"].includes(session.activeCircle.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can create invitations" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role = "member", maxUses, expiresInDays } = body;

    // Validate role
    if (!["member", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'member' or 'admin'" },
        { status: 400 }
      );
    }

    // Calculate expiration date if provided
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Generate unique invite code
    let code = generateInviteCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db.query.circleInvitations.findFirst({
        where: eq(circleInvitations.code, code),
      });
      if (!existing) break;
      code = generateInviteCode();
      attempts++;
    }

    // Create invitation
    const [invitation] = await db
      .insert(circleInvitations)
      .values({
        circleId: session.activeCircle.id,
        code,
        createdBy: session.activeCircle.memberId,
        email: email || null,
        role,
        maxUses: maxUses || null,
        expiresAt,
      })
      .returning();

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/invite/${code}`;

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        code: invitation.code,
        url: inviteUrl,
        role: invitation.role,
        maxUses: invitation.maxUses,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("Failed to create invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/circles/invite
 * List all invitations for the current circle
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.activeCircle) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view invitations
    if (!["owner", "admin"].includes(session.activeCircle.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can view invitations" },
        { status: 403 }
      );
    }

    const invitations = await db.query.circleInvitations.findMany({
      where: eq(circleInvitations.circleId, session.activeCircle.id),
      orderBy: (inv, { desc }) => [desc(inv.createdAt)],
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        code: inv.code,
        url: `${baseUrl}/invite/${inv.code}`,
        email: inv.email,
        role: inv.role,
        maxUses: inv.maxUses,
        uses: inv.uses,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        isExpired: inv.expiresAt ? new Date(inv.expiresAt) < new Date() : false,
        isMaxedOut: inv.maxUses ? inv.uses >= inv.maxUses : false,
      })),
    });
  } catch (error) {
    console.error("Failed to list invitations:", error);
    return NextResponse.json(
      { error: "Failed to list invitations" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/circles/invite
 * Delete an invitation
 */
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session?.activeCircle) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["owner", "admin"].includes(session.activeCircle.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can delete invitations" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("id");

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    await db
      .delete(circleInvitations)
      .where(
        and(
          eq(circleInvitations.id, invitationId),
          eq(circleInvitations.circleId, session.activeCircle.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete invitation:", error);
    return NextResponse.json(
      { error: "Failed to delete invitation" },
      { status: 500 }
    );
  }
}
