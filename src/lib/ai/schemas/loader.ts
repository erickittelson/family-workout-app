/**
 * YAML Schema Loader
 *
 * Loads and caches YAML schemas for AI prompts.
 * Provides typed access to training knowledge, workout structures, and coaching modes.
 */

import yaml from "js-yaml";
import fs from "fs";
import path from "path";

// =============================================================================
// Types
// =============================================================================

export interface ProgrammingRules {
  version: string;
  progressive_overload: {
    weight_increases: Record<string, { increment_lbs: number; frequency: string }>;
    rep_progression: { scheme: string; description: string; example: string };
    volume_progression: { weekly_set_target: { min: number; max: number } };
  };
  intensity_zones: Record<string, {
    percent_1rm: [number, number];
    rep_range: [number, number];
    rest_seconds: [number, number];
    rpe_target: [number, number];
  }>;
  deload: {
    triggers: Record<string, number | string>;
    protocols: Record<string, { description: string; set_reduction?: number; weight_percent?: number }>;
  };
  frequency: {
    muscle_group_guidelines: Record<string, { sessions_per_week: [number, number] }>;
    minimum_rest_between_same_muscle: Record<string, number>;
  };
  exercise_selection: {
    compound_first: { rule: string; examples: string[] };
    movement_pattern_balance: { patterns: string[] };
    limitation_handling: Record<string, { action: string } | Record<string, string>>;
  };
  feedback_rules: Record<string, Record<string, { action: string; priority?: string }>>;
  duration_guidelines: {
    warmup: { duration_minutes: number; components: string[] };
    main_workout: { by_duration: Record<string, { exercises: [number, number]; focus: string; structure: string }> };
    cooldown: { duration_minutes: number; components: string[] };
  };
}

export interface WorkoutStructures {
  version: string;
  structures: Record<string, {
    name: string;
    description: string;
    min_exercises?: number;
    max_exercises?: number;
    timing_model: Record<string, unknown>;
    when_to_use: string[];
    schema_fields: Record<string, unknown>;
  }>;
  templates: Record<string, {
    name: string;
    description: string;
    structure: string;
    typical_flow: Array<{ phase: string; duration?: number; exercises?: unknown }>;
  }>;
  multi_person: {
    equipment_sharing: { strategies: Record<string, { description: string; benefit: string }> };
  };
}

export interface CoachingModes {
  version: string;
  global_principles: {
    voice: string[];
    boundaries: string[];
    personalization: string[];
  };
  modes: Record<string, {
    name: string;
    description: string;
    persona: { tone: string; approach: string };
    response_guidelines: string[];
    [key: string]: unknown;
  }>;
  mode_detection: {
    keywords: Record<string, string[]>;
    fallback: string;
  };
}

export interface MilestoneTemplates {
  version: string;
  principles: Record<string, { description: string; rule: string }>;
  strength_goals: Record<string, { description: string; milestone_pattern: unknown }>;
  cardio_goals: Record<string, { description: string; common_targets?: unknown; milestone_pattern?: unknown }>;
  skill_goals: Record<string, { description: string; skills?: unknown }>;
  body_composition_goals: Record<string, { description: string; milestone_pattern?: unknown }>;
  consistency_goals: Record<string, { description: string; milestone_pattern?: unknown }>;
  generation_logic: {
    determine_milestones: { inputs: string[]; process: Record<string, string> };
    milestone_count_rules: Record<string, { milestones: [number, number] }>;
  };
}

export interface RecoveryWindows {
  version: string;
  muscle_groups: Record<string, {
    base_recovery_hours: number;
    category: string;
    primary_exercises?: string[];
    subcategories?: Record<string, { exercises: string[]; recovery_hours?: number }>;
    synergists?: string[];
    notes?: string;
  }>;
  workout_types: Record<string, {
    recovery_hours: number;
    muscles_worked?: string[];
    notes?: string;
  }>;
  modifiers: {
    increases_recovery: Record<string, { description: string; multiplier: number }>;
    decreases_recovery: Record<string, { description: string; multiplier: number }>;
  };
  status_logic: Record<string, {
    hours_since_worked: string;
    status: string;
    recommendation: string;
    color: string;
  }>;
}

export interface TrainingGoals {
  version: string;
  volume_landmarks: {
    description: string;
    MEV: { name: string; description: string };
    MAV: { name: string; description: string };
    MRV: { name: string; description: string };
    by_muscle_group: Record<string, {
      MEV: number;
      MAV: [number, number];
      MRV: number;
      frequency?: [number, number];
      note?: string;
    }>;
  };
  aesthetics: {
    name: string;
    description: string;
    core_principles: Record<string, unknown>;
    rep_ranges: Record<string, { range: [number, number]; rest_seconds: [number, number]; notes: string }>;
    training_splits: Record<string, { description: string; frequency: number; days: number; pros?: string[]; cons?: string[]; best_for?: string[] }>;
    techniques: Record<string, unknown>;
    periodization: Record<string, unknown>;
    body_proportions: Record<string, unknown>;
  };
  powerlifting: {
    name: string;
    description: string;
    core_principles: Record<string, unknown>;
    competition_lifts: Record<string, { technique_elements?: string[]; key_cues?: string[]; common_weak_points: Record<string, string> }>;
    accessory_work: Record<string, unknown>;
    periodization: Record<string, unknown>;
    competition_prep: Record<string, unknown>;
  };
  calisthenics: {
    name: string;
    description: string;
    core_principles: Record<string, unknown>;
    skill_progressions: Record<string, unknown>;
    training_structure: Record<string, unknown>;
  };
  general_fitness: {
    name: string;
    description: string;
    fitness_domains: string[];
    training_philosophy: Record<string, unknown>;
    weekly_template: Record<string, unknown>;
    scaling: Record<string, unknown>;
  };
}

export interface SportSpecific {
  version: string;
  athletic_foundations: {
    description: string;
    movement_quality: Record<string, unknown>;
    force_velocity_curve: {
      description: string;
      zones: Record<string, { description: string; examples: string[]; load?: string; benefit: string }>;
    };
    energy_systems: Record<string, { duration: string; recovery: string; sports: string[]; training: string }>;
  };
  sprinting: {
    name: string;
    description: string;
    sprint_phases: Record<string, { distance: string; body_position?: string; key_cues: string[]; training: { exercises: string[] } }>;
    strength_training: Record<string, unknown>;
    plyometrics: Record<string, unknown>;
  };
  cheerleading: {
    name: string;
    description: string;
    physical_demands: Record<string, unknown>;
    strength_training: Record<string, unknown>;
    jump_training: Record<string, unknown>;
    tumbling_strength: Record<string, unknown>;
    flexibility: Record<string, unknown>;
  };
  football: {
    name: string;
    description: string;
    physical_demands: Record<string, unknown>;
    position_profiles: Record<string, unknown>;
    strength_program: Record<string, unknown>;
    speed_agility: Record<string, unknown>;
    conditioning: Record<string, unknown>;
  };
  baseball: {
    name: string;
    description: string;
    physical_demands: Record<string, unknown>;
    rotational_power: Record<string, unknown>;
    arm_care: Record<string, unknown>;
    strength_training: Record<string, unknown>;
    speed_agility: Record<string, unknown>;
    position_specific: Record<string, unknown>;
  };
  basketball: {
    name: string;
    description: string;
    physical_demands: string[];
    training_priorities: Record<string, unknown>;
    injury_prevention: Record<string, unknown>;
  };
  soccer: {
    name: string;
    description: string;
    physical_demands: string[];
    training_priorities: Record<string, unknown>;
    injury_prevention: Record<string, unknown>;
  };
  youth_athlete: {
    name: string;
    description: string;
    principles: Record<string, unknown>;
    age_guidelines: Record<string, unknown>;
    injury_prevention: Record<string, unknown>;
  };
}

// =============================================================================
// Cache
// =============================================================================

const schemaCache = new Map<string, unknown>();
const SCHEMAS_DIR = path.join(process.cwd(), "src/lib/ai/schemas");

// =============================================================================
// Loader Functions
// =============================================================================

function loadYaml<T>(filename: string): T {
  const cacheKey = filename;

  // Return cached if available (in production)
  if (process.env.NODE_ENV === "production" && schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey) as T;
  }

  const filePath = path.join(SCHEMAS_DIR, filename);
  const fileContents = fs.readFileSync(filePath, "utf8");
  const parsed = yaml.load(fileContents) as T;

  schemaCache.set(cacheKey, parsed);
  return parsed;
}

/**
 * Load programming rules (progressive overload, intensity zones, etc.)
 */
export function getProgrammingRules(): ProgrammingRules {
  return loadYaml<ProgrammingRules>("programming-rules.yaml");
}

/**
 * Load workout structure templates (supersets, AMRAP, EMOM, etc.)
 */
export function getWorkoutStructures(): WorkoutStructures {
  return loadYaml<WorkoutStructures>("workout-structures.yaml");
}

/**
 * Load coaching mode definitions
 */
export function getCoachingModes(): CoachingModes {
  return loadYaml<CoachingModes>("coaching-modes.yaml");
}

/**
 * Load milestone generation templates
 */
export function getMilestoneTemplates(): MilestoneTemplates {
  return loadYaml<MilestoneTemplates>("milestones.yaml");
}

/**
 * Load muscle recovery windows
 */
export function getRecoveryWindows(): RecoveryWindows {
  return loadYaml<RecoveryWindows>("recovery-windows.yaml");
}

/**
 * Load training goals (aesthetics, powerlifting, calisthenics, etc.)
 */
export function getTrainingGoals(): TrainingGoals {
  return loadYaml<TrainingGoals>("training-goals.yaml");
}

/**
 * Load sport-specific training protocols
 */
export function getSportSpecific(): SportSpecific {
  return loadYaml<SportSpecific>("sport-specific.yaml");
}

// =============================================================================
// Helper Functions for AI Prompts
// =============================================================================

/**
 * Get intensity zone for a given training goal
 */
export function getIntensityZone(goal: "strength" | "hypertrophy" | "endurance" | "power" | "recovery") {
  const rules = getProgrammingRules();
  return rules.intensity_zones[goal];
}

/**
 * Get recovery hours for a muscle group
 */
export function getMuscleRecoveryHours(muscleGroup: string): number {
  const recovery = getRecoveryWindows();
  const muscle = recovery.muscle_groups[muscleGroup.toLowerCase()];
  return muscle?.base_recovery_hours ?? 48; // Default to 48 hours
}

/**
 * Get workout duration guidelines
 */
export function getDurationGuidelines(durationMinutes: number) {
  const rules = getProgrammingRules();
  const durations = rules.duration_guidelines.main_workout.by_duration;

  // Find closest duration match
  const durationKey = `${Math.round(durationMinutes / 15) * 15}_minutes`;
  return durations[durationKey] ?? durations["45_minutes"]; // Default to 45 min
}

/**
 * Get coaching mode configuration
 */
export function getCoachingMode(mode: string) {
  const coaching = getCoachingModes();
  return coaching.modes[mode] ?? coaching.modes["general"];
}

/**
 * Detect coaching mode from message content
 */
export function detectCoachingMode(message: string): string {
  const coaching = getCoachingModes();
  const keywords = coaching.mode_detection.keywords;
  const lowerMessage = message.toLowerCase();

  for (const [mode, modeKeywords] of Object.entries(keywords)) {
    for (const keyword of modeKeywords) {
      if (lowerMessage.includes(keyword)) {
        return mode;
      }
    }
  }

  return coaching.mode_detection.fallback;
}

/**
 * Get workout structure definition
 */
export function getWorkoutStructure(structureType: string) {
  const structures = getWorkoutStructures();
  return structures.structures[structureType] ?? structures.structures["standard"];
}

/**
 * Get milestone template for a goal category
 */
export function getMilestoneTemplate(category: string, goalType: string) {
  const templates = getMilestoneTemplates();

  switch (category) {
    case "strength":
      return templates.strength_goals[goalType];
    case "cardio":
      return templates.cardio_goals[goalType];
    case "skill":
      return templates.skill_goals[goalType];
    case "weight":
      return templates.body_composition_goals[goalType];
    default:
      return null;
  }
}

// =============================================================================
// Prompt Injection Helpers
// =============================================================================

/**
 * Generate a compact text summary of programming rules for prompt injection
 */
export function getProgrammingRulesForPrompt(): string {
  const rules = getProgrammingRules();

  return `## Training Programming Rules

### Intensity Zones
${Object.entries(rules.intensity_zones)
    .map(([zone, config]) =>
      `- **${zone}**: ${config.percent_1rm[0]}-${config.percent_1rm[1]}% 1RM, ${config.rep_range[0]}-${config.rep_range[1]} reps, ${config.rest_seconds[0]}-${config.rest_seconds[1]}s rest, RPE ${config.rpe_target[0]}-${config.rpe_target[1]}`
    )
    .join("\n")}

### Progressive Overload
- Upper body: +${rules.progressive_overload.weight_increases.upper_body.increment_lbs} lbs when hitting rep targets
- Lower body: +${rules.progressive_overload.weight_increases.lower_body.increment_lbs} lbs when hitting rep targets
- Weekly sets per muscle: ${rules.progressive_overload.volume_progression.weekly_set_target.min}-${rules.progressive_overload.volume_progression.weekly_set_target.max}

### Deload Triggers
- After ${rules.deload.triggers.consecutive_weeks} consecutive training weeks
- When fatigue score reaches ${rules.deload.triggers.fatigue_score}/10

### Exercise Selection
- ${rules.exercise_selection.compound_first.rule}
- Balance movement patterns: ${rules.exercise_selection.movement_pattern_balance.patterns.join(", ")}`;
}

/**
 * Generate recovery status text for a member's muscle groups
 */
export function getRecoveryStatusForPrompt(muscleWorkHistory: Record<string, Date>): string {
  const recovery = getRecoveryWindows();
  const now = new Date();
  const lines: string[] = [];

  for (const [muscle, lastWorked] of Object.entries(muscleWorkHistory)) {
    const hoursSince = Math.floor((now.getTime() - lastWorked.getTime()) / (1000 * 60 * 60));
    const muscleConfig = recovery.muscle_groups[muscle.toLowerCase()];
    const requiredHours = muscleConfig?.base_recovery_hours ?? 48;

    let status: string;
    if (hoursSince >= requiredHours) {
      status = "✅ Ready";
    } else if (hoursSince >= requiredHours * 0.75) {
      status = "🟡 Light work OK";
    } else {
      status = "🔴 Still recovering";
    }

    lines.push(`- ${muscle}: ${status} (${hoursSince}h since last trained, needs ${requiredHours}h)`);
  }

  return lines.length > 0
    ? `## Muscle Recovery Status\n${lines.join("\n")}`
    : "";
}

/**
 * Generate coaching mode instructions for prompt
 */
export function getCoachingModeForPrompt(mode: string): string {
  const modeConfig = getCoachingMode(mode);

  return `## Coaching Mode: ${modeConfig.name}

**Tone**: ${modeConfig.persona.tone}
**Approach**: ${modeConfig.persona.approach}

**Guidelines**:
${modeConfig.response_guidelines.map((g) => `- ${g}`).join("\n")}`;
}

/**
 * Generate workout structure instructions for prompt
 */
export function getWorkoutStructureForPrompt(structureType: string): string {
  const structure = getWorkoutStructure(structureType);

  return `## ${structure.name}
${structure.description}

**When to use**: ${structure.when_to_use.join("; ")}
${structure.min_exercises ? `**Min exercises**: ${structure.min_exercises}` : ""}
${structure.max_exercises ? `**Max exercises**: ${structure.max_exercises}` : ""}`;
}

// =============================================================================
// EXERCISES TAXONOMY
// =============================================================================

export interface ExercisesTaxonomy {
  version: string;
  muscle_groups: {
    upper_body: Record<string, unknown>;
    lower_body: Record<string, unknown>;
    core: Record<string, unknown>;
  };
  categories: Record<string, {
    description: string;
    subcategories?: Record<string, { description: string; examples: string[] }>;
  }>;
  equipment: Record<string, Record<string, unknown>>;
  movement_patterns: Record<string, {
    examples: string[];
    muscles: string[];
    key_cue?: string;
  }>;
  selection_rules: Record<string, unknown>;
}

/**
 * Load exercises taxonomy
 */
export function getExercisesTaxonomy(): ExercisesTaxonomy {
  return loadYaml<ExercisesTaxonomy>("exercises-taxonomy.yaml");
}

/**
 * Get movement pattern info for exercise selection
 */
export function getMovementPattern(pattern: string) {
  const taxonomy = getExercisesTaxonomy();
  return taxonomy.movement_patterns[pattern];
}

/**
 * Get muscle group info for recovery and targeting
 */
export function getMuscleGroupInfo(region: "upper_body" | "lower_body" | "core") {
  const taxonomy = getExercisesTaxonomy();
  return taxonomy.muscle_groups[region];
}

/**
 * Generate exercise selection rules for prompt
 */
export function getExerciseSelectionRulesForPrompt(): string {
  const taxonomy = getExercisesTaxonomy();

  return `## Exercise Selection Guidelines

### Movement Patterns
${Object.entries(taxonomy.movement_patterns)
    .map(([pattern, info]) =>
      `- **${pattern}**: ${info.examples.slice(0, 3).join(", ")} → ${info.muscles.join(", ")}`
    )
    .join("\n")}

### Categories
${Object.entries(taxonomy.categories)
    .map(([cat, info]) => `- **${cat}**: ${info.description}`)
    .join("\n")}`;
}

// =============================================================================
// SEMANTIC CONFIG
// =============================================================================

// =============================================================================
// ONBOARDING SCHEMA
// =============================================================================

export interface OnboardingPhase {
  order: number;
  goal: string;
  data_collected: string[];
  feature_intro: string;
  opening_message?: string;
  transition_message?: string;
  transition_template?: string;
  completion_template?: string;
  quick_replies?: (string | null)[];
  follow_up_questions?: string[];
  action?: string;
  extraction_hints?: Record<string, unknown>;
}

export interface OnboardingSchema {
  version: string;
  last_updated: string;
  onboarding: {
    description: string;
    total_phases: number;
    persona: {
      name: string;
      avatar_emoji: string;
      traits: string[];
      voice_guidelines: string[];
      boundaries: string[];
    };
    phases: Record<string, OnboardingPhase>;
    extraction_schema: Record<string, unknown>;
    response_guidelines: {
      max_message_length: number;
      tone: string;
      emoji_usage: string;
      personalization: string[];
      transition_patterns: {
        acknowledgment_starters: string[];
        bridging_phrases: string[];
      };
      skip_handling: {
        phrases: string[];
        response: string;
      };
    };
  };
}

/**
 * Load onboarding schema for conversational flow
 */
export function getOnboardingSchema(): OnboardingSchema {
  return loadYaml<OnboardingSchema>("onboarding.yaml");
}

/**
 * Get a specific onboarding phase by name
 */
export function getOnboardingPhase(phaseName: string): OnboardingPhase | null {
  const schema = getOnboardingSchema();
  return schema.onboarding.phases[phaseName] || null;
}

/**
 * Get ordered list of onboarding phases
 */
export function getOnboardingPhaseOrder(): string[] {
  const schema = getOnboardingSchema();
  return Object.entries(schema.onboarding.phases)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([name]) => name);
}

/**
 * Generate onboarding persona prompt for AI
 */
export function getOnboardingPersonaPrompt(): string {
  const schema = getOnboardingSchema();
  const { persona, response_guidelines } = schema.onboarding;

  return `## Your Persona: ${persona.name} ${persona.avatar_emoji}

### Personality Traits
${persona.traits.map(t => `- ${t}`).join("\n")}

### Voice Guidelines
${persona.voice_guidelines.map(g => `- ${g}`).join("\n")}

### Boundaries
${persona.boundaries.map(b => `- ${b}`).join("\n")}

### Response Guidelines
- Keep messages under ${response_guidelines.max_message_length} words
- Tone: ${response_guidelines.tone}
- Emoji usage: ${response_guidelines.emoji_usage}
- ${response_guidelines.personalization.join("; ")}

### Acknowledgment Starters (vary these)
${response_guidelines.transition_patterns.acknowledgment_starters.join(", ")}

### Skip Handling
If user says: ${response_guidelines.skip_handling.phrases.join(", ")}
Respond with something like: "${response_guidelines.skip_handling.response}"`;
}

export interface SemanticConfig {
  version: string;
  app_name: string;
  ai_provider: string;
  schemas: Record<string, {
    file: string;
    description: string;
    inject_into: string[];
    cache_ttl_seconds: number;
  }>;
  models: Record<string, {
    id: string;
    provider: string;
    context_window: number;
    output_limit: number;
    pricing: { input_per_1m: number; output_per_1m: number; cached_input_per_1m: number };
    use_for: string[];
  }>;
  tasks: Record<string, {
    model: string;
    reasoning_level: string;
    timeout_seconds: number;
    cache_enabled: boolean;
    cache_ttl_seconds?: number;
    schemas_required: string[];
    context_sources: string[];
  }>;
  features: Record<string, boolean>;
}

/**
 * Load semantic configuration
 */
export function getSemanticConfig(): SemanticConfig {
  return loadYaml<SemanticConfig>("semantic-config.yaml");
}

/**
 * Get model configuration for a task
 */
export function getModelForTask(task: string) {
  const config = getSemanticConfig();
  const taskConfig = config.tasks[task];
  if (!taskConfig) return config.models.primary;

  return config.models[taskConfig.model] || config.models.primary;
}

/**
 * Get task configuration
 */
export function getTaskConfig(task: string) {
  const config = getSemanticConfig();
  return config.tasks[task];
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: string): boolean {
  const config = getSemanticConfig();
  return config.features[feature] ?? false;
}

/**
 * Get all schemas required for a task
 */
export function getSchemasForTask(task: string): string[] {
  const config = getSemanticConfig();
  const taskConfig = config.tasks[task];
  return taskConfig?.schemas_required || [];
}

// =============================================================================
// TRAINING GOALS PROMPT HELPERS
// =============================================================================

/**
 * Get volume landmarks for a muscle group
 */
export function getVolumeGuidance(muscleGroup: string): string {
  const goals = getTrainingGoals();
  const muscle = goals.volume_landmarks.by_muscle_group[muscleGroup.toLowerCase()];

  if (!muscle) return "";

  return `**${muscleGroup}**: MEV ${muscle.MEV} sets, MAV ${muscle.MAV[0]}-${muscle.MAV[1]} sets, MRV ${muscle.MRV} sets/week`;
}

/**
 * Generate training goal rules for prompt based on member's goal
 */
export function getTrainingGoalForPrompt(
  goalType: "aesthetics" | "powerlifting" | "calisthenics" | "general_fitness" | "strength" | "hypertrophy"
): string {
  const goals = getTrainingGoals();

  // Map aliases
  const goalMap: Record<string, string> = {
    "strength": "powerlifting",
    "hypertrophy": "aesthetics",
    "muscle": "aesthetics",
    "bodybuilding": "aesthetics",
  };
  const mappedGoal = goalMap[goalType] || goalType;

  if (mappedGoal === "aesthetics") {
    const aesthetics = goals.aesthetics;
    return `## Training Goal: Aesthetics/Hypertrophy

**Focus**: ${aesthetics.description}

### Rep Ranges
${Object.entries(aesthetics.rep_ranges)
  .map(([name, config]) => `- **${name}**: ${config.range[0]}-${config.range[1]} reps, ${config.rest_seconds[0]}-${config.rest_seconds[1]}s rest - ${config.notes}`)
  .join("\n")}

### Volume Guidelines (Sets/Muscle/Week)
${Object.entries(goals.volume_landmarks.by_muscle_group)
  .slice(0, 6)
  .map(([muscle, config]) => `- ${muscle}: MEV ${config.MEV}, MAV ${config.MAV[0]}-${config.MAV[1]}, MRV ${config.MRV}`)
  .join("\n")}

### Key Techniques
- Drop sets: Reduce weight, continue without rest (last set of isolation exercises)
- Rest-pause: Hit failure, rest 10-15s, continue
- Supersets: Antagonist pairing for time efficiency
- Slow eccentrics: 3-4 second lowering for mechanical tension`;
  }

  if (mappedGoal === "powerlifting") {
    const pl = goals.powerlifting;
    return `## Training Goal: Powerlifting/Strength

**Focus**: ${pl.description}

### Competition Lifts
${Object.entries(pl.competition_lifts)
  .map(([lift, config]) => `**${lift}**:
  - Key cues: ${config.key_cues?.join(", ") || "Focus on technique"}
  - Weak points: ${Object.entries(config.common_weak_points).map(([point, fix]) => `${point}: ${fix}`).join("; ")}`)
  .join("\n\n")}

### Periodization Approach
- Use RPE 8-9 for top sets
- Variations address weak points
- Program compound movements 2-4x/week
- Accessories support main lifts`;
  }

  if (mappedGoal === "calisthenics") {
    const cal = goals.calisthenics;
    return `## Training Goal: Calisthenics

**Focus**: ${cal.description}

### Core Principles
- Skills before fatigue: Practice technical skills when fresh
- Progressive overload: Harder progressions > more reps
- Greasing the groove: Frequent sub-maximal practice

### Key Skill Progressions
- **Pull**: Dead hang → Scap pulls → Negatives → Pull-ups → Muscle-up
- **Push**: Incline → Push-up → Diamond → Archer → One-arm
- **Handstand**: Wall plank → Wall HS → Kick-ups → Freestanding
- **Legs**: Squat → Bulgarian → Shrimp → Pistol

### Training Structure
- Skills first (20-30 min)
- Strength work (20-30 min)
- Core (10 min)`;
  }

  // General fitness
  const gf = goals.general_fitness;
  return `## Training Goal: General Fitness

**Focus**: ${gf.description}

### 10 Fitness Domains
${gf.fitness_domains.map(d => `- ${d}`).join("\n")}

### Weekly Structure
- Day 1: Strength focus
- Day 2: Conditioning (AMRAP/EMOM)
- Day 3: Skill + Strength
- Day 4: Rest/Active recovery
- Day 5: Mixed modal
- Day 6: Long aerobic (Zone 2)

### Scaling
Always scale to maintain stimulus while respecting limitations.`;
}

/**
 * Generate sport-specific protocol for prompt
 */
export function getSportProtocolForPrompt(
  sport: "sprinting" | "cheerleading" | "football" | "baseball" | "basketball" | "soccer" | "youth"
): string {
  const sports = getSportSpecific();

  if (sport === "sprinting") {
    const s = sports.sprinting;
    return `## Sport: ${s.name}

**Focus**: ${s.description}

### Sprint Phases
${Object.entries(s.sprint_phases)
  .map(([phase, config]) => `**${phase}** (${config.distance}):
  - Position: ${config.body_position || "Varies"}
  - Cues: ${config.key_cues.join(", ")}
  - Exercises: ${config.training.exercises.join(", ")}`)
  .join("\n\n")}

### Training Priorities
- Full recovery between sprints (2-5 min per 10m)
- Strength: Squat 2x BW, Trap bar DL 2.5x BW
- Plyometrics: 40-150 contacts per session depending on intensity`;
  }

  if (sport === "cheerleading") {
    const c = sports.cheerleading;
    return `## Sport: ${c.name}

**Focus**: ${c.description}

### Physical Demands
- Tumbling: Lower body power, core strength, upper body pressing
- Stunting: Bases need leg/hip strength; flyers need core/flexibility
- Jumps: Vertical power, hip flexor flexibility

### Strength Priorities
- **Lower**: Squats, Bulgarian split squats, hip thrusts, calf raises
- **Upper**: Overhead press, push-ups, pull-ups, pike press
- **Core**: Hollow body (60s), arch hold (30s), hanging leg raises

### Jump Training Focus
- Toe touch: Hip flexor strength + flexibility
- Full split progression for hurdlers
- Plyometrics for height

### Tumbling Prerequisites
- Back handspring: Hollow hold 30s, handstand 10s, push-ups 15
- Back tuck: Strong BHS, 18"+ vertical, 10 consecutive tuck jumps`;
  }

  if (sport === "football") {
    const f = sports.football;
    return `## Sport: ${f.name}

**Focus**: ${f.description}

### Position-Specific Training
**Linemen**:
- Priority: Absolute strength, anchor strength, hand fighting
- Targets: Squat 2x+ BW, Bench 1.5x+ BW, <1.8s 10-yard

**Skill Positions** (WR/DB/RB):
- Priority: Speed, change of direction, leaping
- Targets: <4.6s 40, 34"+ vertical, <7.0s 3-cone

**Linebackers**:
- Priority: Explosive power, tackling strength, coverage speed
- Targets: Squat 2x BW, <4.7s 40

### Off-Season Phases
1. Hypertrophy (4-6 weeks): Build muscle base
2. Strength (4-6 weeks): Increase maxes 10-15%
3. Power (4-6 weeks): Convert to explosiveness
4. Pre-season (4 weeks): Sport-specific prep`;
  }

  if (sport === "baseball") {
    const b = sports.baseball;
    return `## Sport: ${b.name}

**Focus**: ${b.description}

### Rotational Power
- Med ball scoop toss, perpendicular throw, shot put throw
- Cable rotations, Pallof press, cable chops
- 3x6 each side, 6-12 lb med balls

### Arm Care (CRITICAL)
- Daily: Band work, shoulder circles, wrist circles
- Strengthening: External/internal rotation 3x15, prone Y-T-W, face pulls
- Long toss progression: 60ft → 90ft → 120ft → 150ft+
- Recovery: Light band work after throwing, ice if needed

### Strength Training
- **Lower**: Front squats, RDL, lateral lunges, single-leg work
- **Upper**: DB bench (shoulder-friendly), rows 4x10, pull-ups, landmine press
- **Core**: Rotational focus - med ball throws, cable rotations

**Caution**: Avoid excessive pressing volume for throwing athletes`;
  }

  if (sport === "basketball") {
    const b = sports.basketball;
    return `## Sport: ${b.name}

**Focus**: ${b.description}

### Training Priorities
**Vertical Jump** (target: +2-6" per off-season):
- Strength: Back squat 1.5-2x BW
- Power: Power cleans, squat jumps, box jumps
- Reactive: Depth jumps, approach jumps

**Lateral Movement**:
- Drills: Defensive slides, lateral bounds, 5-10-5
- Strength: Lateral lunges, Copenhagen adduction

### Conditioning
- Game demands: 8-12 second bursts
- Training: Court sprints, suicides, 17s, full-court drills

### Injury Prevention
- Ankle: Single-leg balance, proprioception work
- Knee: Terminal knee extension, proper landing mechanics
- ACL: Hamstring strength, hip stability, deceleration training`;
  }

  if (sport === "soccer") {
    const s = sports.soccer;
    return `## Sport: ${s.name}

**Focus**: ${s.description}

### Physical Demands
- Aerobic: 8-13 km per game
- Repeated sprint ability
- Change of direction
- Kicking power

### Training Priorities
**Aerobic Base**:
- Target: Yo-Yo intermittent >Level 19, VO2max >55 ml/kg/min
- Methods: Tempo runs, small-sided games, fartlek

**Repeated Sprint**:
- 6 x 30-40m sprints, 20-30s rest, 3 sets

**Strength**:
- Squat 1.8x BW, Nordic curls (hamstring prevention), hip adduction (groin)

### Injury Prevention
- FIFA 11+ warmup before every session
- Copenhagen adduction program for groin`;
  }

  // Youth athlete
  const y = sports.youth_athlete;
  return `## Youth Athletic Development

**Focus**: Age-appropriate training for young athletes

### Principles
- Long-term development over short-term performance
- Movement literacy is priority #1
- Fun and variety build lifelong habits
- Multiple sports exposure, no early specialization

### Age Guidelines
**Ages 6-9**: Games, play, fundamental movements
**Ages 10-13**: Sport skills, bodyweight strength, light resistance with good form
**Ages 14-18**: Progressive strength training with proper coaching

### Overuse Prevention
- No single sport >8 months/year
- Hours/week < age (12-year-old < 12 hours)
- 1-2 rest days per week minimum
- Annual rest period of 1-3 months`;
}

// =============================================================================
// WORKOUT GENERATION CONFIG
// =============================================================================

export interface WorkoutGenerationConfig {
  workout_generation_config: {
    version: string;
    intensity: {
      levels: Record<string, {
        label: string;
        description: string;
        rpe_range: [number, number];
        volume_modifier: number;
        rest_modifier: number;
      }>;
      default: string;
    };
    duration: {
      options: number[];
      exercise_count_mapping: Record<string, {
        min: number;
        max: number;
        typical_structure: string;
      }>;
      time_per_exercise: {
        compound: { warmup_sets: number; working_sets: number; rest_between_sets: number };
        isolation: { warmup_sets: number; working_sets: number; rest_between_sets: number };
        cardio: { per_set: number; rest_between_sets: number };
      };
      default: number;
    };
    volume: {
      sets_per_muscle_weekly: {
        absolute_minimum: number;
        minimum_effective: number;
        maximum_effective: number;
        diminishing_returns: number;
        by_goal: Record<string, { min: number; max: number; description: string }>;
      };
      sets_per_exercise: Record<string, { min: number; max: number; typical: number }>;
      rep_ranges: Record<string, { primary: [number, number]; secondary: [number, number] }>;
    };
    exercise_selection: {
      variety: {
        avoid_same_exercise_within_days: number;
        max_same_exercise_per_week: number;
        min_unique_exercises_per_muscle: number;
      };
      compound_isolation_ratio: Record<string, { compound: number; isolation: number; description: string }>;
      movement_patterns: { upper: string[]; lower: string[] };
      pattern_priority: Record<string, string[]>;
    };
    tempo: {
      enabled: boolean;
      presets: Record<string, { value: string; description: string }>;
      by_exercise_type: Record<string, string>;
    };
    presets: Record<string, {
      label: string;
      description: string;
      duration: number;
      intensity: string;
      exercise_count: [number, number];
      focus: string;
      structure: string;
      rest_periods: string;
    }>;
    rest_periods: {
      categories: Record<string, {
        between_sets: [number, number];
        between_exercises: [number, number];
        description: string;
      }>;
      by_exercise: Record<string, number>;
    };
    recovery_integration: {
      enabled: boolean;
      thresholds: Record<string, number>;
      volume_adjustment: Record<string, number>;
      prefer_fresh_muscles: boolean;
    };
    periodization: {
      weekly_progression: {
        volume_increase_rate: number;
        intensity_increase_rate: number;
        max_weeks_before_deload: number;
      };
      deload: {
        frequency_weeks: number;
        volume_reduction: number;
        intensity_reduction: number;
        duration_reduction: number;
      };
      mesocycle: {
        typical_length_weeks: number;
        phases: string[];
      };
    };
  };
}

/**
 * Load workout generation configuration
 */
export function getWorkoutGenerationConfig(): WorkoutGenerationConfig {
  return loadYaml<WorkoutGenerationConfig>("workout-generation-config.yaml");
}

/**
 * Get intensity level configuration
 */
export function getIntensityLevel(level: string) {
  const config = getWorkoutGenerationConfig();
  return config.workout_generation_config.intensity.levels[level] ||
    config.workout_generation_config.intensity.levels.moderate;
}

/**
 * Get workout preset configuration
 */
export function getWorkoutPreset(presetName: string) {
  const config = getWorkoutGenerationConfig();
  return config.workout_generation_config.presets[presetName];
}

/**
 * Get exercise count for duration
 */
export function getExerciseCountForDuration(durationMinutes: number): { min: number; max: number } {
  const config = getWorkoutGenerationConfig();
  const mapping = config.workout_generation_config.duration.exercise_count_mapping;
  const durationKey = String(durationMinutes);
  
  if (mapping[durationKey]) {
    return { min: mapping[durationKey].min, max: mapping[durationKey].max };
  }
  
  // Find closest duration
  const durations = Object.keys(mapping).map(Number).sort((a, b) => a - b);
  const closest = durations.reduce((prev, curr) => 
    Math.abs(curr - durationMinutes) < Math.abs(prev - durationMinutes) ? curr : prev
  );
  
  return { min: mapping[String(closest)].min, max: mapping[String(closest)].max };
}

/**
 * Get rest period config
 */
export function getRestPeriodConfig(category: string) {
  const config = getWorkoutGenerationConfig();
  return config.workout_generation_config.rest_periods.categories[category] ||
    config.workout_generation_config.rest_periods.categories.moderate;
}

/**
 * Get volume config for a goal
 */
export function getVolumeConfigForGoal(goal: string) {
  const config = getWorkoutGenerationConfig();
  return config.workout_generation_config.volume.sets_per_muscle_weekly.by_goal[goal];
}

/**
 * Get rep range for a goal
 */
export function getRepRangeForGoal(goal: string): { primary: [number, number]; secondary: [number, number] } {
  const config = getWorkoutGenerationConfig();
  return config.workout_generation_config.volume.rep_ranges[goal] ||
    config.workout_generation_config.volume.rep_ranges.hypertrophy;
}

/**
 * Get compound/isolation ratio for goal
 */
export function getCompoundIsolationRatio(goal: string) {
  const config = getWorkoutGenerationConfig();
  return config.workout_generation_config.exercise_selection.compound_isolation_ratio[goal] ||
    config.workout_generation_config.exercise_selection.compound_isolation_ratio.hypertrophy;
}

/**
 * Generate workout generation config for prompt
 */
export function getWorkoutGenerationConfigForPrompt(
  options: {
    intensity?: string;
    duration?: number;
    preset?: string;
    goal?: string;
    restPreference?: string;
  }
): string {
  const config = getWorkoutGenerationConfig().workout_generation_config;
  const parts: string[] = [];
  
  // Intensity configuration
  if (options.intensity) {
    const intensityConfig = config.intensity.levels[options.intensity];
    if (intensityConfig) {
      parts.push(`### Intensity: ${intensityConfig.label}
${intensityConfig.description}
- RPE Target: ${intensityConfig.rpe_range[0]}-${intensityConfig.rpe_range[1]}
- Volume Modifier: ${intensityConfig.volume_modifier}x
- Rest Modifier: ${intensityConfig.rest_modifier}x`);
    }
  }
  
  // Duration-based exercise count
  if (options.duration) {
    const exerciseCount = getExerciseCountForDuration(options.duration);
    parts.push(`### Duration Guidelines for ${options.duration} Minutes
- Exercise Count: ${exerciseCount.min}-${exerciseCount.max} exercises
- Use the time wisely with efficient exercise selection`);
  }
  
  // Goal-specific volume
  if (options.goal) {
    const volumeConfig = config.volume.sets_per_muscle_weekly.by_goal[options.goal];
    const repRange = config.volume.rep_ranges[options.goal];
    const ratio = config.exercise_selection.compound_isolation_ratio[options.goal];
    
    if (volumeConfig && repRange) {
      parts.push(`### Goal-Specific Programming: ${options.goal}
- Sets per muscle weekly: ${volumeConfig.min}-${volumeConfig.max}
- Primary rep range: ${repRange.primary[0]}-${repRange.primary[1]}
- Secondary rep range: ${repRange.secondary[0]}-${repRange.secondary[1]}
${ratio ? `- Compound/Isolation ratio: ${ratio.compound * 100}% compound / ${ratio.isolation * 100}% isolation` : ""}`);
    }
  }
  
  // Rest preference
  if (options.restPreference) {
    const restConfig = config.rest_periods.categories[options.restPreference];
    if (restConfig) {
      parts.push(`### Rest Periods: ${restConfig.description}
- Between Sets: ${restConfig.between_sets[0]}-${restConfig.between_sets[1]} seconds
- Between Exercises: ${restConfig.between_exercises[0]}-${restConfig.between_exercises[1]} seconds`);
    }
  }
  
  // Preset
  if (options.preset) {
    const presetConfig = config.presets[options.preset];
    if (presetConfig) {
      parts.push(`### Using Preset: ${presetConfig.label}
${presetConfig.description}
- Duration: ${presetConfig.duration} min
- Intensity: ${presetConfig.intensity}
- Exercise Count: ${presetConfig.exercise_count[0]}-${presetConfig.exercise_count[1]}
- Focus: ${presetConfig.focus}
- Structure: ${presetConfig.structure}
- Rest: ${presetConfig.rest_periods}`);
    }
  }
  
  return parts.join("\n\n");
}

/**
 * Apply intensity modifiers to workout parameters
 */
export function applyIntensityModifiers(
  baseParams: { volume: number; rest: number; rpe: number },
  intensity: string
): { volume: number; rest: number; rpe: number } {
  const intensityConfig = getIntensityLevel(intensity);
  
  return {
    volume: Math.round(baseParams.volume * intensityConfig.volume_modifier),
    rest: Math.round(baseParams.rest * intensityConfig.rest_modifier),
    rpe: intensityConfig.rpe_range[0] + (intensityConfig.rpe_range[1] - intensityConfig.rpe_range[0]) / 2,
  };
}

// =============================================================================
// COMBINED PROMPT BUILDER
// =============================================================================

/**
 * Build a complete prompt with all required schemas for a task
 */
export function buildPromptContext(
  task: string,
  additionalContext?: Record<string, string>,
  options?: {
    trainingGoal?: "aesthetics" | "powerlifting" | "calisthenics" | "general_fitness" | "strength" | "hypertrophy";
    sport?: "sprinting" | "cheerleading" | "football" | "baseball" | "basketball" | "soccer" | "youth";
    coachingMode?: string;
    workoutStructure?: string;
    muscleWorkHistory?: Record<string, Date>;
  }
): string {
  const requiredSchemas = getSchemasForTask(task);
  const parts: string[] = [];

  for (const schema of requiredSchemas) {
    switch (schema) {
      case "programming_rules":
        parts.push(getProgrammingRulesForPrompt());
        break;
      case "exercises_taxonomy":
        parts.push(getExerciseSelectionRulesForPrompt());
        break;
      case "training_goals":
        // Include goal-specific context if provided
        if (options?.trainingGoal) {
          parts.push(getTrainingGoalForPrompt(options.trainingGoal));
        } else {
          // Default to general fitness overview
          parts.push(getTrainingGoalForPrompt("general_fitness"));
        }
        break;
      case "sport_specific":
        // Include sport-specific protocol if provided
        if (options?.sport) {
          parts.push(getSportProtocolForPrompt(options.sport));
        }
        break;
      case "coaching_modes":
        if (options?.coachingMode) {
          parts.push(getCoachingModeForPrompt(options.coachingMode));
        }
        break;
      case "workout_structures":
        if (options?.workoutStructure) {
          parts.push(getWorkoutStructureForPrompt(options.workoutStructure));
        }
        break;
      case "recovery_windows":
        if (options?.muscleWorkHistory) {
          parts.push(getRecoveryStatusForPrompt(options.muscleWorkHistory));
        }
        break;
      case "milestones":
        // Milestones are typically accessed directly via getMilestoneTemplate()
        // for specific goal categories, not as a general prompt injection
        break;
    }
  }

  if (additionalContext) {
    for (const [key, value] of Object.entries(additionalContext)) {
      parts.push(`## ${key}\n${value}`);
    }
  }

  return parts.join("\n\n");
}

// =============================================================================
// Clear cache (useful for development/testing)
// =============================================================================

export function clearSchemaCache() {
  schemaCache.clear();
}
