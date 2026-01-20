import { test, expect } from '@playwright/test';

test.describe('Goals Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/goals');
  });

  test('should display goals page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /goal/i })).toBeVisible();
  });

  test('should display member goals or empty state', async ({ page }) => {
    // Either shows goals or empty state message
    const hasGoals = await page.locator('[data-testid="goal-card"]').count() > 0;
    const hasEmptyState = await page.getByText(/no goals|add a goal|get started/i).isVisible();
    expect(hasGoals || hasEmptyState).toBeTruthy();
  });

  test('should allow adding new goal', async ({ page }) => {
    // Look for add goal functionality
    const addButton = page.getByRole('button', { name: /add goal|new goal|create/i });
    if (await addButton.isVisible()) {
      await addButton.click();
      // Should show goal creation form/dialog
      await expect(page.getByLabel(/title|name|goal/i).first()).toBeVisible();
    }
  });
});
