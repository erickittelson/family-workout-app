#!/usr/bin/env npx tsx
/**
 * Semantic Layer Compiler
 *
 * Validates and compiles YAML semantic definitions to optimized JSON.
 * Run at build time via `npm run semantic:compile`
 *
 * Outputs:
 * - .semantic-build/semantic.compiled.json - Full compiled semantic layer
 * - .semantic-build/semantic.index.json - Search index for selective loading
 * - .semantic-build/manifest.json - Version and metadata
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, basename } from "path";
import { parse as parseYaml } from "yaml";

// Configuration
const SEMANTIC_DIR = join(process.cwd(), "semantic");
const OUTPUT_DIR = join(process.cwd(), ".semantic-build");
const MANIFEST_FILE = join(SEMANTIC_DIR, "manifest.yml");

// Types
interface ManifestConfig {
  version: string;
  name: string;
  description: string;
  last_updated: string;
  schema_version: number;
  token_budgets: {
    semantic_context: number;
    user_state: number;
    policy: number;
    total: number;
  };
  domains: Array<{ id: string; file: string; description: string }>;
  entities: Array<{ id: string; file: string; description: string }>;
  metrics: Array<{ id: string; file: string; description: string }>;
  policies: Array<{ id: string; file: string; description: string; always_include?: boolean }>;
  intent_categories: Record<string, {
    domains: string[];
    entities: string[];
    metrics: string[];
  }>;
  build: {
    output_dir: string;
    compile_to: string;
    generate_index: boolean;
    validate_schema: boolean;
    minify: boolean;
  };
}

interface CompiledSemantic {
  version: string;
  compiled_at: string;
  schema_version: number;
  token_budgets: ManifestConfig["token_budgets"];
  domains: Record<string, unknown>;
  entities: Record<string, unknown>;
  metrics: Record<string, unknown>;
  policies: Record<string, unknown>;
  intent_categories: ManifestConfig["intent_categories"];
}

interface SearchIndexEntry {
  id: string;
  type: "domain" | "entity" | "metric" | "policy";
  keywords: string[];
  synonyms: string[];
  description: string;
  file: string;
}

interface SearchIndex {
  version: string;
  entries: SearchIndexEntry[];
  keyword_map: Record<string, string[]>; // keyword -> [ids]
}

// Validation errors
const errors: string[] = [];
const warnings: string[] = [];

function log(msg: string) {
  console.log(`[semantic] ${msg}`);
}

function error(msg: string) {
  errors.push(msg);
  console.error(`[semantic] ERROR: ${msg}`);
}

function warn(msg: string) {
  warnings.push(msg);
  console.warn(`[semantic] WARN: ${msg}`);
}

// Load and parse a YAML file
function loadYaml<T>(filepath: string): T | null {
  try {
    const content = readFileSync(filepath, "utf-8");
    return parseYaml(content) as T;
  } catch (err) {
    error(`Failed to parse ${filepath}: ${err}`);
    return null;
  }
}

// Extract keywords from content for search index
function extractKeywords(content: unknown, parentKey = ""): string[] {
  const keywords: string[] = [];

  if (typeof content === "string") {
    // Extract meaningful words (3+ chars, not common words)
    const commonWords = new Set([
      "the", "and", "for", "are", "but", "not", "you", "all",
      "can", "her", "was", "one", "our", "out", "has", "have",
      "been", "were", "they", "this", "that", "with", "from",
    ]);

    const words = content.toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, " ")
      .split(/\s+/)
      .filter(w => w.length >= 3 && !commonWords.has(w));

    keywords.push(...words);
  } else if (Array.isArray(content)) {
    for (const item of content) {
      keywords.push(...extractKeywords(item, parentKey));
    }
  } else if (content && typeof content === "object") {
    for (const [key, value] of Object.entries(content)) {
      // Include key names as keywords
      if (key.length >= 3) {
        keywords.push(key.toLowerCase().replace(/_/g, " "));
      }
      keywords.push(...extractKeywords(value, key));
    }
  }

  return [...new Set(keywords)];
}

// Extract synonyms from content
function extractSynonyms(content: unknown): string[] {
  const synonyms: string[] = [];

  if (content && typeof content === "object") {
    const obj = content as Record<string, unknown>;

    // Look for synonyms field
    if (obj.synonyms && typeof obj.synonyms === "object") {
      for (const [key, values] of Object.entries(obj.synonyms)) {
        synonyms.push(key);
        if (Array.isArray(values)) {
          synonyms.push(...values.map(v => String(v)));
        }
      }
    }

    // Recurse into nested objects
    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") {
        synonyms.push(...extractSynonyms(value));
      }
    }
  }

  return [...new Set(synonyms)];
}

// Validate required fields
function validateRequired(
  content: Record<string, unknown>,
  required: string[],
  context: string
): boolean {
  let valid = true;
  for (const field of required) {
    if (!(field in content)) {
      error(`${context}: missing required field '${field}'`);
      valid = false;
    }
  }
  return valid;
}

// Validate domain schema
function validateDomain(content: unknown, filepath: string): boolean {
  if (!content || typeof content !== "object") {
    error(`${filepath}: invalid domain structure`);
    return false;
  }

  const domain = content as Record<string, unknown>;
  return validateRequired(domain, ["domain", "version", "description"], filepath);
}

// Validate entity schema
function validateEntity(content: unknown, filepath: string): boolean {
  if (!content || typeof content !== "object") {
    error(`${filepath}: invalid entity structure`);
    return false;
  }

  const entity = content as Record<string, unknown>;
  return validateRequired(entity, ["entity", "version", "description", "table"], filepath);
}

// Validate metric schema
function validateMetric(content: unknown, filepath: string): boolean {
  if (!content || typeof content !== "object") {
    error(`${filepath}: invalid metric structure`);
    return false;
  }

  const metric = content as Record<string, unknown>;
  return validateRequired(metric, ["metric", "version", "description"], filepath);
}

// Validate policy schema
function validatePolicy(content: unknown, filepath: string): boolean {
  if (!content || typeof content !== "object") {
    error(`${filepath}: invalid policy structure`);
    return false;
  }

  const policy = content as Record<string, unknown>;
  return validateRequired(policy, ["policy", "version", "description"], filepath);
}

// Main compile function
async function compile() {
  log("Starting semantic layer compilation...");

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load manifest
  log("Loading manifest...");
  const manifest = loadYaml<ManifestConfig>(MANIFEST_FILE);
  if (!manifest) {
    error("Failed to load manifest.yml");
    process.exit(1);
  }

  // Initialize compiled output
  const compiled: CompiledSemantic = {
    version: manifest.version,
    compiled_at: new Date().toISOString(),
    schema_version: manifest.schema_version,
    token_budgets: manifest.token_budgets,
    domains: {},
    entities: {},
    metrics: {},
    policies: {},
    intent_categories: manifest.intent_categories,
  };

  // Initialize search index
  const searchIndex: SearchIndex = {
    version: manifest.version,
    entries: [],
    keyword_map: {},
  };

  // Process domains
  log("Processing domains...");
  for (const domain of manifest.domains) {
    const filepath = join(SEMANTIC_DIR, domain.file);
    const content = loadYaml<Record<string, unknown>>(filepath);

    if (content && validateDomain(content, filepath)) {
      compiled.domains[domain.id] = content;

      // Add to search index
      const keywords = extractKeywords(content);
      const synonyms = extractSynonyms(content);

      searchIndex.entries.push({
        id: domain.id,
        type: "domain",
        keywords,
        synonyms,
        description: domain.description,
        file: domain.file,
      });

      // Update keyword map
      for (const kw of [...keywords, ...synonyms]) {
        if (!searchIndex.keyword_map[kw]) {
          searchIndex.keyword_map[kw] = [];
        }
        if (!searchIndex.keyword_map[kw].includes(domain.id)) {
          searchIndex.keyword_map[kw].push(domain.id);
        }
      }

      log(`  ✓ ${domain.id}`);
    }
  }

  // Process entities
  log("Processing entities...");
  for (const entity of manifest.entities) {
    const filepath = join(SEMANTIC_DIR, entity.file);
    const content = loadYaml<Record<string, unknown>>(filepath);

    if (content && validateEntity(content, filepath)) {
      compiled.entities[entity.id] = content;

      const keywords = extractKeywords(content);
      const synonyms = extractSynonyms(content);

      searchIndex.entries.push({
        id: entity.id,
        type: "entity",
        keywords,
        synonyms,
        description: entity.description,
        file: entity.file,
      });

      for (const kw of [...keywords, ...synonyms]) {
        if (!searchIndex.keyword_map[kw]) {
          searchIndex.keyword_map[kw] = [];
        }
        if (!searchIndex.keyword_map[kw].includes(entity.id)) {
          searchIndex.keyword_map[kw].push(entity.id);
        }
      }

      log(`  ✓ ${entity.id}`);
    }
  }

  // Process metrics
  log("Processing metrics...");
  for (const metric of manifest.metrics) {
    const filepath = join(SEMANTIC_DIR, metric.file);
    const content = loadYaml<Record<string, unknown>>(filepath);

    if (content && validateMetric(content, filepath)) {
      compiled.metrics[metric.id] = content;

      const keywords = extractKeywords(content);
      const synonyms = extractSynonyms(content);

      searchIndex.entries.push({
        id: metric.id,
        type: "metric",
        keywords,
        synonyms,
        description: metric.description,
        file: metric.file,
      });

      for (const kw of [...keywords, ...synonyms]) {
        if (!searchIndex.keyword_map[kw]) {
          searchIndex.keyword_map[kw] = [];
        }
        if (!searchIndex.keyword_map[kw].includes(metric.id)) {
          searchIndex.keyword_map[kw].push(metric.id);
        }
      }

      log(`  ✓ ${metric.id}`);
    }
  }

  // Process policies
  log("Processing policies...");
  for (const policy of manifest.policies) {
    const filepath = join(SEMANTIC_DIR, policy.file);
    const content = loadYaml<Record<string, unknown>>(filepath);

    if (content && validatePolicy(content, filepath)) {
      compiled.policies[policy.id] = content;

      const keywords = extractKeywords(content);
      const synonyms = extractSynonyms(content);

      searchIndex.entries.push({
        id: policy.id,
        type: "policy",
        keywords,
        synonyms,
        description: policy.description,
        file: policy.file,
      });

      for (const kw of [...keywords, ...synonyms]) {
        if (!searchIndex.keyword_map[kw]) {
          searchIndex.keyword_map[kw] = [];
        }
        if (!searchIndex.keyword_map[kw].includes(policy.id)) {
          searchIndex.keyword_map[kw].push(policy.id);
        }
      }

      log(`  ✓ ${policy.id}`);
    }
  }

  // Check for errors
  if (errors.length > 0) {
    console.error("\n❌ Compilation failed with errors:");
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  // Write compiled output
  log("Writing compiled output...");

  const compiledJson = manifest.build.minify
    ? JSON.stringify(compiled)
    : JSON.stringify(compiled, null, 2);

  writeFileSync(
    join(OUTPUT_DIR, "semantic.compiled.json"),
    compiledJson,
    "utf-8"
  );

  // Write search index
  const indexJson = manifest.build.minify
    ? JSON.stringify(searchIndex)
    : JSON.stringify(searchIndex, null, 2);

  writeFileSync(
    join(OUTPUT_DIR, "semantic.index.json"),
    indexJson,
    "utf-8"
  );

  // Write manifest
  const manifestOutput = {
    version: manifest.version,
    compiled_at: new Date().toISOString(),
    schema_version: manifest.schema_version,
    domains: manifest.domains.map(d => d.id),
    entities: manifest.entities.map(e => e.id),
    metrics: manifest.metrics.map(m => m.id),
    policies: manifest.policies.map(p => p.id),
    intent_categories: Object.keys(manifest.intent_categories),
  };

  writeFileSync(
    join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify(manifestOutput, null, 2),
    "utf-8"
  );

  // Summary
  console.log("\n✅ Semantic layer compiled successfully!");
  console.log(`   Version: ${manifest.version}`);
  console.log(`   Domains: ${Object.keys(compiled.domains).length}`);
  console.log(`   Entities: ${Object.keys(compiled.entities).length}`);
  console.log(`   Metrics: ${Object.keys(compiled.metrics).length}`);
  console.log(`   Policies: ${Object.keys(compiled.policies).length}`);
  console.log(`   Index entries: ${searchIndex.entries.length}`);
  console.log(`   Keywords indexed: ${Object.keys(searchIndex.keyword_map).length}`);
  console.log(`   Output: ${OUTPUT_DIR}`);

  if (warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    warnings.forEach(w => console.log(`   - ${w}`));
  }
}

// Run
compile().catch(err => {
  console.error("Compilation failed:", err);
  process.exit(1);
});
