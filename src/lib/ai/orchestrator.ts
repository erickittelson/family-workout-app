/**
 * AI Orchestrator with Semantic Layer
 *
 * Integrates the semantic layer with AI operations for intelligent
 * context retrieval and database querying.
 *
 * Key features:
 * - Intent classification for selective context loading
 * - Tool-based semantic and database access
 * - Token budget management
 * - Streaming responses with multi-step tool calls
 */

import { streamText, generateText, stepCountIs } from "ai";
import { aiModel, aiModelFast, getReasoningOptions } from "./index";
import { semanticTools } from "../semantic/tools";
import {
  getSemanticContext,
  formatSemanticContext,
  getAlwaysIncludePolicies,
} from "../semantic";
import type { SemanticContext } from "../semantic/types";

// Re-export semantic tools for external use
export { semanticTools };

/**
 * Build a system prompt enhanced with semantic context
 */
export function buildSemanticSystemPrompt(
  basePrompt: string,
  semanticContext: SemanticContext
): string {
  const formattedContext = formatSemanticContext(semanticContext);

  return `${basePrompt}

---
## SEMANTIC KNOWLEDGE BASE
The following definitions and patterns are relevant to this conversation.
Use them to understand data structures and generate accurate queries.

${formattedContext}
---

You have access to tools for:
1. Searching semantic definitions (search_semantic)
2. Getting detailed entity/domain info (get_semantic)
3. Running read-only database queries (readonly_query)
4. Getting pre-computed member context (get_member_context)

Use these tools when you need:
- To understand what data is available
- To fetch user-specific information
- To run analytics or progress queries
- To get examples of SQL patterns

Always use the semantic tools before making assumptions about data structures.
`;
}

/**
 * Get semantic context for a conversation
 * Classifies intent and retrieves relevant context within token budget
 */
export function getContextForConversation(
  messages: Array<{ role: string; content: string }>
): SemanticContext {
  // Use the last few user messages for intent classification
  const userMessages = messages
    .filter((m) => m.role === "user")
    .slice(-3)
    .map((m) => m.content)
    .join(" ");

  return getSemanticContext(userMessages);
}

/**
 * Stream a response with semantic context and tool access
 *
 * This is the main function for AI chat with semantic layer integration.
 * It automatically:
 * - Classifies user intent
 * - Loads relevant semantic context
 * - Provides tools for deeper exploration
 * - Manages token budgets
 */
export async function streamWithSemanticContext(options: {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  systemPrompt: string;
  memberId: string;
  enableTools?: boolean;
  maxSteps?: number;
  deepThinking?: boolean;
  onFinish?: (params: { text: string }) => Promise<void>;
}) {
  const {
    messages,
    systemPrompt,
    memberId,
    enableTools = true,
    maxSteps = 5,
    deepThinking = false,
    onFinish,
  } = options;

  // Get semantic context based on conversation
  const semanticContext = getContextForConversation(messages);

  // Build enhanced system prompt
  const enhancedPrompt = buildSemanticSystemPrompt(systemPrompt, semanticContext);

  // Prepare tools if enabled
  const tools = enableTools
    ? {
        search_semantic: semanticTools.search_semantic,
        get_semantic: semanticTools.get_semantic,
        get_query_patterns: semanticTools.get_query_patterns,
        readonly_query: semanticTools.readonly_query,
        get_member_context: semanticTools.get_member_context,
      }
    : undefined;

  // Select model based on complexity
  const model = deepThinking ? aiModel : aiModelFast;

  // Get reasoning options
  const reasoningLevel = deepThinking ? "standard" : "none";
  const providerOptions = getReasoningOptions(
    reasoningLevel as "none" | "quick" | "standard" | "deep" | "max"
  );

  // Stream the response with multi-step tool calling
  const result = streamText({
    model,
    system: enhancedPrompt,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
    onFinish: onFinish ? async ({ text }) => onFinish({ text }) : undefined,
    ...providerOptions,
  });

  return result;
}

/**
 * Generate a response with semantic context (non-streaming)
 *
 * Use for:
 * - Structured data generation (workouts, milestones)
 * - Analysis tasks
 * - Any case where you need the full response before proceeding
 */
export async function generateWithSemanticContext(options: {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  systemPrompt: string;
  memberId: string;
  enableTools?: boolean;
  maxSteps?: number;
  reasoningLevel?: "none" | "quick" | "standard" | "deep" | "max";
}) {
  const {
    messages,
    systemPrompt,
    memberId,
    enableTools = true,
    maxSteps = 5,
    reasoningLevel = "standard",
  } = options;

  // Get semantic context
  const semanticContext = getContextForConversation(messages);

  // Build enhanced system prompt
  const enhancedPrompt = buildSemanticSystemPrompt(systemPrompt, semanticContext);

  // Prepare tools if enabled
  const tools = enableTools
    ? {
        search_semantic: semanticTools.search_semantic,
        get_semantic: semanticTools.get_semantic,
        get_query_patterns: semanticTools.get_query_patterns,
        readonly_query: semanticTools.readonly_query,
        get_member_context: semanticTools.get_member_context,
      }
    : undefined;

  // Get reasoning options
  const providerOptions = getReasoningOptions(reasoningLevel);

  // Generate the response with multi-step tool calling
  const result = await generateText({
    model: aiModel,
    system: enhancedPrompt,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
    ...providerOptions,
  });

  return result;
}

/**
 * Quick semantic search without full orchestration
 * Use for autocomplete, suggestions, or quick lookups
 */
export async function quickSemanticLookup(query: string): Promise<{
  intent: string | null;
  relevantItems: Array<{ id: string; type: string; description: string }>;
  suggestedTools: string[];
}> {
  const context = getSemanticContext(query);

  const relevantItems: Array<{ id: string; type: string; description: string }> = [];

  // Collect relevant items from context
  for (const [id, domain] of Object.entries(context.domains)) {
    relevantItems.push({ id, type: "domain", description: domain.description });
  }
  for (const [id, entity] of Object.entries(context.entities)) {
    relevantItems.push({ id, type: "entity", description: entity.description });
  }
  for (const [id, metric] of Object.entries(context.metrics)) {
    relevantItems.push({ id, type: "metric", description: metric.description });
  }

  // Suggest tools based on intent
  const suggestedTools: string[] = [];
  if (context.intent === "workout_logging" || context.intent === "workout_planning") {
    suggestedTools.push("get_member_context", "get_query_patterns");
  }
  if (context.intent === "progress_analytics") {
    suggestedTools.push("readonly_query", "get_semantic");
  }
  if (context.intent === "goal_management") {
    suggestedTools.push("get_semantic", "get_member_context");
  }

  return {
    intent: context.intent,
    relevantItems,
    suggestedTools,
  };
}

/**
 * Get policies that should always be included in AI context
 * These are safety and privacy policies
 */
export function getRequiredPolicies(): string {
  const policies = getAlwaysIncludePolicies();
  const sections: string[] = [];

  for (const [id, policy] of Object.entries(policies)) {
    sections.push(`## ${policy.policy}`);
    if (policy.principles) {
      for (const principle of policy.principles) {
        sections.push(`- ${principle}`);
      }
    }
  }

  return sections.join("\n");
}

/**
 * Estimate tokens for a prompt
 * Rough estimate: ~4 chars per token
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if adding content would exceed token budget
 */
export function wouldExceedBudget(
  currentTokens: number,
  additionalText: string,
  budget: number
): boolean {
  return currentTokens + estimateTokens(additionalText) > budget;
}
