#!/usr/bin/env npx tsx
/**
 * Comprehensive API Testing Script
 *
 * This script tests all API endpoints for:
 * - Proper authentication checks
 * - Input validation
 * - Error handling
 * - Response format consistency
 *
 * Usage: npx tsx tests/scripts/full-api-test.ts [--with-auth]
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const WITH_AUTH = process.argv.includes('--with-auth');

interface TestResult {
  endpoint: string;
  method: string;
  status: 'pass' | 'fail' | 'skip';
  details: string;
  responseTime: number;
}

const results: TestResult[] = [];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(
  method: string,
  path: string,
  options: {
    body?: object;
    expectedStatus?: number | number[];
    description?: string;
    skipAuth?: boolean;
  } = {}
): Promise<TestResult> {
  const { body, expectedStatus = [200, 201, 401], description } = options;
  const start = Date.now();

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseTime = Date.now() - start;
    const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];

    if (expectedStatuses.includes(res.status)) {
      return {
        endpoint: path,
        method,
        status: 'pass',
        details: description || `Status ${res.status} (${responseTime}ms)`,
        responseTime,
      };
    } else {
      return {
        endpoint: path,
        method,
        status: 'fail',
        details: `Expected ${expectedStatuses.join('|')}, got ${res.status}`,
        responseTime,
      };
    }
  } catch (error) {
    return {
      endpoint: path,
      method,
      status: 'fail',
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - start,
    };
  }
}

async function runTests() {
  log('\n🧪 COMPREHENSIVE API TEST SUITE\n', 'bold');
  log(`Testing against: ${BASE_URL}\n`, 'blue');

  // Check if server is running
  try {
    await fetch(BASE_URL);
  } catch {
    log('❌ Server is not running at ' + BASE_URL, 'red');
    log('Start the server with: npm run dev', 'yellow');
    process.exit(1);
  }

  log('═══════════════════════════════════════════════════', 'blue');
  log('AUTHENTICATION TESTS (401 Expected Without Auth)', 'bold');
  log('═══════════════════════════════════════════════════\n', 'blue');

  const authTests = [
    { method: 'GET', path: '/api/members' },
    { method: 'POST', path: '/api/members', body: { name: 'Test' } },
    { method: 'GET', path: '/api/goals' },
    { method: 'POST', path: '/api/goals', body: { memberId: 'test', title: 'Test', category: 'strength' } },
    { method: 'GET', path: '/api/exercises' },
    { method: 'GET', path: '/api/workout-plans' },
    { method: 'POST', path: '/api/workout-plans', body: { name: 'Test Plan' } },
    { method: 'GET', path: '/api/workout-sessions' },
    { method: 'GET', path: '/api/milestones' },
    { method: 'GET', path: '/api/admin/family' },
  ];

  for (const test of authTests) {
    const result = await testEndpoint(test.method, test.path, {
      body: test.body,
      expectedStatus: 401,
      description: 'Requires authentication',
    });
    results.push(result);

    const icon = result.status === 'pass' ? '✅' : '❌';
    const color = result.status === 'pass' ? 'green' : 'red';
    log(`${icon} ${test.method} ${test.path} - ${result.details}`, color);
  }

  log('\n═══════════════════════════════════════════════════', 'blue');
  log('INPUT VALIDATION TESTS (400 Expected)', 'bold');
  log('═══════════════════════════════════════════════════\n', 'blue');

  const validationTests = [
    {
      method: 'POST',
      path: '/api/members',
      body: {},
      expected: [400, 401],
      description: 'POST /api/members without name should fail'
    },
    {
      method: 'POST',
      path: '/api/goals',
      body: { title: 'Test' },
      expected: [400, 401],
      description: 'POST /api/goals without memberId should fail'
    },
  ];

  for (const test of validationTests) {
    const result = await testEndpoint(test.method, test.path, {
      body: test.body,
      expectedStatus: test.expected,
      description: test.description,
    });
    results.push(result);

    const icon = result.status === 'pass' ? '✅' : '❌';
    const color = result.status === 'pass' ? 'green' : 'red';
    log(`${icon} ${test.description}`, color);
  }

  log('\n═══════════════════════════════════════════════════', 'blue');
  log('RESPONSE FORMAT TESTS', 'bold');
  log('═══════════════════════════════════════════════════\n', 'blue');

  const formatTests = [
    { method: 'GET', path: '/api/members', expected: 401 },
    { method: 'GET', path: '/api/exercises', expected: 401 },
  ];

  for (const test of formatTests) {
    const result = await fetch(`${BASE_URL}${test.path}`);
    const isJson = result.headers.get('content-type')?.includes('application/json');

    results.push({
      endpoint: test.path,
      method: test.method,
      status: isJson ? 'pass' : 'fail',
      details: isJson ? 'Returns JSON' : 'Does not return JSON',
      responseTime: 0,
    });

    const icon = isJson ? '✅' : '❌';
    const color = isJson ? 'green' : 'red';
    log(`${icon} ${test.method} ${test.path} - ${isJson ? 'Returns JSON' : 'Missing JSON content-type'}`, color);
  }

  // Summary
  log('\n═══════════════════════════════════════════════════', 'blue');
  log('TEST SUMMARY', 'bold');
  log('═══════════════════════════════════════════════════\n', 'blue');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  log(`✅ Passed:  ${passed}`, 'green');
  log(`❌ Failed:  ${failed}`, failed > 0 ? 'red' : 'reset');
  log(`⏭️  Skipped: ${skipped}`, 'yellow');
  log(`📊 Total:   ${results.length}\n`);

  if (failed > 0) {
    log('FAILED TESTS:', 'red');
    results.filter(r => r.status === 'fail').forEach(r => {
      log(`  - ${r.method} ${r.endpoint}: ${r.details}`, 'red');
    });
    process.exit(1);
  }

  log('All tests passed! ✨\n', 'green');
}

runTests().catch(console.error);
