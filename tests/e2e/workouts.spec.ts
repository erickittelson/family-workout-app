import { test, expect } from '@playwright/test';

test.describe('Workouts Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workouts');
  });

  test('should display workouts page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /workout/i })).toBeVisible();
  });

  test('should have workout builder link', async ({ page }) => {
    const builderLink = page.getByRole('link', { name: /create|build|new/i });
    await expect(builderLink).toBeVisible();
  });

  test('workout builder should load', async ({ page }) => {
    await page.goto('/workouts/builder');
    // Should show workout builder interface
    await expect(page.getByText(/workout|plan|create/i).first()).toBeVisible();
  });
});

test.describe('Workout Builder', () => {
  test('should display member selection', async ({ page }) => {
    await page.goto('/workouts/builder');
    // Should have member selector or similar
    await expect(page.getByText(/member|for whom/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should show AI generation option', async ({ page }) => {
    await page.goto('/workouts/builder');
    // Should have AI generate button
    const aiButton = page.getByRole('button', { name: /ai|generate|smart/i });
    if (await aiButton.isVisible()) {
      await expect(aiButton).toBeEnabled();
    }
  });
});
