/**
 * Single source of truth for where the e2e stack lives.
 *
 * The suite runs its own backend and its own web server on their own ports,
 * against its own database, so it can be destructive without touching the dev
 * stack a human is using at the same time.
 *
 *   dev:  API :3000   web :8081   db crossfit_box_dev
 *   e2e:  API :3001   web :8082   db crossfit_box_e2e
 *
 * Nothing here reads a `DB_NAME`/`PORT` already in the environment. That is
 * deliberate: an inherited value is exactly how this suite's predecessor came
 * to TRUNCATE 15 tables in `crossfit_box_dev`, which is where the hand-seeded
 * manual-test scenarios live. The e2e target is a constant, and
 * `assertE2eDatabase()` re-checks it before any statement runs.
 */

/** The ONLY database this suite may ever connect to. */
export const E2E_DB_NAME = 'crossfit_box_e2e';

/**
 * The timezone the browser is pinned to for every run.
 *
 * Negative offset, on purpose. `playwright.config.ts` previously set no
 * timezoneId at all, so on a UTC machine every "the date the owner picked is
 * the date the athlete sees" assertion held for the wrong reason — which is how
 * the `@Column('date')` write seam fixed in 8829f75 shipped. West of UTC, a
 * value stored as an instant and read on a local calendar lands a day early,
 * so a regression is visible.
 *
 * `timezoneId` pins the BROWSER only; Node stays on the machine's zone. Never
 * compute a calendar day with Node's local getters — use dates.ts, which is
 * explicit about the zone, so both sides of an assertion mean the same day.
 */
export const E2E_TIMEZONE = 'America/New_York';

export const E2E_API_PORT = 3001;
export const E2E_WEB_PORT = 8082;

export const E2E_API_URL = `http://localhost:${E2E_API_PORT}`;
export const E2E_WEB_URL = `http://localhost:${E2E_WEB_PORT}`;

/**
 * The dev API the app must never be pointed at during a run.
 *
 * `frontend/.env.local` sets EXPO_PUBLIC_API_BASE_URL to a LAN address for
 * device testing. Expo does not overwrite a variable already present in the
 * system environment (`@expo/env` loadEnvFiles), so exporting our own value
 * wins — but a bundler cache or a stray port could still land the app on the
 * dev API, where writes would reach the dev database through HTTP and slip
 * straight past the SQL-level guard below. `pinApiOrigin()` in fixtures.ts
 * closes that by REWRITING every `/api` request whose origin is not this one, so
 * no page in the suite can reach a host other than the e2e API.
 */
export const E2E_ALLOWED_API_ORIGIN = E2E_API_URL;

/** Connection settings for the e2e database. Host settings mirror the dev container. */
export const e2eDbConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: E2E_DB_NAME,
} as const;

/**
 * Throws unless the given database name is exactly the e2e database.
 *
 * Called before opening a connection and before any destructive statement. It
 * is cheap and it is the last line of defence for a mistake that is not
 * recoverable: the dev database holds manually seeded scenarios that no script
 * can rebuild.
 */
export function assertE2eDatabase(name: string): void {
  if (name !== E2E_DB_NAME) {
    throw new Error(
      `[e2e] Refusing to run against database "${name}". ` +
        `The e2e suite may only touch "${E2E_DB_NAME}" — it truncates data, and ` +
        `the dev database holds hand-seeded manual-test scenarios.`,
    );
  }
}

/** Environment the e2e backend is booted with. */
export function e2eBackendEnv(): Record<string, string> {
  return {
    DB_NAME: E2E_DB_NAME,
    PORT: String(E2E_API_PORT),
    // Silences the class-lifecycle, membership-renewal and reminder crons so a
    // fixture cannot change state mid-test. See backend/src/app.module.ts.
    DISABLE_SCHEDULERS: 'true',
    // `test`, not `development`, and the difference is load-bearing:
    //
    //  - synchronize is on for any non-production NODE_ENV, which is what
    //    builds the schema in the empty e2e database — no migration step.
    //  - under `development`, JwtAuthGuard accepts a request with NO
    //    Authorization header and takes identity from `x-user-id` headers
    //    (jwt-auth.guard.ts). That backdoor would mask exactly the auth/token
    //    races this suite exists to catch: an unauthenticated request would
    //    succeed instead of 401ing. Under `test` every request must carry a
    //    real JWT, as in production.
    NODE_ENV: 'test',
  };
}
