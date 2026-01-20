# Testing System

This project includes a comprehensive testing system with unit tests, integration tests, and end-to-end tests.

## Test Commands

| Command | Description |
|---------|-------------|
| `npm run test` | Run unit tests in watch mode |
| `npm run test:run` | Run unit tests once |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:ui` | Open Vitest UI |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Open Playwright UI |
| `npm run test:api` | Run API endpoint tests |
| `npm run test:scenarios` | Run E2E scenario tests |
| `npm run test:all` | Run all tests |

## Test Structure

```
tests/
├── api/                    # API route tests
│   ├── members.test.ts
│   ├── goals.test.ts
│   └── workouts.test.ts
├── e2e/                    # Playwright E2E tests
│   ├── auth.spec.ts
│   ├── members.spec.ts
│   ├── workouts.spec.ts
│   └── goals.spec.ts
├── integration/            # Integration tests
│   └── api-health-check.test.ts
├── unit/                   # Unit tests
│   ├── utils.test.ts
│   └── components.test.tsx
├── fixtures/               # Test data
│   └── testData.ts
├── scripts/                # Test runner scripts
│   ├── full-api-test.ts
│   └── e2e-scenario-test.ts
└── setup.ts               # Test setup and mocks
```

## Running Tests

### Prerequisites

1. **Start the development server** (for integration/E2E tests):
   ```bash
   npm run dev
   ```

2. **Install Playwright browsers** (first time only):
   ```bash
   npx playwright install
   ```

### Unit Tests

Unit tests run in isolation using Vitest with mocked dependencies:

```bash
npm run test:run
```

### API Tests

Tests all API endpoints for authentication, validation, and response format:

```bash
# Start dev server first
npm run dev

# In another terminal
npm run test:api
```

### E2E Tests

Full browser-based testing with Playwright:

```bash
npm run test:e2e
```

## Writing Tests

### API Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockAuthSession } from '../fixtures/testData';

// Mock dependencies
vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

describe('My API', () => {
  it('should require authentication', async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import('@/app/api/my-route/route');
    const response = await GET(new Request('http://localhost/api/my-route'));
    expect(response.status).toBe(401);
  });
});
```

### E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test('should display page', async ({ page }) => {
  await page.goto('/my-page');
  await expect(page.getByRole('heading')).toBeVisible();
});
```

## Test Fixtures

Common test data is available in `tests/fixtures/testData.ts`:

- `testMember` - Sample member object
- `testGoal` - Sample goal object
- `testWorkoutPlan` - Sample workout plan
- `testWorkoutSession` - Sample workout session
- `mockAuthSession` - Mock authentication session

## CI/CD Integration

Add to your CI pipeline:

```yaml
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:run
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

## Coverage

Generate a coverage report:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.
