import { NextResponse } from "next/server";
import { switchCircle, getSession } from "@/lib/neon-auth";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { circleId } = body;

    if (!circleId) {
      return NextResponse.json({ error: "Circle ID required" }, { status: 400 });
    }

    const success = await switchCircle(circleId);

    if (!success) {
      return NextResponse.json(
        { error: "You don't have access to this circle" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error switching circle:", error);
    return NextResponse.json(
      { error: "Failed to switch circle" },
      { status: 500 }
    );
  }
}
