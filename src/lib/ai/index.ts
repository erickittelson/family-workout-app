import { openai } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";
import { db } from "@/lib/db";
import {
  familyMembers,
  memberMetrics,
  goals,
  workoutSessions,
  personalRecords,
  memberLimitations,
} from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export async function getMemberContext(memberId: string) {
  const member = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.id, memberId),
    with: {
      metrics: {
        orderBy: (metrics, { desc }) => [desc(metrics.date)],
        limit: 5,
      },
      limitations: {
        where: eq(memberLimitations.active, true),
      },
      goals: true,
      personalRecords: {
        with: {
          exercise: true,
        },
        limit: 10,
      },
    },
  });

  if (!member) return null;

  const recentWorkouts = await db.query.workoutSessions.findMany({
    where: eq(workoutSessions.memberId, memberId),
    orderBy: [desc(workoutSessions.date)],
    limit: 10,
    with: {
      exercises: {
        with: {
          exercise: true,
          sets: true,
        },
      },
    },
  });

  return {
    member: {
      name: member.name,
      age: member.dateOfBirth
        ? Math.floor(
            (Date.now() - new Date(member.dateOfBirth).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000)
          )
        : null,
      gender: member.gender,
    },
    currentMetrics: member.metrics[0] || null,
    metricsHistory: member.metrics,
    limitations: member.limitations,
    goals: member.goals,
    personalRecords: member.personalRecords.map((pr) => ({
      exercise: pr.exercise.name,
      value: pr.value,
      unit: pr.unit,
      date: pr.date,
    })),
    recentWorkouts: recentWorkouts.map((w) => ({
      name: w.name,
      date: w.date,
      exercises: w.exercises.map((e) => ({
        name: e.exercise.name,
        sets: e.sets,
      })),
    })),
  };
}

export function buildSystemPrompt(context: Awaited<ReturnType<typeof getMemberContext>>) {
  if (!context) {
    return `You are an AI fitness coach helping a family with their workout goals.
You provide personalized advice on training, nutrition, and goal-setting.
Be encouraging but realistic. Provide specific, actionable recommendations.
When generating workout plans or milestones, be specific with sets, reps, and progressions.`;
  }

  const { member, currentMetrics, limitations, goals, personalRecords, recentWorkouts } = context;

  let prompt = `You are an AI fitness coach helping ${member.name}`;
  if (member.age) prompt += `, a ${member.age}-year-old`;
  if (member.gender) prompt += ` ${member.gender}`;
  prompt += ` with their fitness goals.\n\n`;

  if (currentMetrics) {
    prompt += `Current metrics:\n`;
    if (currentMetrics.weight) prompt += `- Weight: ${currentMetrics.weight} lbs\n`;
    if (currentMetrics.height) {
      const feet = Math.floor(currentMetrics.height / 12);
      const inches = currentMetrics.height % 12;
      prompt += `- Height: ${feet}'${inches}"\n`;
    }
    if (currentMetrics.bodyFatPercentage) prompt += `- Body fat: ${currentMetrics.bodyFatPercentage}%\n`;
    if (currentMetrics.fitnessLevel) prompt += `- Fitness level: ${currentMetrics.fitnessLevel}\n`;
    prompt += "\n";
  }

  if (limitations.length > 0) {
    prompt += `IMPORTANT - Physical limitations to consider:\n`;
    limitations.forEach((l) => {
      prompt += `- ${l.type}: ${l.description}`;
      if (l.affectedAreas) prompt += ` (affects: ${(l.affectedAreas as string[]).join(", ")})`;
      if (l.severity) prompt += ` - Severity: ${l.severity}`;
      prompt += "\n";
    });
    prompt += "Always consider these limitations when recommending exercises.\n\n";
  }

  if (goals.length > 0) {
    prompt += `Current goals:\n`;
    goals.forEach((g) => {
      prompt += `- ${g.title}`;
      if (g.targetValue && g.targetUnit) {
        prompt += ` (target: ${g.targetValue} ${g.targetUnit}`;
        if (g.currentValue) prompt += `, current: ${g.currentValue}`;
        prompt += ")";
      }
      if (g.targetDate) prompt += ` - Due: ${new Date(g.targetDate).toLocaleDateString()}`;
      prompt += ` [${g.status}]\n`;
    });
    prompt += "\n";
  }

  if (personalRecords.length > 0) {
    prompt += `Personal records:\n`;
    personalRecords.slice(0, 5).forEach((pr) => {
      prompt += `- ${pr.exercise}: ${pr.value} ${pr.unit}\n`;
    });
    prompt += "\n";
  }

  if (recentWorkouts.length > 0) {
    prompt += `Recent workout history (last ${recentWorkouts.length} sessions):\n`;
    recentWorkouts.slice(0, 3).forEach((w) => {
      prompt += `- ${w.name} (${new Date(w.date).toLocaleDateString()}): `;
      prompt += w.exercises.map((e) => e.name).join(", ");
      prompt += "\n";
    });
    prompt += "\n";
  }

  prompt += `Guidelines:
- Be encouraging but realistic about progress timelines
- Provide specific, actionable recommendations with sets, reps, and weights when applicable
- Consider the user's current fitness level and limitations
- Reference their goals and help create milestones to achieve them
- When recommending exercises, consider their recent workout history to ensure variety
- Use progressive overload principles for strength goals
- For skill goals (like back tuck), break down into prerequisite skills and progressions`;

  return prompt;
}

export const aiModel = openai("gpt-4o");
