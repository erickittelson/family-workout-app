import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { auth } from "@/lib/auth";
import { getMemberContext, buildSystemPrompt } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages, memberId } = await request.json();

    if (!memberId) {
      return new Response("Member ID is required", { status: 400 });
    }

    // Get member context for personalized responses
    const context = await getMemberContext(memberId);
    const systemPrompt = buildSystemPrompt(context);

    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in AI chat:", error);
    return new Response("Failed to process request", { status: 500 });
  }
}
