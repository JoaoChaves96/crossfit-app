import { Page } from '@playwright/test';

const TEST_CREDENTIALS: Record<'owner' | 'coach' | 'athlete', { email: string; password: string }> = {
  owner: { email: 'owner@example.com', password: 'password123' },
  coach: { email: 'coach@example.com', password: 'password123' },
  athlete: { email: 'athlete@example.com', password: 'password123' },
};

/**
 * Logs in as the given role by navigating to /login, filling credentials,
 * submitting, and waiting for the post-login redirect to settle.
 */
export async function loginAs(page: Page, role: 'owner' | 'coach' | 'athlete'): Promise<void> {
  const { email, password } = TEST_CREDENTIALS[role];

  await page.goto('/login');

  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(password);
  await page.getByTestId('login-submit-btn').click();

  // Wait for the redirect away from /login to confirm authentication succeeded
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
}
