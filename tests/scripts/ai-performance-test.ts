#!/usr/bin/env npx tsx
/**
 * AI API Performance Testing Script
 *
 * Tests OpenAI API integration for:
 * - Response times across different reasoning levels
 * - Timeout detection
 * - Streaming performance
 * - Token usage estimation
 *
 * Usage:
 *   npx tsx tests/scripts/ai-performance-test.ts
 *
 * Environment variables:
 *   TEST_API_URL - API base URL (default: http://localhost:3000)
 *   TEST_AUTH_COOKIE - Auth session cookie for authenticated requests
 *   TEST_MEMBER_ID - Member ID to use for tests
 *
 * Prerequisites:
 *   1. Server running: npm run dev
 *   2. Valid auth session (log in via browser, copy cookie)
 *   3. At least one member in the circle
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const AUTH_COOKIE = process.env.TEST_AUTH_COOKIE || '';
const TEST_MEMBER_ID = process.env.TEST_MEMBER_ID || '';

// Timeout thresholds (ms) - based on REASONING_TIMEOUTS in lib/ai
const TIMEOUT_THRESHOLDS = {
  none: 30000,
  quick: 45000,
  standard: 90000,
  deep: 120000,
  max: 180000,
};

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

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'timeout' | 'skip';
  duration: number;
  threshold: number;
  details: string;
  tokenEstimate?: number;
}

const results: TestResult[] = [];

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${formatDuration(timeoutMs)}`);
    }
    throw error;
  }
}

async function testAIChat(memberId: string): Promise<TestResult> {
  const testName = 'AI Chat (quick reasoning)';
  const threshold = TIMEOUT_THRESHOLDS.quick;
  const start = Date.now();

  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/api/ai/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: AUTH_COOKIE,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'What workout should I do today? Give me a brief recommendation.',
            },
          ],
          memberId,
          deepThinking: false,
        }),
      },
      threshold
    );

    const duration = Date.now() - start;

    if (!response.ok) {
      const text = await response.text();
      return {
        test: testName,
        status: 'fail',
        duration,
        threshold,
        details: `HTTP ${response.status}: ${text.substring(0, 100)}`,
      };
    }

    // For streaming response, read the full stream
    const text = await response.text();
    const finalDuration = Date.now() - start;

    return {
      test: testName,
      status: finalDuration < threshold ? 'pass' : 'timeout',
      duration: finalDuration,
      threshold,
      details: `Response length: ${text.length} chars`,
      tokenEstimate: Math.ceil(text.length / 4), // rough estimate
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      test: testName,
      status: 'timeout',
      duration,
      threshold,
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testWorkoutGeneration(
  memberId: string,
  reasoningLevel: keyof typeof TIMEOUT_THRESHOLDS,
  targetDuration: number = 30
): Promise<TestResult> {
  const testName = `Workout Generation (${reasoningLevel} reasoning, ${targetDuration}min workout)`;
  const threshold = TIMEOUT_THRESHOLDS[reasoningLevel];
  const start = Date.now();

  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/api/ai/generate-workout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: AUTH_COOKIE,
        },
        body: JSON.stringify({
          memberIds: [memberId],
          focus: 'strength',
          intensity: 'moderate',
          targetDuration,
          restPreference: 'standard',
          includeWarmup: true,
          includeCooldown: true,
          reasoningLevel,
          saveAsPlan: false,
        }),
      },
      threshold + 10000 // Add 10s buffer to detect actual timeouts vs our test timeout
    );

    const duration = Date.now() - start;

    if (!response.ok) {
      const text = await response.text();
      return {
        test: testName,
        status: 'fail',
        duration,
        threshold,
        details: `HTTP ${response.status}: ${text.substring(0, 200)}`,
      };
    }

    const data = await response.json();
    const finalDuration = Date.now() - start;

    const exerciseCount = data.workout?.exercises?.length || 0;
    const hasReasoning = !!data.reasoning;

    return {
      test: testName,
      status: finalDuration < threshold ? 'pass' : 'timeout',
      duration: finalDuration,
      threshold,
      details: `${exerciseCount} exercises, ${hasReasoning ? 'with' : 'no'} reasoning plan`,
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      test: testName,
      status: 'timeout',
      duration,
      threshold,
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testChatStreaming(memberId: string): Promise<TestResult> {
  const testName = 'AI Chat Streaming (time to first byte)';
  const threshold = 5000; // 5 seconds to first byte
  const start = Date.now();

  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/api/ai/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: AUTH_COOKIE,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Say hello in one word.',
            },
          ],
          memberId,
          deepThinking: false,
        }),
      },
      30000
    );

    const ttfb = Date.now() - start;

    if (!response.ok) {
      return {
        test: testName,
        status: 'fail',
        duration: ttfb,
        threshold,
        details: `HTTP ${response.status}`,
      };
    }

    // Get the reader to measure streaming
    const reader = response.body?.getReader();
    if (!reader) {
      return {
        test: testName,
        status: 'fail',
        duration: ttfb,
        threshold,
        details: 'No response body reader',
      };
    }

    // Read first chunk
    const { value } = await reader.read();
    const timeToFirstChunk = Date.now() - start;

    // Cancel the rest
    await reader.cancel();

    return {
      test: testName,
      status: timeToFirstChunk < threshold ? 'pass' : 'timeout',
      duration: timeToFirstChunk,
      threshold,
      details: `First chunk: ${value?.length || 0} bytes`,
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      test: testName,
      status: 'timeout',
      duration,
      threshold,
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function getMemberIdFromAPI(): Promise<string | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/members`, {
      headers: {
        Cookie: AUTH_COOKIE,
      },
    });

    if (!response.ok) {
      return null;
    }

    const members = await response.json();
    if (Array.isArray(members) && members.length > 0) {
      return members[0].id;
    }
    return null;
  } catch {
    return null;
  }
}

async function runTests() {
  log('\n' + '═'.repeat(60), 'blue');
  log('🤖 AI API PERFORMANCE TEST SUITE', 'bold');
  log('═'.repeat(60) + '\n', 'blue');

  log(`Base URL: ${BASE_URL}`, 'dim');
  log(`Auth Cookie: ${AUTH_COOKIE ? '✅ Provided' : '❌ Missing'}`, AUTH_COOKIE ? 'green' : 'red');

  // Check server is running
  try {
    await fetch(BASE_URL);
  } catch {
    log('\n❌ Server is not running at ' + BASE_URL, 'red');
    log('Start the server with: npm run dev\n', 'yellow');
    process.exit(1);
  }
  log('Server: ✅ Running\n', 'green');

  // Get member ID
  let memberId = TEST_MEMBER_ID;
  if (!memberId && AUTH_COOKIE) {
    log('Fetching member ID from API...', 'dim');
    memberId = (await getMemberIdFromAPI()) || '';
  }

  if (!memberId) {
    log('❌ No member ID available', 'red');
    log('Set TEST_MEMBER_ID or ensure AUTH_COOKIE is valid\n', 'yellow');

    // Run basic connectivity test without auth
    log('Running unauthenticated tests only...\n', 'yellow');

    const unauthResult = await testAIChat('test-member-id');
    results.push(unauthResult);

    if (unauthResult.status === 'fail' && unauthResult.details.includes('401')) {
      log('✅ Auth check working (401 returned)', 'green');
    }

    printSummary();
    return;
  }

  log(`Member ID: ${memberId}\n`, 'dim');

  // Test 1: Chat Streaming (TTFB)
  log('─'.repeat(60), 'dim');
  log('TEST 1: Chat Streaming Performance', 'bold');
  log('─'.repeat(60), 'dim');

  const streamResult = await testChatStreaming(memberId);
  results.push(streamResult);
  printResult(streamResult);

  // Test 2: AI Chat (full response)
  log('\n' + '─'.repeat(60), 'dim');
  log('TEST 2: AI Chat (Full Response)', 'bold');
  log('─'.repeat(60), 'dim');

  const chatResult = await testAIChat(memberId);
  results.push(chatResult);
  printResult(chatResult);

  // Test 3: Workout Generation - None reasoning
  log('\n' + '─'.repeat(60), 'dim');
  log('TEST 3: Workout Generation (none reasoning - fastest)', 'bold');
  log('─'.repeat(60), 'dim');

  const noneResult = await testWorkoutGeneration(memberId, 'none', 30);
  results.push(noneResult);
  printResult(noneResult);

  // Test 4: Workout Generation - Quick reasoning
  log('\n' + '─'.repeat(60), 'dim');
  log('TEST 4: Workout Generation (quick reasoning)', 'bold');
  log('─'.repeat(60), 'dim');

  const quickResult = await testWorkoutGeneration(memberId, 'quick', 30);
  results.push(quickResult);
  printResult(quickResult);

  // Test 5: Workout Generation - Standard reasoning (skip if quick was slow)
  if (quickResult.duration < TIMEOUT_THRESHOLDS.quick) {
    log('\n' + '─'.repeat(60), 'dim');
    log('TEST 5: Workout Generation (standard reasoning)', 'bold');
    log('─'.repeat(60), 'dim');

    const standardResult = await testWorkoutGeneration(memberId, 'standard', 45);
    results.push(standardResult);
    printResult(standardResult);
  } else {
    log('\n⏭️  Skipping standard reasoning test (quick was too slow)', 'yellow');
    results.push({
      test: 'Workout Generation (standard reasoning)',
      status: 'skip',
      duration: 0,
      threshold: TIMEOUT_THRESHOLDS.standard,
      details: 'Skipped - previous test too slow',
    });
  }

  printSummary();
}

function printResult(result: TestResult) {
  const icons = {
    pass: '✅',
    fail: '❌',
    timeout: '⏱️',
    skip: '⏭️',
  };

  const statusColors: Record<string, keyof typeof colors> = {
    pass: 'green',
    fail: 'red',
    timeout: 'yellow',
    skip: 'dim',
  };

  const icon = icons[result.status];
  const color = statusColors[result.status];

  log(`\n${icon} ${result.test}`, color);
  log(`   Duration: ${formatDuration(result.duration)} (threshold: ${formatDuration(result.threshold)})`, 'dim');
  log(`   Details: ${result.details}`, 'dim');

  if (result.status === 'pass') {
    const percentOfThreshold = ((result.duration / result.threshold) * 100).toFixed(1);
    log(`   Headroom: ${percentOfThreshold}% of timeout used`, 'green');
  }

  if (result.tokenEstimate) {
    log(`   Est. tokens: ~${result.tokenEstimate}`, 'dim');
  }
}

function printSummary() {
  log('\n' + '═'.repeat(60), 'blue');
  log('📊 PERFORMANCE SUMMARY', 'bold');
  log('═'.repeat(60) + '\n', 'blue');

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const timedOut = results.filter((r) => r.status === 'timeout').length;
  const skipped = results.filter((r) => r.status === 'skip').length;

  log(`✅ Passed:    ${passed}`, 'green');
  log(`❌ Failed:    ${failed}`, failed > 0 ? 'red' : 'reset');
  log(`⏱️  Timed out: ${timedOut}`, timedOut > 0 ? 'yellow' : 'reset');
  log(`⏭️  Skipped:   ${skipped}`, 'dim');
  log(`📊 Total:     ${results.length}\n`);

  // Performance breakdown
  const successfulTests = results.filter((r) => r.status === 'pass' || r.status === 'timeout');
  if (successfulTests.length > 0) {
    log('RESPONSE TIME BREAKDOWN:', 'bold');
    successfulTests.forEach((r) => {
      const bar = '█'.repeat(Math.min(50, Math.floor((r.duration / r.threshold) * 50)));
      const percentUsed = ((r.duration / r.threshold) * 100).toFixed(0);
      const color = r.status === 'pass' ? 'green' : 'yellow';
      log(`  ${r.test.padEnd(50)} ${formatDuration(r.duration).padStart(8)} ${bar} ${percentUsed}%`, color);
    });
  }

  // Recommendations
  log('\n' + '─'.repeat(60), 'dim');
  log('📋 RECOMMENDATIONS:', 'bold');

  if (timedOut > 0) {
    log('  ⚠️  Some requests timed out. Consider:', 'yellow');
    log('      - Using lower reasoning levels for user-facing requests', 'dim');
    log('      - Adding loading indicators for longer operations', 'dim');
    log('      - Implementing request cancellation', 'dim');
  }

  const slowQuickTests = results.filter(
    (r) => r.test.includes('quick') && r.duration > 15000
  );
  if (slowQuickTests.length > 0) {
    log('  ⚠️  "Quick" reasoning is slower than expected:', 'yellow');
    log('      - Check OpenAI API status', 'dim');
    log('      - Consider using "none" reasoning for chat', 'dim');
  }

  const fastTests = results.filter(
    (r) => r.status === 'pass' && r.duration < r.threshold * 0.3
  );
  if (fastTests.length === results.filter((r) => r.status !== 'skip').length) {
    log('  ✅ All tests completed well under threshold!', 'green');
  }

  log('\n');

  // Exit with error code if any failures
  if (failed > 0 || timedOut > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  log(`\n❌ Test suite crashed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
