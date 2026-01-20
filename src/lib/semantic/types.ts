/**
 * Semantic Layer Types
 *
 * Type definitions for the compiled semantic layer and retrieval service.
 */

// Token budgets from manifest
export interface TokenBudgets {
  semantic_context: number;
  user_state: number;
  policy: number;
  total: number;
}

// Intent categories from manifest
export interface IntentCategory {
  domains: string[];
  entities: string[];
  metrics: string[];
}

// Compiled semantic layer structure
export interface CompiledSemantic {
  version: string;
  compiled_at: string;
  schema_version: number;
  token_budgets: TokenBudgets;
  domains: Record<string, DomainDefinition>;
  entities: Record<string, EntityDefinition>;
  metrics: Record<string, MetricDefinition>;
  policies: Record<string, PolicyDefinition>;
  intent_categories: Record<string, IntentCategory>;
}

// Search index structures
export interface SearchIndexEntry {
  id: string;
  type: "domain" | "entity" | "metric" | "policy";
  keywords: string[];
  synonyms: string[];
  description: string;
  file: string;
}

export interface SearchIndex {
  version: string;
  entries: SearchIndexEntry[];
  keyword_map: Record<string, string[]>;
}

// Domain definition
export interface DomainDefinition {
  domain: string;
  version: string;
  description: string;
  concepts?: Record<string, unknown>;
  intents?: Record<string, IntentDefinition>;
  query_patterns?: Record<string, QueryPattern>;
  response_templates?: Record<string, { template: string }>;
  feature_intro?: string;
  [key: string]: unknown;
}

// Entity definition
export interface EntityDefinition {
  entity: string;
  version: string;
  description: string;
  table: string;
  primary_key?: string;
  foreign_keys?: Array<{ field: string; references: string }>;
  fields?: FieldDefinition[];
  relations?: Record<string, RelationDefinition>;
  computed?: Record<string, ComputedDefinition>;
  examples?: QueryExample[];
  synonyms?: Record<string, string[]>;
  [key: string]: unknown;
}

// Metric definition
export interface MetricDefinition {
  metric: string;
  version: string;
  description: string;
  definitions?: Record<string, MetricDetail>;
  analysis?: Record<string, unknown>;
  guidelines?: Record<string, unknown>;
  examples?: QueryExample[];
  insights?: Record<string, InsightTemplate>;
  [key: string]: unknown;
}

// Policy definition
export interface PolicyDefinition {
  policy: string;
  version: string;
  description: string;
  always_include?: boolean;
  principles?: string[];
  [key: string]: unknown;
}

// Supporting types
export interface IntentDefinition {
  description: string;
  examples?: string[];
  required_data?: string[];
  optional_data?: string[];
  response_approach?: string;
}

export interface QueryPattern {
  description: string;
  sql: string;
}

export interface FieldDefinition {
  name: string;
  type: string;
  description: string;
  required?: boolean;
  values?: string[];
  unit?: string;
  min?: number;
  max?: number;
  default?: unknown;
}

export interface RelationDefinition {
  table: string;
  type: "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many";
  description: string;
  fields?: FieldDefinition[];
}

export interface ComputedDefinition {
  formula?: string;
  source?: string;
  sql?: string;
  description: string;
}

export interface QueryExample {
  question: string;
  sql: string;
}

export interface MetricDetail {
  description: string;
  formula?: string;
  unit?: string;
  target_range?: [number, number];
  thresholds?: Record<string, number>;
  interpretation?: Record<string, string> | string;
}

export interface InsightTemplate {
  condition: string;
  template: string;
}

// Semantic context for AI
export interface SemanticContext {
  domains: Record<string, DomainDefinition>;
  entities: Record<string, EntityDefinition>;
  metrics: Record<string, MetricDefinition>;
  policies: Record<string, PolicyDefinition>;
  intent: string | null;
  estimated_tokens: number;
}

// Search result
export interface SearchResult {
  id: string;
  type: "domain" | "entity" | "metric" | "policy";
  score: number;
  description: string;
}

// Intent classification result
export interface IntentClassification {
  intent: string;
  confidence: number;
  domains: string[];
  entities: string[];
  metrics: string[];
}
