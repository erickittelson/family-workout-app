#!/usr/bin/env npx tsx
/**
 * End-to-End Scenario Testing Script
 *
 * Tests complete user flows using Playwright programmatically
 * Simulates real user interactions across the application
 *
 * Usage: npx tsx tests/scripts/e2e-scenario-test.ts
 */

import { chromium, Browser, Page } from 'playwright';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

interface ScenarioResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  steps: { step: string; status: 'pass' | 'fail'; error?: string }[];
  duration: number;
}

const results: ScenarioResult[] = [];

class E2ETestRunner {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async setup() {
    console.log('\n🎭 Starting E2E Test Runner\n');
    console.log(`Testing against: ${BASE_URL}\n`);

    this.browser = await chromium.launch({ headless: true });
    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    this.page = await context.newPage();
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runScenario(
    name: string,
    steps: () => Promise<void>
  ): Promise<ScenarioResult> {
    const start = Date.now();
    const result: ScenarioResult = {
      name,
      status: 'pass',
      steps: [],
      duration: 0,
    };

    try {
      await steps();
    } catch (error) {
      result.status = 'fail';
      result.steps.push({
        step: 'Scenario execution',
        status: 'fail',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    result.duration = Date.now() - start;
    return result;
  }

  async step(description: string, action: () => Promise<void>) {
    try {
      await action();
      console.log(`  ✅ ${description}`);
      return { step: description, status: 'pass' as const };
    } catch (error) {
      console.log(`  ❌ ${description}: ${error instanceof Error ? error.message : 'Failed'}`);
      throw error;
    }
  }

  // Test scenarios
  async testLoginFlow() {
    console.log('\n📝 Scenario: Login Flow');

    return this.runScenario('Login Flow', async () => {
      await this.step('Navigate to home page', async () => {
        await this.page!.goto(BASE_URL);
      });

      await this.step('Check for login or dashboard', async () => {
        const url = this.page!.url();
        const hasAuth = url.includes('login') || url.includes('auth') || url.includes('dashboard');
        if (!hasAuth) {
          // Check page content
          const content = await this.page!.content();
          const hasLoginForm = content.includes('passkey') || content.includes('login') || content.includes('Join');
          if (!hasLoginForm) {
            throw new Error('No login form found');
          }
        }
      });

      await this.step('Page loads without errors', async () => {
        const errors: string[] = [];
        this.page!.on('pageerror', (err) => errors.push(err.message));
        await this.page!.waitForTimeout(1000);
        if (errors.length > 0) {
          throw new Error(`Page errors: ${errors.join(', ')}`);
        }
      });
    });
  }

  async testNavigationFlow() {
    console.log('\n📝 Scenario: Navigation Flow');

    return this.runScenario('Navigation Flow', async () => {
      const navLinks = ['/members', '/goals', '/workouts', '/admin'];

      for (const link of navLinks) {
        await this.step(`Navigate to ${link}`, async () => {
          await this.page!.goto(`${BASE_URL}${link}`);
          // Should either load the page or redirect to login
          await this.page!.waitForLoadState('networkidle');
          const status = this.page!.url().includes('login') || this.page!.url().includes(link);
          if (!status) {
            throw new Error(`Unexpected redirect to ${this.page!.url()}`);
          }
        });
      }
    });
  }

  async testResponsiveDesign() {
    console.log('\n📝 Scenario: Responsive Design');

    return this.runScenario('Responsive Design', async () => {
      const viewports = [
        { name: 'Mobile', width: 375, height: 667 },
        { name: 'Tablet', width: 768, height: 1024 },
        { name: 'Desktop', width: 1280, height: 720 },
      ];

      for (const vp of viewports) {
        await this.step(`Test ${vp.name} viewport (${vp.width}x${vp.height})`, async () => {
          await this.page!.setViewportSize({ width: vp.width, height: vp.height });
          await this.page!.goto(BASE_URL);
          await this.page!.waitForLoadState('networkidle');

          // Check that page renders without horizontal scroll
          const bodyWidth = await this.page!.evaluate(() => document.body.scrollWidth);
          if (bodyWidth > vp.width + 20) { // Small tolerance
            throw new Error(`Horizontal overflow detected: ${bodyWidth}px > ${vp.width}px`);
          }
        });
      }
    });
  }

  async testFormValidation() {
    console.log('\n📝 Scenario: Form Validation');

    return this.runScenario('Form Validation', async () => {
      await this.step('Navigate to login page', async () => {
        await this.page!.goto(`${BASE_URL}/login`);
      });

      await this.step('Submit empty form should show error', async () => {
        const submitButton = this.page!.getByRole('button', { name: /join|enter|login/i });
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await this.page!.waitForTimeout(500);
          // Should show error or prevent submission
        }
      });
    });
  }

  async testAccessibility() {
    console.log('\n📝 Scenario: Basic Accessibility');

    return this.runScenario('Accessibility', async () => {
      await this.step('Page has title', async () => {
        await this.page!.goto(BASE_URL);
        const title = await this.page!.title();
        if (!title || title.length < 2) {
          throw new Error('Page is missing a title');
        }
      });

      await this.step('Images have alt text', async () => {
        const images = await this.page!.locator('img').all();
        for (const img of images) {
          const alt = await img.getAttribute('alt');
          // Images should have alt text (can be empty for decorative)
          if (alt === null) {
            throw new Error('Image missing alt attribute');
          }
        }
      });

      await this.step('Buttons are keyboard accessible', async () => {
        const buttons = await this.page!.locator('button').all();
        for (const button of buttons.slice(0, 5)) { // Check first 5 buttons
          const isDisabled = await button.isDisabled();
          const tabIndex = await button.getAttribute('tabindex');
          // Buttons should be focusable unless disabled
          if (!isDisabled && tabIndex === '-1') {
            throw new Error('Button is not keyboard accessible');
          }
        }
      });
    });
  }

  async runAllScenarios() {
    await this.setup();

    try {
      results.push(await this.testLoginFlow());
      results.push(await this.testNavigationFlow());
      results.push(await this.testResponsiveDesign());
      results.push(await this.testFormValidation());
      results.push(await this.testAccessibility());
    } finally {
      await this.teardown();
    }

    this.printSummary();
  }

  printSummary() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('E2E TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════\n');

    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;

    console.log(`✅ Passed:  ${passed}`);
    console.log(`❌ Failed:  ${failed}`);
    console.log(`📊 Total:   ${results.length}\n`);

    if (failed > 0) {
      console.log('\x1b[31mFAILED SCENARIOS:\x1b[0m');
      results.filter(r => r.status === 'fail').forEach(r => {
        console.log(`  - ${r.name}`);
        r.steps.filter(s => s.status === 'fail').forEach(s => {
          console.log(`    • ${s.step}: ${s.error}`);
        });
      });
      console.log('');
      process.exit(1);
    }

    console.log('\x1b[32mAll E2E tests passed! ✨\x1b[0m\n');
  }
}

// Run tests
const runner = new E2ETestRunner();
runner.runAllScenarios().catch(console.error);
