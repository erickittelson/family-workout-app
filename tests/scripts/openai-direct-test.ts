#!/usr/bin/env npx tsx
/**
 * Direct OpenAI API Performance Test
 *
 * Tests OpenAI API directly (bypasses app auth) to measure:
 * - Response times for different reasoning levels
 * - Structured output generation speed
 * - Streaming performance
 *
 * Usage:
 *   npx tsx tests/scripts/openai-direct-test.ts
 *
 * Requires:
 *   OPENAI_API_KEY environment variable
 */

import { generateObject, generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load env from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}min`;
}

// Timeout thresholds (ms)
const TIMEOUT_THRESHOLDS = {
  none: 30000,
  quick: 45000,
  standard: 90000,
  deep: 120000,
  max: 180000,
};

type ReasoningLevel = keyof typeof TIMEOUT_THRESHOLDS;

interface TestResult {
  test: string;
  reasoningLevel: ReasoningLevel;
  status: 'pass' | 'fail' | 'timeout';
  duration: number;
  threshold: number;
  details: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

const results: TestResult[] = [];

const model = openai('gpt-5.2');

// Reasoning effort mapping
const getReasoningOptions = (level: ReasoningLevel) => {
  const effortMap = {
    none: 'none',
    quick: 'low',
    standard: 'medium',
    deep: 'high',
    max: 'xhigh',
  } as const;

  return {
    openai: {
      reasoningEffort: effortMap[level],
    },
  };
};

// Simple workout schema for testing
const simpleWorkoutSchema = z.object({
  name: z.string(),
  exercises: z.array(
    z.object({
      name: z.string(),
      sets: z.number(),
      reps: z.string(),
      weight: z.string().nullable(),
    })
  ),
  estimatedDuration: z.number(),
  reasoning: z.string(),
});

async function testSimpleTextGeneration(level: ReasoningLevel): Promise<TestResult> {
  const testName = `Simple Text Generation`;
  const threshold = TIMEOUT_THRESHOLDS[level];
  const start = Date.now();

  try {
    const result = await generateText({
      model,
      prompt: 'In one sentence, what is progressive overload in fitness?',
      providerOptions: getReasoningOptions(level),
    });

    const duration = Date.now() - start;

    return {
      test: testName,
      reasoningLevel: level,
      status: duration < threshold ? 'pass' : 'timeout',
      duration,
      threshold,
      details: `Response: ${result.text.substring(0, 80)}...`,
      usage: {
        promptTokens: result.usage?.promptTokens,
        completionTokens: result.usage?.completionTokens,
        totalTokens: result.usage?.totalTokens,
      },
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      test: testName,
      reasoningLevel: level,
      status: 'fail',
      duration,
      threshold,
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testStructuredWorkoutGeneration(level: ReasoningLevel): Promise<TestResult> {
  const testName = `Structured Workout Generation`;
  const threshold = TIMEOUT_THRESHOLDS[level];
  const start = Date.now();

  const prompt = `Create a quick 20-minute strength workout for an intermediate lifter.
Include 4-5 exercises with sets, reps, and suggested weights.
Focus on upper body.`;

  try {
    const result = await generateObject({
      model,
      schema: simpleWorkoutSchema,
      prompt,
      providerOptions: getReasoningOptions(level),
    });

    const duration = Date.now() - start;
    const workout = result.object;

    return {
      test: testName,
      reasoningLevel: level,
      status: duration < threshold ? 'pass' : 'timeout',
      duration,
      threshold,
      details: `"${workout.name}" - ${workout.exercises.length} exercises, ${workout.estimatedDuration}min`,
      usage: {
        promptTokens: result.usage?.promptTokens,
        completionTokens: result.usage?.completionTokens,
        totalTokens: result.usage?.totalTokens,
      },
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      test: testName,
      reasoningLevel: level,
      status: 'fail',
      duration,
      threshold,
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testStreamingResponse(level: ReasoningLevel): Promise<TestResult> {
  const testName = `Streaming Response (TTFB)`;
  const threshold = 10000; // 10 seconds to first token
  const start = Date.now();

  try {
    const result = streamText({
      model,
      prompt: 'Give me a quick workout tip.',
      providerOptions: getReasoningOptions(level),
    });

    let firstChunkTime: number | null = null;
    let totalText = '';

    for await (const chunk of result.textStream) {
      if (firstChunkTime === null) {
        firstChunkTime = Date.now() - start;
      }
      totalText += chunk;
    }

    const totalDuration = Date.now() - start;
    const ttfb = firstChunkTime || totalDuration;

    return {
      test: testName,
      reasoningLevel: level,
      status: ttfb < threshold ? 'pass' : 'timeout',
      duration: ttfb,
      threshold,
      details: `TTFB: ${formatDuration(ttfb)}, Total: ${formatDuration(totalDuration)}, ${totalText.length} chars`,
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      test: testName,
      reasoningLevel: level,
      status: 'fail',
      duration,
      threshold,
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testComplexWorkoutGeneration(): Promise<TestResult> {
  const testName = `Complex Multi-Person Workout`;
  const level: ReasoningLevel = 'quick'; // Use quick for complex to test our optimization
  const threshold = TIMEOUT_THRESHOLDS[level];
  const start = Date.now();

  const prompt = `Create a 45-minute workout for 2 people with different needs:

Person 1 - Sarah:
- Intermediate lifter
- Goals: increase bench press (current max 95 lbs)
- No limitations

Person 2 - Mike:
- Advanced lifter
- Goals: maintain strength while cutting
- Current bench max: 265 lbs
- Slight shoulder impingement (avoid overhead pressing)

Design a workout they can do together, with personalized weights for each.
Include warmup and cooldown.`;

  try {
    const result = await generateObject({
      model,
      schema: simpleWorkoutSchema,
      prompt,
      providerOptions: getReasoningOptions(level),
    });

    const duration = Date.now() - start;
    const workout = result.object;

    return {
      test: testName,
      reasoningLevel: level,
      status: duration < threshold ? 'pass' : 'timeout',
      duration,
      threshold,
      details: `"${workout.name}" - ${workout.exercises.length} exercises`,
      usage: {
        promptTokens: result.usage?.promptTokens,
        completionTokens: result.usage?.completionTokens,
        totalTokens: result.usage?.totalTokens,
      },
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      test: testName,
      reasoningLevel: level,
      status: 'fail',
      duration,
      threshold,
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function printResult(result: TestResult) {
  const icons = {
    pass: '✅',
    fail: '❌',
    timeout: '⏱️',
  };

  const statusColors: Record<string, keyof typeof colors> = {
    pass: 'green',
    fail: 'red',
    timeout: 'yellow',
  };

  const icon = icons[result.status];
  const color = statusColors[result.status];

  log(`\n${icon} ${result.test} [${result.reasoningLevel}]`, color);
  log(`   Duration: ${formatDuration(result.duration)} (threshold: ${formatDuration(result.threshold)})`, 'dim');
  log(`   Details: ${result.details}`, 'dim');

  if (result.status === 'pass') {
    const percentOfThreshold = ((result.duration / result.threshold) * 100).toFixed(1);
    log(`   Headroom: ${percentOfThreshold}% of timeout used`, 'green');
  }

  if (result.usage) {
    log(`   Tokens: prompt=${result.usage.promptTokens}, completion=${result.usage.completionTokens}, total=${result.usage.totalTokens}`, 'dim');
  }
}

function printSummary() {
  log('\n' + '═'.repeat(70), 'blue');
  log('📊 PERFORMANCE SUMMARY', 'bold');
  log('═'.repeat(70) + '\n', 'blue');

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const timedOut = results.filter((r) => r.status === 'timeout').length;

  log(`✅ Passed:    ${passed}`, 'green');
  log(`❌ Failed:    ${failed}`, failed > 0 ? 'red' : 'reset');
  log(`⏱️  Timed out: ${timedOut}`, timedOut > 0 ? 'yellow' : 'reset');
  log(`📊 Total:     ${results.length}\n`);

  // Performance by reasoning level
  log('PERFORMANCE BY REASONING LEVEL:', 'bold');
  const levels: ReasoningLevel[] = ['none', 'quick', 'standard'];
  for (const level of levels) {
    const levelResults = results.filter((r) => r.reasoningLevel === level);
    if (levelResults.length === 0) continue;

    const avgDuration = levelResults.reduce((sum, r) => sum + r.duration, 0) / levelResults.length;
    const passRate = (levelResults.filter((r) => r.status === 'pass').length / levelResults.length) * 100;

    log(`  ${level.padEnd(10)} avg: ${formatDuration(avgDuration).padEnd(10)} pass: ${passRate.toFixed(0)}%`, passRate === 100 ? 'green' : 'yellow');
  }

  // Token usage summary
  const withUsage = results.filter((r) => r.usage?.totalTokens);
  if (withUsage.length > 0) {
    log('\nTOKEN USAGE:', 'bold');
    const totalTokens = withUsage.reduce((sum, r) => sum + (r.usage?.totalTokens || 0), 0);
    log(`  Total tokens used: ${totalTokens.toLocaleString()}`, 'dim');
    log(`  Estimated cost: ~$${((totalTokens / 1000) * 0.03).toFixed(4)}`, 'dim'); // rough GPT-4 pricing
  }

  // Recommendations
  log('\n' + '─'.repeat(70), 'dim');
  log('📋 RECOMMENDATIONS:', 'bold');

  const noneResults = results.filter((r) => r.reasoningLevel === 'none');
  const quickResults = results.filter((r) => r.reasoningLevel === 'quick');

  if (noneResults.length > 0) {
    const avgNone = noneResults.reduce((sum, r) => sum + r.duration, 0) / noneResults.length;
    if (avgNone < 5000) {
      log('  ✅ "none" reasoning is fast - good for chat responses', 'green');
    }
  }

  if (quickResults.length > 0) {
    const avgQuick = quickResults.reduce((sum, r) => sum + r.duration, 0) / quickResults.length;
    if (avgQuick < 15000) {
      log('  ✅ "quick" reasoning is acceptable for workout generation', 'green');
    } else if (avgQuick < 30000) {
      log('  ⚠️  "quick" reasoning is slow - may need optimization', 'yellow');
    } else {
      log('  ❌ "quick" reasoning is too slow - consider caching or pre-generation', 'red');
    }
  }

  const failedTests = results.filter((r) => r.status === 'fail');
  if (failedTests.length > 0) {
    log('\n  ❌ Failed tests:', 'red');
    failedTests.forEach((r) => {
      log(`     - ${r.test} [${r.reasoningLevel}]: ${r.details}`, 'dim');
    });
  }

  log('\n');
}

async function runTests() {
  log('\n' + '═'.repeat(70), 'blue');
  log('🤖 DIRECT OPENAI API PERFORMANCE TEST', 'bold');
  log('═'.repeat(70) + '\n', 'blue');

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    log('❌ OPENAI_API_KEY environment variable not set', 'red');
    log('Set it in .env.local or export it in your shell\n', 'yellow');
    process.exit(1);
  }
  log('✅ OpenAI API key found\n', 'green');

  // Test 1: Simple text generation with different reasoning levels
  log('─'.repeat(70), 'dim');
  log('TEST 1: Simple Text Generation (comparing reasoning levels)', 'bold');
  log('─'.repeat(70), 'dim');

  for (const level of ['none', 'quick'] as ReasoningLevel[]) {
    const result = await testSimpleTextGeneration(level);
    results.push(result);
    printResult(result);
  }

  // Test 2: Structured workout generation
  log('\n' + '─'.repeat(70), 'dim');
  log('TEST 2: Structured Workout Generation', 'bold');
  log('─'.repeat(70), 'dim');

  for (const level of ['none', 'quick'] as ReasoningLevel[]) {
    const result = await testStructuredWorkoutGeneration(level);
    results.push(result);
    printResult(result);
  }

  // Test 3: Streaming response
  log('\n' + '─'.repeat(70), 'dim');
  log('TEST 3: Streaming Response (Time to First Byte)', 'bold');
  log('─'.repeat(70), 'dim');

  const streamResult = await testStreamingResponse('none');
  results.push(streamResult);
  printResult(streamResult);

  // Test 4: Complex multi-person workout
  log('\n' + '─'.repeat(70), 'dim');
  log('TEST 4: Complex Multi-Person Workout', 'bold');
  log('─'.repeat(70), 'dim');

  const complexResult = await testComplexWorkoutGeneration();
  results.push(complexResult);
  printResult(complexResult);

  // Test 5: Standard reasoning (only if quick was fast)
  const quickWorkoutResult = results.find(
    (r) => r.test === 'Structured Workout Generation' && r.reasoningLevel === 'quick'
  );
  if (quickWorkoutResult && quickWorkoutResult.duration < 20000) {
    log('\n' + '─'.repeat(70), 'dim');
    log('TEST 5: Standard Reasoning (deeper analysis)', 'bold');
    log('─'.repeat(70), 'dim');

    const standardResult = await testStructuredWorkoutGeneration('standard');
    results.push(standardResult);
    printResult(standardResult);
  } else {
    log('\n⏭️  Skipping standard reasoning test (quick was too slow)', 'yellow');
  }

  printSummary();
}

// Run tests
runTests().catch((error) => {
  log(`\n❌ Test suite crashed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
