import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import {
  E2E_API_URL,
  E2E_TIMEZONE,
  E2E_WEB_PORT,
  E2E_WEB_URL,
  e2eBackendEnv,
} from './e2e/env';

/**
 * The e2e suite runs its own full stack — backend on 3001, Expo web on 8082,
 * database `crossfit_box_e2e` — so it can be destructive while a dev stack on
 * 3000/8081 stays untouched. See e2e/env.ts for why that separation is
 * enforced in three places rather than trusted once.
 */
export default defineConfig({
  testDir: './e2e',

  // Journeys drive a real browser through multi-role sequences and each seeds
  // its own gym first, so they are slower than the presence-checking tests this
  // replaces. 30s was tuned for those and would cut real journeys short.
  timeout: 90_000,
  expect: { timeout: 10_000 },

  // No retries. A journey that only passes on a second attempt is telling us
  // something (a race, an unawaited write) that a retry would hide — and every
  // journey seeds its own data, so there is no ordering flake left to paper
  // over. Revisit only with a specific reason.
  retries: 0,

  // Serial, and measured rather than assumed. Per-journey fixtures do make
  // parallelism safe as far as DATA goes — every journey seeds its own gym, so
  // there are no rows to collide over. The stack is what cannot take it: all
  // workers share one Expo dev server, which bundles routes on demand, and one
  // backend. Run at `--workers=4 --fully-parallel`, the suite took 13.7 min
  // against 3.0 min serially and 14 of 45 tests failed — individual journeys
  // inflating from 20s to 1.6m, then timing out and taking their contexts with
  // them. Slower AND flaky, so there is nothing to trade. Revisit only with a
  // per-worker Expo server, not by turning this number up.
  workers: 1,
  fullyParallel: false,

  // A journey that ends in `.only` or has no assertions should not pass CI.
  forbidOnly: !!process.env.CI,

  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: E2E_WEB_URL,

    // Pins the BROWSER's clock to a negative-offset zone. Without this, on a
    // UTC machine, "the day the owner picked" and "the day the athlete sees"
    // are trivially equal and the assertion proves nothing — which is how the
    // date seam fixed in 8829f75 survived. Node keeps the machine zone, so
    // never compute a day outside e2e/helpers/dates.ts.
    timezoneId: E2E_TIMEZONE,
    locale: 'en-US',

    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 832 } },
    },
  ],

  globalSetup: path.resolve(__dirname, 'e2e/global-setup.ts'),

  webServer: [
    {
      // The e2e backend. `e2eBackendEnv()` is what points it at the e2e
      // database, its own port, and turns the schedulers off.
      command: 'npm run start --prefix ../backend',
      // No health route exists; Swagger UI is served once the app is listening.
      url: `${E2E_API_URL}/api-docs`,
      env: e2eBackendEnv(),
      // Nest compiles before listening, and the first boot against an empty
      // database also runs TypeORM synchronize.
      timeout: 180_000,
      // Never adopt a server already on this port: it would be running with
      // unknown env, and "unknown env" here means possibly the dev database.
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `npx expo start --web --port ${E2E_WEB_PORT}`,
      url: E2E_WEB_URL,
      // No API base URL is passed, and NODE_ENV is left alone — neither works.
      // Expo inlines EXPO_PUBLIC_* into the bundle from .env FILES ahead of the
      // environment, so an override here loses to .env.local even with a cold
      // cache; and NODE_ENV=test (which would skip .env.local) stops
      // babel-preset-expo injecting EXPO_ROUTER_APP_ROOT, breaking every bundle.
      // pinApiOrigin() in e2e/fixtures.ts routes /api traffic to the e2e backend
      // instead, which holds regardless of what any machine's .env.local says.
      // Metro's first web bundle is slow from a cold cache.
      timeout: 240_000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
