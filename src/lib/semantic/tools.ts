/**
 * Semantic Layer Tools for AI
 *
 * Tool-style functions that can be called by the AI model to fetch
 * semantic context and run read-only database queries.
 *
 * Usage with Vercel AI SDK:
 * ```typescript
 * import { semanticTools } from "@/lib/semantic/tools";
 *
 * const result = streamText({
 *   model: openai("gpt-5.2"),
 *   tools: semanticTools,
 *   stopWhen: stepCountIs(5),
 * });
 * ```
 */

import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { sql as sqlTemplate } from "drizzle-orm";
import {
  searchSemantic,
  getDomain,
  getEntity,
  getMetric,
  getPolicy,
  getQueryPatterns,
  formatSemanticContext,
  getSemanticContext,
} from "./index";
import type {
  DomainDefinition,
  EntityDefinition,
  MetricDefinition,
  PolicyDefinition,
} from "./types";

/**
 * Tool: Search semantic layer
 *
 * Searches the semantic layer for relevant definitions, patterns, and examples.
 * Use this when you need to understand what data is available or how to query it.
 */
export const searchSemanticTool = tool({
  description: `Search the semantic knowledge base for relevant context about workouts, members, goals, metrics, etc. Returns matching domains, entities, and metrics with their descriptions. Use this to find what information is available before querying the database.`,
  inputSchema: z.object({
    query: z.string().describe("Natural language search query"),
    limit: z.number().optional().default(5).describe("Maximum results to return"),
  }),
  execute: async ({ query, limit }) => {
    const results = searchSemantic(query, limit ?? 5);

    if (results.length === 0) {
      return {
        found: false,
        message: "No matching semantic definitions found",
        suggestions: [
          "Try more specific terms",
          "Use synonyms (workout, session, training)",
          "Check available domains: workouts, coaching, analytics, goals, onboarding",
        ],
      };
    }

    return {
      found: true,
      count: results.length,
      results: results.map((r) => ({
        id: r.id,
        type: r.type,
        description: r.description,
        relevance: Math.round(r.score * 10) / 10,
      })),
    };
  },
});

/**
 * Tool: Get semantic definition
 *
 * Retrieves detailed definition for a domain, entity, metric, or policy.
 * Use after searching to get full details including query patterns and examples.
 */
export const getSemanticTool = tool({
  description: `Get detailed semantic definition by ID and type. Returns full schema including fields, relationships, query patterns, and examples. Use this after searching to get complete context for a specific entity or domain.`,
  inputSchema: z.object({
    id: z.string().describe("The ID of the semantic item (e.g., 'member', 'workout_session', 'adherence')"),
    type: z.enum(["domain", "entity", "metric", "policy"]).describe("The type of semantic item"),
  }),
  execute: async ({ id, type }) => {
    let item: DomainDefinition | EntityDefinition | MetricDefinition | PolicyDefinition | null = null;

    switch (type) {
      case "domain":
        item = getDomain(id);
        break;
      case "entity":
        item = getEntity(id);
        break;
      case "metric":
        item = getMetric(id);
        break;
      case "policy":
        item = getPolicy(id);
        break;
    }

    if (!item) {
      return {
        found: false,
        message: `No ${type} found with id '${id}'`,
        available: type === "entity"
          ? ["member", "circle", "exercise", "workout_session", "workout_plan", "goal", "personal_record", "limitation", "skill"]
          : type === "domain"
          ? ["workouts", "coaching", "analytics", "goals", "onboarding"]
          : type === "metric"
          ? ["adherence", "volume", "progress", "recovery"]
          : ["safety", "privacy"],
      };
    }

    // Return simplified version for token efficiency
    const result: Record<string, unknown> = {
      found: true,
      id,
      type,
      description: item.description,
    };

    if (type === "entity") {
      const entity = item as EntityDefinition;
      result.table = entity.table;
      result.fields = entity.fields?.slice(0, 10).map((f) => ({
        name: f.name,
        type: f.type,
        description: f.description,
      }));
      result.examples = entity.examples?.slice(0, 3);
    }

    if (type === "domain") {
      const domain = item as DomainDefinition;
      result.intents = domain.intents
        ? Object.entries(domain.intents).map(([k, v]) => ({
            intent: k,
            description: v.description,
          }))
        : undefined;
      result.query_patterns = domain.query_patterns
        ? Object.keys(domain.query_patterns)
        : undefined;
    }

    if (type === "metric") {
      const metric = item as MetricDefinition;
      result.definitions = metric.definitions
        ? Object.entries(metric.definitions).slice(0, 5).map(([k, v]) => ({
            name: k,
            description: v.description,
            unit: v.unit,
          }))
        : undefined;
    }

    return result;
  },
});

/**
 * Tool: Get query patterns
 *
 * Retrieves SQL query patterns for a domain.
 * Use this to get example SQL for common operations.
 */
export const getQueryPatternsTool = tool({
  description: `Get SQL query patterns for a domain. Returns pre-written SQL templates for common operations like fetching recent sessions, calculating volume, etc.`,
  inputSchema: z.object({
    domainId: z.string().describe("Domain ID (e.g., 'workouts', 'analytics')"),
    patternId: z.string().optional().describe("Specific pattern ID, or omit to get all"),
  }),
  execute: async ({ domainId, patternId }) => {
    const patterns = getQueryPatterns(domainId);

    if (!patterns) {
      return {
        found: false,
        message: `No query patterns found for domain '${domainId}'`,
        available_domains: ["workouts", "analytics", "coaching", "goals"],
      };
    }

    if (patternId) {
      const pattern = patterns[patternId];
      if (!pattern) {
        return {
          found: false,
          message: `No pattern '${patternId}' in domain '${domainId}'`,
          available_patterns: Object.keys(patterns),
        };
      }
      return {
        found: true,
        pattern: patternId,
        description: pattern.description,
        sql: pattern.sql,
      };
    }

    return {
      found: true,
      domain: domainId,
      patterns: Object.entries(patterns).map(([k, v]) => ({
        id: k,
        description: v.description,
      })),
    };
  },
});

/**
 * Tool: Run read-only SQL query
 *
 * Executes a read-only SQL query against the database.
 * Only SELECT queries are allowed. Use this after getting query patterns
 * or entity examples to fetch actual data.
 */
export const readonlyQueryTool = tool({
  description: `Execute a read-only SQL query against the database. Only SELECT queries are allowed. Use $1, $2, etc. for parameters. Always include appropriate WHERE clauses for member_id or circle_id to scope results.`,
  inputSchema: z.object({
    query: z.string().describe("SQL SELECT query"),
    params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional()
      .describe("Query parameters to substitute for $1, $2, etc."),
    limit: z.number().optional().default(50).describe("Maximum rows to return"),
  }),
  execute: async ({ query, limit }) => {
    // Validate query is read-only
    const normalizedQuery = query.trim().toLowerCase();
    const maxRows = limit ?? 50;

    if (!normalizedQuery.startsWith("select")) {
      return {
        success: false,
        error: "Only SELECT queries are allowed",
      };
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /;\s*(insert|update|delete|drop|truncate|alter|create)/i,
      /--/,
      /\/\*/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        return {
          success: false,
          error: "Query contains potentially dangerous patterns",
        };
      }
    }

    // Add LIMIT if not present
    let finalQuery = query;
    if (!normalizedQuery.includes("limit")) {
      finalQuery = `${query.replace(/;?\s*$/, "")} LIMIT ${maxRows}`;
    }

    try {
      // Execute query using raw SQL
      const result = await db.execute(sqlTemplate.raw(finalQuery));

      return {
        success: true,
        rowCount: Array.isArray(result) ? result.length : 0,
        rows: Array.isArray(result) ? result.slice(0, maxRows) : [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Query execution failed",
      };
    }
  },
});

/**
 * Tool: Get member context
 *
 * Retrieves pre-computed member context including current stats,
 * active goals, limitations, and recovery status.
 * Use this for quick member overview without multiple queries.
 */
export const getMemberContextTool = tool({
  description: `Get pre-computed member context snapshot including current weight, fitness level, active goals, limitations, personal records, and muscle recovery status. Much faster than querying multiple tables individually.`,
  inputSchema: z.object({
    memberId: z.string().describe("Member UUID"),
  }),
  execute: async ({ memberId }) => {
    try {
      const result = await db.execute(
        sqlTemplate.raw(`
          SELECT
            current_weight,
            current_body_fat,
            fitness_level,
            training_age,
            active_limitations,
            active_goals,
            personal_records,
            skills,
            muscle_recovery_status,
            weekly_workout_avg,
            preferred_workout_time,
            avg_workout_duration,
            consecutive_training_weeks,
            needs_deload,
            last_workout_date,
            last_updated
          FROM member_context_snapshot
          WHERE member_id = '${memberId}'
        `)
      );

      if (!Array.isArray(result) || result.length === 0) {
        return {
          found: false,
          message: "No context snapshot found for this member. Context may need to be refreshed.",
        };
      }

      return {
        found: true,
        context: result[0],
      };
    } catch (error) {
      return {
        found: false,
        error: error instanceof Error ? error.message : "Failed to fetch member context",
      };
    }
  },
});

/**
 * Tool: Get semantic context for intent
 *
 * Automatically classifies intent and retrieves relevant semantic context.
 * Use this as a single call to get everything you need for a user query.
 */
export const getContextForQueryTool = tool({
  description: `Analyze user query, classify intent, and retrieve all relevant semantic context. Returns domains, entities, metrics, and policies relevant to the query. Use this as a first step to understand what information and patterns are available.`,
  inputSchema: z.object({
    query: z.string().describe("The user's natural language query"),
  }),
  execute: async ({ query }) => {
    const context = getSemanticContext(query);

    return {
      intent: context.intent,
      estimated_tokens: context.estimated_tokens,
      domains: Object.keys(context.domains),
      entities: Object.keys(context.entities),
      metrics: Object.keys(context.metrics),
      policies: Object.keys(context.policies),
      formatted_context: formatSemanticContext(context),
    };
  },
});

/**
 * All semantic tools bundled together
 */
export const semanticTools = {
  search_semantic: searchSemanticTool,
  get_semantic: getSemanticTool,
  get_query_patterns: getQueryPatternsTool,
  readonly_query: readonlyQueryTool,
  get_member_context: getMemberContextTool,
  get_context_for_query: getContextForQueryTool,
};

/**
 * Type for the semantic tools object
 */
export type SemanticTools = typeof semanticTools;
