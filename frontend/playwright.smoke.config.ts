import { defineConfig, devices } from '@playwright/test';

/**
 * Config for the post-deploy smoke test. Separate from `playwright.config.ts`
 * on purpose, and the separation is the whole point.
 *
 * `playwright.config.ts` sets `globalSetup` UNCONDITIONALLY — even on
 * `E2E_TARGET=remote` it runs `e2e/global-setup.ts`, which opens a connection,
 * migrates and truncates. Reusing it would drag a database into a suite that
 * needs none, and the only databases reachable from a runner are staging's own
 * and a throwaway one somebody has to create. Both are Task 9's problem, not
 * this suite's.
 *
 * So: no `globalSetup`, no `webServer`, no database, no seeded state. It reads a
 * deployed URL and asserts what it finds. That is why it costs ~3 minutes and
 * cannot touch `boxops_staging`.
 *
 * `testDir: './smoke'` also keeps it out of `testDir: './e2e'`, so neither suite
 * can pick up the other's specs by accident.
 */

/**
 * The deployed origin under test. No default: guessing an environment's address
 * is how a check ends up passing against something nobody meant to test — the
 * same reasoning as `requiredEnv()` in e2e/env.ts.
 */
const baseURL = process.env.SMOKE_WEB_URL;
if (!baseURL) {
  throw new Error(
    '[smoke] SMOKE_WEB_URL is required — the deployed web origin, e.g. ' +
      'https://app.boxops.dev. There is no default on purpose.',
  );
}

export default defineConfig({
  testDir: './smoke',

  // One test, but it waits on a CDN, a cold Fly machine and a real round trip to
  // Neon behind the login attempt.
  timeout: 120_000,
  expect: { timeout: 15_000 },

  // A retry here would hide exactly what this suite exists to find. A deployment
  // that works on the second attempt is a deployment with a cold-start or
  // propagation problem, and that is a finding, not noise. The `deploy` job
  // already waits for /health before this runs.
  retries: 0,

  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    baseURL,

    // Desktop only. This checks that a deployment serves and connects — not
    // layout, which is DESIGN.md's concern and reviewed at two widths by hand.
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 832 },

    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
