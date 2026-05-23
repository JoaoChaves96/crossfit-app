import { test, expect } from '@playwright/test';

test('page loads without crashing', async ({ page }) => {
  const response = await page.goto('http://localhost:8081');

  // The server must respond with a non-5xx status
  expect(response?.status()).toBeLessThan(500);

  // The page must not immediately error — wait for the root element to mount
  await expect(page.locator('body')).toBeVisible();
});
