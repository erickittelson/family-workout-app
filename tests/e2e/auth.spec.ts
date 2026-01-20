import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login or auth page
    await expect(page).toHaveURL(/\/(login|auth|api\/auth)/);
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/login');
    // Check for family access code input or login form
    const passKeyInput = page.getByPlaceholder(/passkey|code|password/i);
    await expect(passKeyInput).toBeVisible();
  });

  test('should reject invalid passkey', async ({ page }) => {
    await page.goto('/login');
    const passKeyInput = page.getByPlaceholder(/passkey|code|password/i);
    await passKeyInput.fill('invalid-key');
    await page.getByRole('button', { name: /join|login|enter/i }).click();
    // Should show error message
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Protected Routes', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Set up authenticated session
    // This would typically use a test account or mock auth
  });

  test('dashboard should load for authenticated users', async ({ page }) => {
    // Skip if no auth mechanism available
    test.skip();
  });
});
