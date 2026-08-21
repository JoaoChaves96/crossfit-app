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

/** Connection settings for the e2e database. Host settings mirror the dev container. */
export const e2eDbConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: E2E_DB_NAME,
} as const;

/**
 * Where this run's stack lives.
 *
 * `local` is the default and behaves exactly as this file always has: constants,
 * never inherited values. `remote` runs the same journeys against a DEPLOYED
 * environment — the Pages build and an ephemeral API — and takes its addresses
 * from the environment because a deployment's addresses are not knowable here.
 *
 * The default is deliberate. A missing or misspelled variable resolves to
 * `local`, which is the harmless direction: a local run against a remote
 * database is the accident worth preventing, not the reverse.
 */
export type E2eTarget = 'local' | 'remote';

export function e2eTarget(): E2eTarget {
  return process.env.E2E_TARGET === 'remote' ? 'remote' : 'local';
}

/**
 * Databases the suite must never touch, whatever the target says.
 *
 * `crossfit_box_dev` holds hand-seeded manual-test scenarios no script can
 * rebuild. `boxops_staging` holds the demo data, which a deploy is forbidden to
 * write and a test suite has even less business truncating. `neondb` and
 * `postgres` are provider-owned. This list is checked in BOTH targets — the
 * pattern below would already reject them, and that redundancy is the point: a
 * future edit to the pattern cannot quietly re-open the hole.
 */
export const E2E_FORBIDDEN_DB_NAMES: readonly string[] = [
  'crossfit_box_dev',
  'boxops_staging',
  'neondb',
  'postgres',
];

/**
 * The only shape a remote e2e database name may take: the local name, an
 * underscore, and a 7-40 character run id of lowercase alphanumerics.
 *
 * Anchored at both ends, and the suffix cannot be empty. `crossfit_box_e2e_` and
 * `crossfit_box_e2e_abc_staging` both fail, which is the shape a typo or a
 * copy-paste takes.
 */
const REMOTE_DB_PATTERN = new RegExp(`^${E2E_DB_NAME}_[a-z0-9]{7,40}$`);

function requiredEnv(name: string): string {
  // `expo/no-dynamic-env-var` guards the BUNDLER, which inlines EXPO_PUBLIC_*
  // statically. Nothing in e2e/ is bundled — this runs in Node, where a dynamic
  // read is just a read.
  // eslint-disable-next-line expo/no-dynamic-env-var
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[e2e] ${name} is required when E2E_TARGET=remote. The remote target has ` +
        `no defaults on purpose: guessing a deployment's address is how a run ` +
        `ends up somewhere nobody intended.`,
    );
  }
  return value;
}

/** The web origin under test. */
export function e2eWebUrl(): string {
  return e2eTarget() === 'remote' ? requiredEnv('E2E_WEB_URL') : E2E_WEB_URL;
}

/**
 * The API origin every `/api` request is pinned to, and the one the app must
 * never be pointed away from during a run.
 *
 * `frontend/.env.local` sets EXPO_PUBLIC_API_BASE_URL to a LAN address for
 * device testing. Expo does not overwrite a variable already present in the
 * system environment (`@expo/env` loadEnvFiles), so exporting our own value
 * wins — but a bundler cache or a stray port could still land the app on the
 * dev API, where writes would reach the dev database through HTTP and slip
 * straight past the SQL-level guard below. `pinApiOrigin()` in fixtures.ts
 * closes that by REWRITING every `/api` request whose origin is not this one, so
 * no page in the suite can reach a host other than this run's API. That is also
 * what makes a deployed bundle's baked-in base URL irrelevant on the remote
 * target — where the origin is the EPHEMERAL API in front of this run's
 * throwaway database, never staging's own API, which writes to
 * `boxops_staging`.
 */
export function e2eApiUrl(): string {
  return e2eTarget() === 'remote' ? requiredEnv('E2E_API_URL') : E2E_API_URL;
}

/** The database this run may touch, and only this one. */
export function e2eDbName(): string {
  return e2eTarget() === 'remote' ? requiredEnv('E2E_DB_NAME') : E2E_DB_NAME;
}

/** Whatever `new Client()` needs to reach this run's database. */
export type E2eDbConnection = typeof e2eDbConfig | { connectionString: string };

/**
 * Connection settings for this run's database, local or remote.
 *
 * One function rather than a branch in each caller: `global-setup.ts` and
 * `helpers/seed.ts` both open their own client, and a duplicated
 * `E2E_DATABASE_URL` branch is how the two would drift into pointing at
 * different databases. Neither caller may skip `assertE2eDatabase()` because of
 * this — the connection and the guard answer different questions.
 */
export function e2eDbConnection(): E2eDbConnection {
  if (e2eTarget() !== 'remote') return e2eDbConfig;

  const url = process.env.E2E_DATABASE_URL;
  if (!url) {
    throw new Error(
      `[e2e] E2E_DATABASE_URL is required when E2E_TARGET=remote. Use Neon's ` +
        `DIRECT (non-pooled) endpoint: the migration CLI and the truncate need ` +
        `a real session, and a pooled connection can serve them from different ` +
        `backends. There is no default on purpose.`,
    );
  }
  return { connectionString: url };
}

/**
 * Throws unless the given database name is this run's designated e2e database.
 *
 * Called before opening a connection and before any destructive statement.
 * Cheap, and the last line of defence for a mistake that is not recoverable.
 *
 * The remote target widened WHAT this accepts — a per-run throwaway name — and
 * nothing else. It still refuses the dev database, and it now also refuses
 * `boxops_staging`, which is the same mistake in its modern form: staging holds
 * demo data seeded by hand, outside the pipeline, precisely so that no automated
 * step can clobber it.
 */
export function assertE2eDatabase(name: string): void {
  const refuse = (why: string): never => {
    throw new Error(
      `[e2e] Refusing to run against database "${name}": ${why} ` +
        `This suite truncates data; the dev database holds hand-seeded ` +
        `manual-test scenarios and staging holds the demo data.`,
    );
  };

  if (E2E_FORBIDDEN_DB_NAMES.includes(name)) {
    refuse('it is on the forbidden list.');
  }

  if (e2eTarget() === 'remote') {
    if (!REMOTE_DB_PATTERN.test(name)) {
      refuse(
        `a remote run may only touch a per-run throwaway database matching ` +
          `${E2E_DB_NAME}_<runid>.`,
      );
    }
    return;
  }

  if (name !== E2E_DB_NAME) {
    refuse(`a local run may only touch "${E2E_DB_NAME}".`);
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
    // `production`, so synchronize is OFF: the schema is built by
    // `migration:run` in global-setup.ts and by nothing else. While this was
    // `test`, synchronize built the e2e schema on boot and the migration path
    // was exercised by nothing — a baseline no test could contradict.
    //
    // This was once also load-bearing against `development`, because
    // JwtAuthGuard accepted a request with NO Authorization header and took
    // identity from `x-user-id` headers — a backdoor that would have masked
    // exactly the auth/token races this suite exists to catch, letting an
    // unauthenticated request succeed instead of 401ing. That branch was
    // removed on 2026-08-14, so every environment now behaves like this one.
    NODE_ENV: 'production',
  };
}

/**
 * Environment for running the backend's migration CLI against the e2e database.
 *
 * Same guard as everything else here: the database name is a constant, never
 * inherited. `NODE_ENV=production` is deliberate — it forces `synchronize` off
 * for this one command, so the schema is built by the migration and only by the
 * migration. If synchronize also ran, a passing suite would prove nothing about
 * the baseline.
 */
export function e2eMigrationEnv(): Record<string, string> {
  return {
    DB_NAME: E2E_DB_NAME,
    NODE_ENV: 'production',
    DISABLE_SCHEDULERS: 'true',
  };
}
