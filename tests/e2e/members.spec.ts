import { test, expect } from '@playwright/test';

test.describe('Members Page', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: navigate to members page
    // Note: In real tests, you'd authenticate first
    await page.goto('/members');
  });

  test('should display members list or empty state', async ({ page }) => {
    // Either shows member cards or "No members" message
    const hasMemberCards = await page.locator('[data-testid="member-card"]').count() > 0;
    const hasEmptyState = await page.getByText(/no members yet/i).isVisible();
    expect(hasMemberCards || hasEmptyState).toBeTruthy();
  });

  test('should have add member button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add member/i })).toBeVisible();
  });

  test('add member dialog should open', async ({ page }) => {
    await page.getByRole('button', { name: /add member/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
  });

  test('member card should link to profile', async ({ page }) => {
    // If there are members, clicking view profile should navigate
    const viewProfileButton = page.getByRole('link', { name: /view profile/i }).first();
    if (await viewProfileButton.isVisible()) {
      await viewProfileButton.click();
      await expect(page).toHaveURL(/\/members\/.+/);
    }
  });
});
