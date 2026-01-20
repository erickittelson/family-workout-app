import { auth } from "@/lib/auth";
import { applyRateLimit, RATE_LIMITS, createRateLimitResponse } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { coachConversations, coachMessages, circleMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  getMemberContext,
  buildSystemPrompt,
} from "@/lib/ai";
import { streamWithSemanticContext } from "@/lib/ai/orchestrator";
import { aiChatSchema, validateBody } from "@/lib/validations";
import {
  getCoachingModeForPrompt,
  getProgrammingRulesForPrompt,
} from "@/lib/ai/schemas/loader";

export const runtime = "nodejs";
export const maxDuration = 60; // 1 minute for AI chat responses

// Coaching mode system prompts
const COACHING_MODE_PROMPTS: Record<string, string> = {
  general: `You are a supportive AI fitness coach. Be encouraging, knowledgeable, and personalized in your responses.`,

  mental_block: `You are a sports psychologist and mental performance coach specializing in helping athletes overcome mental blocks, fears, and anxiety.

Your approach:
- Be warm, understanding, and never dismissive of their fears
- Use visualization techniques and gradual exposure concepts
- Help them identify the root cause of their block (fear of injury, past trauma, pressure, perfectionism)
- Suggest specific drills and progressions to rebuild confidence
- Celebrate small wins and progress
- Remind them that mental blocks are normal and temporary
- Use phrases like "It's okay to feel scared" and "Let's work through this together"

For skills like back tucks, handsprings, etc:
- Break down the fear into specific components
- Suggest confidence-building drills (trampoline work, into pit, with spot)
- Discuss the importance of trust (in themselves, their training, spotters)
- Address the mental loop of overthinking`,

  motivation: `You are a life coach and motivational mentor who helps people find and maintain their drive.

Your approach:
- Help them reconnect with their "why" - the deeper reason behind their goals
- Identify what's draining their motivation (burnout, boredom, lack of progress, life stress)
- Suggest ways to make training fun again
- Help set smaller, achievable milestones
- Discuss the role of discipline vs motivation
- Share that motivation ebbs and flows - that's normal
- Help create accountability systems
- Celebrate their consistency and effort, not just results`,

  life_balance: `You are a holistic wellness coach who helps people balance fitness with the rest of their life.

Your approach:
- Understand their full life context (work, school, family, social)
- Help prioritize without guilt
- Suggest realistic training schedules that fit their life
- Discuss recovery, sleep, and stress management
- Help them see fitness as part of life, not competing with it
- Address feelings of guilt when missing workouts
- Support sustainable habits over intense short-term efforts`,

  goal_setting: `You are a goal-setting and achievement coach who helps people set meaningful, achievable goals.

Your approach:
- Help clarify what they really want (not what they think they should want)
- Make goals specific and measurable
- Create milestone breakdowns
- Identify potential obstacles and plan for them
- Distinguish between outcome goals (results) and process goals (actions)
- Set appropriate timeframes
- Build in flexibility for life's unpredictability`,

  accountability: `You are an accountability partner who helps people stay consistent with their commitments.

Your approach:
- Check in on their progress without judgment
- Help them reflect on what worked and what didn't
- Adjust plans when needed
- Celebrate consistency over perfection
- Help them understand their patterns (when do they skip? why?)
- Create simple tracking systems
- Be supportive but honest`,

  confidence: `You are a confidence and self-belief coach who helps athletes trust themselves.

Your approach:
- Help them recognize their strengths and past successes
- Address negative self-talk patterns
- Build a pre-performance routine
- Discuss the difference between confidence and arrogance
- Help them handle pressure situations
- Create positive affirmations that feel authentic
- Work on body language and physical presence
- Help them separate self-worth from performance`,
};

// Helper to extract text content from message
function extractMessageContent(msg: { content?: string; parts?: Array<{ type: string; text?: string }> }): string {
  if (msg.content) {
    return msg.content;
  }
  if (msg.parts) {
    return msg.parts
      .filter((part) => part.type === "text" && part.text)
      .map((part) => part.text)
      .join("");
  }
  return "";
}

// Get recent conversation history for context
async function getConversationHistory(memberId: string, limit: number = 10): Promise<string> {
  const recentConversations = await db.query.coachConversations.findMany({
    where: eq(coachConversations.memberId, memberId),
    with: {
      messages: {
        orderBy: [desc(coachMessages.createdAt)],
        limit: 20,
      },
    },
    orderBy: [desc(coachConversations.lastMessageAt)],
    limit: 5,
  });

  if (recentConversations.length === 0) return "";

  const summaries: string[] = [];

  for (const conv of recentConversations) {
    if (conv.messages.length === 0) continue;

    const modeLabel = conv.mode === "general" ? "" : `[${conv.mode.replace("_", " ")}] `;
    const date = new Date(conv.lastMessageAt).toLocaleDateString();

    // Get key points from conversation
    const userMessages = conv.messages
      .filter(m => m.role === "user")
      .slice(0, 3)
      .map(m => m.content.slice(0, 100));

    if (userMessages.length > 0) {
      summaries.push(`${modeLabel}${date}: Discussed - ${userMessages.join("; ")}`);
    }

    // Include insights if available
    if (conv.insights) {
      summaries.push(`  Insights: ${conv.insights}`);
    }
  }

  if (summaries.length === 0) return "";

  return `\n\n## Recent Conversation History\nThe user has discussed these topics with you before:\n${summaries.join("\n")}`;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResult = applyRateLimit(
      `ai-chat:${session.user.id}`,
      RATE_LIMITS.aiChat
    );
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const validation = await validateBody(request, aiChatSchema);
    if (!validation.success) {
      return new Response(validation.error, { status: 400 });
    }

    const {
      messages,
      memberId,
      deepThinking,
      conversationId,
      mode = "general",
    } = validation.data;

    // Verify member belongs to circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, memberId),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return new Response("Member not found", { status: 404 });
    }

    // Get or create conversation
    let activeConversation;
    if (conversationId) {
      activeConversation = await db.query.coachConversations.findFirst({
        where: eq(coachConversations.id, conversationId),
      });
    }

    if (!activeConversation) {
      // Create new conversation
      const [newConv] = await db
        .insert(coachConversations)
        .values({
          memberId,
          mode: mode as string,
        })
        .returning();
      activeConversation = newConv;
    }

    // Convert messages to format expected by AI SDK
    const coreMessages = messages.map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: extractMessageContent(msg),
    }));

    // Get the latest user message to save
    const latestUserMessage = coreMessages.filter(m => m.role === "user").pop();

    // Save user message to database
    if (latestUserMessage) {
      await db.insert(coachMessages).values({
        conversationId: activeConversation.id,
        role: "user",
        content: latestUserMessage.content,
      });

      // Update conversation last message timestamp
      await db
        .update(coachConversations)
        .set({ lastMessageAt: new Date(), updatedAt: new Date() })
        .where(eq(coachConversations.id, activeConversation.id));
    }

    // Get member context for personalized responses
    const context = await getMemberContext(memberId);
    const baseSystemPrompt = buildSystemPrompt(context);

    // Get conversation history for additional context
    const conversationHistory = await getConversationHistory(memberId);

    // Get mode-specific prompt from YAML schemas (with fallback to hardcoded)
    let modePrompt: string;
    try {
      modePrompt = getCoachingModeForPrompt(mode);
    } catch {
      // Fallback to hardcoded if YAML loading fails
      modePrompt = COACHING_MODE_PROMPTS[mode] || COACHING_MODE_PROMPTS.general;
    }

    // Add programming rules context for training-related questions
    const programmingRules = getProgrammingRulesForPrompt();

    // Build full system prompt
    const fullSystemPrompt = `${modePrompt}

${baseSystemPrompt}
${conversationHistory}

${programmingRules}

Remember to:
- Be conversational and warm, not clinical
- Use the person's name naturally
- Reference their specific goals, limitations, and history when relevant
- Keep responses focused and actionable
- If they seem to be struggling emotionally, acknowledge their feelings first
- Use evidence-based training principles when giving workout advice`;

    // Stream the response with semantic context and tool access
    const result = await streamWithSemanticContext({
      messages: coreMessages,
      systemPrompt: fullSystemPrompt,
      memberId,
      enableTools: true, // Enable semantic tools for context exploration
      maxSteps: 5, // Allow multi-step tool calls
      deepThinking: deepThinking || mode !== "general",
      onFinish: async ({ text }) => {
        // Save assistant response to database
        await db.insert(coachMessages).values({
          conversationId: activeConversation!.id,
          role: "assistant",
          content: text,
        });

        // Update conversation timestamp
        await db
          .update(coachConversations)
          .set({ lastMessageAt: new Date(), updatedAt: new Date() })
          .where(eq(coachConversations.id, activeConversation!.id));
      },
    });

    // Return response with conversation ID in header
    const response = result.toTextStreamResponse();
    response.headers.set("X-Conversation-Id", activeConversation.id);

    return response;
  } catch (error) {
    console.error("Error in AI chat:", error);
    return new Response("Failed to process request", { status: 500 });
  }
}
