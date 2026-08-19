/**
 * Jest E2E global setup file.
 *
 * Runs before each test file. Sets environment variables required for
 * real JWT verification so tests do not rely on the dev bypass in
 * JwtAuthGuard (which only fires when NODE_ENV === 'development').
 */
import { pinE2eDatabase } from './e2e-database';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';

/**
 * Every worker is pinned to the e2e database, and proves it.
 *
 * `globalSetup` already put `DB_NAME` in the environment this process inherited,
 * so this is redundant on the happy path — deliberately. It is the check that
 * fires if a spec is run through some other entry point, and it fails at import
 * time, before a single connection opens. See e2e-database.ts for what running
 * against `crossfit_box_dev` did to this suite.
 */
pinE2eDatabase();

/**
 * The lifecycle scheduler must not run while these specs do.
 *
 * `ClassLifecycleScheduler` sweeps every minute and its query is not scoped to a
 * gym — it takes every class in the database in `published`, `booking_closed` or
 * `in_progress` and advances any whose time has passed. Fixtures here are dated in
 * the past on purpose (results-attendance-programming builds its classes on
 * 2025-01-10), so a tick landing mid-spec moves a class out from under an
 * assertion: a `published` class quietly becomes `booking_closed`, and then
 * "toggles loggable on a published class" gets a 400 while "attendance is not
 * allowed on a published class" gets a 201.
 *
 * The crons fire on the minute and a run takes a few seconds, so this only bit
 * about one run in twelve, in whichever spec happened to be mid-flight. Turning
 * the schedulers off makes time in these specs move only when a test moves it.
 * membership-renewal is unaffected: it resolves its scheduler from the module and
 * calls the sweep itself, which needs the provider, not the cron.
 */
process.env.DISABLE_SCHEDULERS = 'true';
