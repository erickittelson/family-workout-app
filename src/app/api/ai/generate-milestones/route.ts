import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { goals, milestones, familyMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getMemberContext, buildSystemPrompt } from "@/lib/ai";

const milestonesSchema = z.object({
  milestones: z.array(
    z.object({
      title: z.string().describe("Short title for the milestone"),
      description: z.string().describe("Detailed description of what to achieve"),
      targetValue: z.number().optional().describe("Numeric target if applicable"),
      weekNumber: z.number().describe("Which week to target this milestone"),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { goalId } = await request.json();

    if (!goalId) {
      return new Response("Goal ID is required", { status: 400 });
    }

    // Get the goal
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
      with: {
        member: true,
      },
    });

    if (!goal) {
      return new Response("Goal not found", { status: 404 });
    }

    if (goal.member.familyId !== session.familyId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get member context
    const context = await getMemberContext(goal.memberId);
    const systemPrompt = buildSystemPrompt(context);

    // Calculate weeks until target date
    const weeksUntilTarget = goal.targetDate
      ? Math.max(1, Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)))
      : 12;

    const prompt = `Generate ${Math.min(weeksUntilTarget, 8)} milestones for this goal:

Goal: ${goal.title}
${goal.description ? `Description: ${goal.description}` : ""}
Category: ${goal.category}
${goal.targetValue ? `Target: ${goal.targetValue} ${goal.targetUnit}` : ""}
${goal.currentValue ? `Current: ${goal.currentValue} ${goal.targetUnit}` : ""}
${goal.targetDate ? `Target date: ${new Date(goal.targetDate).toLocaleDateString()}` : ""}

Create progressive milestones that build up to the final goal. Each milestone should be:
1. Specific and measurable
2. Progressive (building on previous milestones)
3. Achievable within 1-2 weeks
4. Include specific numbers/targets when applicable

Consider the person's current fitness level, limitations, and recent progress when setting milestone targets.`;

    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: milestonesSchema,
      system: systemPrompt,
      prompt,
    });

    // Save milestones to database
    const today = new Date();
    const milestonesToCreate = result.object.milestones.map((m, index) => {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + m.weekNumber * 7);

      return {
        goalId,
        title: m.title,
        description: m.description,
        targetValue: m.targetValue,
        targetDate,
        order: index,
        aiGenerated: true,
      };
    });

    await db.insert(milestones).values(milestonesToCreate);

    return Response.json({
      success: true,
      milestones: result.object.milestones,
    });
  } catch (error) {
    console.error("Error generating milestones:", error);
    return new Response("Failed to generate milestones", { status: 500 });
  }
}
