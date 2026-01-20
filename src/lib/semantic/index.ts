/**
 * Semantic Layer Service
 *
 * Provides selective loading of semantic context for AI operations.
 * This is a server-only module that should not be imported in client components.
 *
 * Key principles:
 * - Never inject the full semantic layer into prompts
 * - Classify intent first, then load only relevant chunks
 * - Stay within token budget (300-900 tokens for semantic context)
 * - Always include safety and privacy policies
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type {
  CompiledSemantic,
  SearchIndex,
  SemanticContext,
  SearchResult,
  IntentClassification,
  DomainDefinition,
  EntityDefinition,
  MetricDefinition,
  PolicyDefinition,
} from "./types";

// Cache for loaded artifacts
let compiledCache: CompiledSemantic | null = null;
let indexCache: SearchIndex | null = null;

// Paths
const BUILD_DIR = join(process.cwd(), ".semantic-build");
const COMPILED_PATH = join(BUILD_DIR, "semantic.compiled.json");
const INDEX_PATH = join(BUILD_DIR, "semantic.index.json");

/**
 * Load compiled semantic layer
 * Cached in memory after first load
 */
export function loadCompiled(): CompiledSemantic {
  if (compiledCache) {
    return compiledCache;
  }

  if (!existsSync(COMPILED_PATH)) {
    throw new Error(
      "Semantic layer not compiled. Run `npm run semantic:compile` first."
    );
  }

  const content = readFileSync(COMPILED_PATH, "utf-8");
  compiledCache = JSON.parse(content) as CompiledSemantic;
  return compiledCache;
}

/**
 * Load search index
 * Cached in memory after first load
 */
export function loadIndex(): SearchIndex {
  if (indexCache) {
    return indexCache;
  }

  if (!existsSync(INDEX_PATH)) {
    throw new Error(
      "Semantic index not built. Run `npm run semantic:compile` first."
    );
  }

  const content = readFileSync(INDEX_PATH, "utf-8");
  indexCache = JSON.parse(content) as SearchIndex;
  return indexCache;
}

/**
 * Clear caches (useful for development/testing)
 */
export function clearCache(): void {
  compiledCache = null;
  indexCache = null;
}

/**
 * Classify user intent to determine which semantic chunks to load
 */
export function classifyIntent(query: string): IntentClassification {
  const compiled = loadCompiled();
  const index = loadIndex();

  // Normalize query
  const normalizedQuery = query.toLowerCase().trim();

  // Score each intent category
  const scores: Record<string, number> = {};

  for (const [intentName, category] of Object.entries(compiled.intent_categories)) {
    let score = 0;

    // Check domain keywords
    for (const domainId of category.domains) {
      const entry = index.entries.find(e => e.id === domainId && e.type === "domain");
      if (entry) {
        for (const keyword of entry.keywords) {
          if (normalizedQuery.includes(keyword)) {
            score += 1;
          }
        }
        for (const synonym of entry.synonyms) {
          if (normalizedQuery.includes(synonym)) {
            score += 2; // Synonyms are more specific
          }
        }
      }
    }

    // Check entity keywords
    for (const entityId of category.entities) {
      const entry = index.entries.find(e => e.id === entityId && e.type === "entity");
      if (entry) {
        for (const keyword of entry.keywords) {
          if (normalizedQuery.includes(keyword)) {
            score += 1;
          }
        }
        for (const synonym of entry.synonyms) {
          if (normalizedQuery.includes(synonym)) {
            score += 2;
          }
        }
      }
    }

    scores[intentName] = score;
  }

  // Find best match
  let bestIntent = "coaching_support"; // Default fallback
  let bestScore = 0;

  for (const [intent, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  const category = compiled.intent_categories[bestIntent];

  return {
    intent: bestIntent,
    confidence: bestScore > 0 ? Math.min(bestScore / 10, 1) : 0.3, // Normalize confidence
    domains: category?.domains || [],
    entities: category?.entities || [],
    metrics: category?.metrics || [],
  };
}

/**
 * Search semantic index for relevant content
 */
export function searchSemantic(query: string, limit = 5): SearchResult[] {
  const index = loadIndex();

  // Normalize query words
  const queryWords = query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3);

  // Score each entry
  const scored: Array<SearchResult & { score: number }> = [];

  for (const entry of index.entries) {
    let score = 0;

    for (const word of queryWords) {
      // Check keywords
      if (entry.keywords.includes(word)) {
        score += 1;
      }
      // Check synonyms (higher weight)
      if (entry.synonyms.includes(word)) {
        score += 2;
      }
      // Check description
      if (entry.description.toLowerCase().includes(word)) {
        score += 0.5;
      }
    }

    if (score > 0) {
      scored.push({
        id: entry.id,
        type: entry.type,
        score,
        description: entry.description,
      });
    }
  }

  // Sort by score and limit
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get a specific domain by ID
 */
export function getDomain(id: string): DomainDefinition | null {
  const compiled = loadCompiled();
  return compiled.domains[id] || null;
}

/**
 * Get a specific entity by ID
 */
export function getEntity(id: string): EntityDefinition | null {
  const compiled = loadCompiled();
  return compiled.entities[id] || null;
}

/**
 * Get a specific metric by ID
 */
export function getMetric(id: string): MetricDefinition | null {
  const compiled = loadCompiled();
  return compiled.metrics[id] || null;
}

/**
 * Get a specific policy by ID
 */
export function getPolicy(id: string): PolicyDefinition | null {
  const compiled = loadCompiled();
  return compiled.policies[id] || null;
}

/**
 * Get policies that should always be included
 */
export function getAlwaysIncludePolicies(): Record<string, PolicyDefinition> {
  const compiled = loadCompiled();
  const policies: Record<string, PolicyDefinition> = {};

  for (const [id, policy] of Object.entries(compiled.policies)) {
    if (policy.always_include) {
      policies[id] = policy;
    }
  }

  return policies;
}

/**
 * Estimate token count for an object
 * Rough estimate: ~4 chars per token
 */
function estimateTokens(obj: unknown): number {
  const json = JSON.stringify(obj);
  return Math.ceil(json.length / 4);
}

/**
 * Trim content to fit token budget
 */
function trimToTokenBudget<T extends Record<string, unknown>>(
  items: Record<string, T>,
  budget: number
): Record<string, T> {
  const result: Record<string, T> = {};
  let currentTokens = 0;

  for (const [id, item] of Object.entries(items)) {
    const itemTokens = estimateTokens(item);

    if (currentTokens + itemTokens <= budget) {
      result[id] = item;
      currentTokens += itemTokens;
    } else {
      // Try to include a minimal version
      const minimal = {
        id: (item as Record<string, unknown>)[Object.keys(item)[0]],
        description: (item as Record<string, unknown>).description,
      } as unknown as T;

      const minimalTokens = estimateTokens(minimal);
      if (currentTokens + minimalTokens <= budget) {
        result[id] = minimal;
        currentTokens += minimalTokens;
      } else {
        break; // Budget exhausted
      }
    }
  }

  return result;
}

/**
 * Get semantic context for a query
 *
 * This is the main function to use in AI orchestration.
 * It classifies intent, retrieves relevant chunks, and stays within token budget.
 */
export function getSemanticContext(query: string): SemanticContext {
  const compiled = loadCompiled();
  const budget = compiled.token_budgets.semantic_context;

  // Classify intent
  const intent = classifyIntent(query);

  // Collect relevant items
  const domains: Record<string, DomainDefinition> = {};
  const entities: Record<string, EntityDefinition> = {};
  const metrics: Record<string, MetricDefinition> = {};
  const policies: Record<string, PolicyDefinition> = {};

  // Always include policies marked as always_include
  for (const [id, policy] of Object.entries(compiled.policies)) {
    if (policy.always_include) {
      policies[id] = policy;
    }
  }

  // Add intent-specific items
  for (const domainId of intent.domains) {
    const domain = compiled.domains[domainId];
    if (domain) {
      domains[domainId] = domain;
    }
  }

  for (const entityId of intent.entities) {
    const entity = compiled.entities[entityId];
    if (entity) {
      entities[entityId] = entity;
    }
  }

  for (const metricId of intent.metrics) {
    const metric = compiled.metrics[metricId];
    if (metric) {
      metrics[metricId] = metric;
    }
  }

  // Calculate token usage
  let totalTokens = estimateTokens(policies);

  // Allocate remaining budget
  const remainingBudget = budget - totalTokens;
  const domainBudget = Math.floor(remainingBudget * 0.4);
  const entityBudget = Math.floor(remainingBudget * 0.4);
  const metricBudget = Math.floor(remainingBudget * 0.2);

  // Trim to fit
  const trimmedDomains = trimToTokenBudget(domains, domainBudget);
  const trimmedEntities = trimToTokenBudget(entities, entityBudget);
  const trimmedMetrics = trimToTokenBudget(metrics, metricBudget);

  totalTokens = estimateTokens({
    domains: trimmedDomains,
    entities: trimmedEntities,
    metrics: trimmedMetrics,
    policies,
  });

  return {
    domains: trimmedDomains,
    entities: trimmedEntities,
    metrics: trimmedMetrics,
    policies,
    intent: intent.intent,
    estimated_tokens: totalTokens,
  };
}

/**
 * Get semantic context by specific IDs
 * Use when you know exactly what you need
 */
export function getSemanticByIds(options: {
  domains?: string[];
  entities?: string[];
  metrics?: string[];
  policies?: string[];
}): SemanticContext {
  const compiled = loadCompiled();

  const domains: Record<string, DomainDefinition> = {};
  const entities: Record<string, EntityDefinition> = {};
  const metrics: Record<string, MetricDefinition> = {};
  const policies: Record<string, PolicyDefinition> = {};

  // Always include required policies
  for (const [id, policy] of Object.entries(compiled.policies)) {
    if (policy.always_include) {
      policies[id] = policy;
    }
  }

  // Add requested items
  for (const id of options.domains || []) {
    const domain = compiled.domains[id];
    if (domain) domains[id] = domain;
  }

  for (const id of options.entities || []) {
    const entity = compiled.entities[id];
    if (entity) entities[id] = entity;
  }

  for (const id of options.metrics || []) {
    const metric = compiled.metrics[id];
    if (metric) metrics[id] = metric;
  }

  for (const id of options.policies || []) {
    const policy = compiled.policies[id];
    if (policy) policies[id] = policy;
  }

  const estimatedTokens = estimateTokens({
    domains,
    entities,
    metrics,
    policies,
  });

  return {
    domains,
    entities,
    metrics,
    policies,
    intent: null,
    estimated_tokens: estimatedTokens,
  };
}

/**
 * Format semantic context for injection into AI prompt
 */
export function formatSemanticContext(context: SemanticContext): string {
  const sections: string[] = [];

  // Policies first (most important)
  if (Object.keys(context.policies).length > 0) {
    sections.push("## Policies");
    for (const [id, policy] of Object.entries(context.policies)) {
      sections.push(`### ${policy.policy}`);
      if (policy.principles) {
        sections.push("Principles:");
        for (const p of policy.principles) {
          sections.push(`- ${p}`);
        }
      }
    }
  }

  // Domains
  if (Object.keys(context.domains).length > 0) {
    sections.push("\n## Context: Domains");
    for (const [id, domain] of Object.entries(context.domains)) {
      sections.push(`### ${domain.domain}`);
      sections.push(domain.description);
      if (domain.intents) {
        sections.push("User intents:");
        for (const [intentId, intent] of Object.entries(domain.intents)) {
          sections.push(`- ${intentId}: ${intent.description}`);
        }
      }
    }
  }

  // Entities
  if (Object.keys(context.entities).length > 0) {
    sections.push("\n## Context: Entities");
    for (const [id, entity] of Object.entries(context.entities)) {
      sections.push(`### ${entity.entity}`);
      sections.push(`Table: ${entity.table}`);
      sections.push(entity.description);
    }
  }

  // Metrics
  if (Object.keys(context.metrics).length > 0) {
    sections.push("\n## Context: Metrics");
    for (const [id, metric] of Object.entries(context.metrics)) {
      sections.push(`### ${metric.metric}`);
      sections.push(metric.description);
    }
  }

  return sections.join("\n");
}

/**
 * Get query patterns for a domain
 * Used for generating SQL from natural language
 */
export function getQueryPatterns(domainId: string): Record<string, { description: string; sql: string }> | null {
  const domain = getDomain(domainId);
  if (!domain?.query_patterns) return null;

  return domain.query_patterns;
}

/**
 * Get examples for an entity
 * Used for few-shot prompting
 */
export function getEntityExamples(entityId: string): Array<{ question: string; sql: string }> | null {
  const entity = getEntity(entityId);
  if (!entity?.examples) return null;

  return entity.examples;
}
