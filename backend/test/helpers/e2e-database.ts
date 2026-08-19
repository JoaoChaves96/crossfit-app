/**
 * Single source of truth for the database the backend e2e suite may touch.
 *
 * This suite used to have no database of its own. `backend/.env` sets no
 * `DB_NAME`, so `src/config/database.config.ts` fell through to its default and
 * every spec ran against `crossfit_box_dev` — the same database a human's dev
 * stack is using. Three things followed, all measured rather than guessed:
 *
 *  1. A dev server's `ClassLifecycleScheduler` ticks every minute and
 *     `class.repository.ts` `getClassesByStates` filters on state alone, with no
 *     `gymId` — a whole-database sweep. Fixtures here are past-dated on purpose,
 *     so a tick advanced a `published` class to `booking_closed` underneath a
 *     live assertion. `DISABLE_SCHEDULERS` in jest-e2e.setup.ts cannot help:
 *     that is a different process.
 *  2. Every worker runs TypeORM `synchronize` against the shared schema — DDL on
 *     the tables the dev server is serving from. The load-correlated
 *     `socket hang up` cascades.
 *  3. `@test.local` leftovers accumulated 144 -> 293 across ~55 runs, because
 *     per-spec `afterAll` cleanup does not keep up.
 *
 * `epics/E2E_JOURNEYS.md` already stated the rule verbatim — *"it must never be
 * able to reach the dev database"* — but it was written for, and only enforced
 * in, the Playwright stack (`frontend/e2e/env.ts`). This file is that guard,
 * ported to the jest stack.
 *
 * Why not reuse the Playwright suite's `crossfit_box_e2e`: both suites truncate
 * on start, so an overlapping run would corrupt the other's fixtures — the very
 * failure mode being fixed here. One database per suite, no coordination needed.
 */
import { DataSource, DataSourceOptions } from 'typeorm';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

/** The ONLY database the backend e2e suite may ever connect to. */
export const E2E_DB_NAME = 'crossfit_box_api_e2e';

/**
 * The database this suite must never reach. Named explicitly so the error can
 * say why: it holds hand-seeded manual-test scenarios that no script rebuilds.
 */
export const DEV_DB_NAME = 'crossfit_box_dev';

/**
 * Throws unless the given name is exactly the e2e database.
 *
 * Called before opening a connection and before any destructive statement. It
 * is cheap, and it is the last line of defence for a mistake that cannot be
 * undone.
 */
export function assertE2eDatabase(name: string | undefined): void {
  if (name !== E2E_DB_NAME) {
    throw new Error(
      `[e2e] Refusing to run against database "${name ?? '(unset)'}". ` +
        `The backend e2e suite may only touch "${E2E_DB_NAME}" — it truncates ` +
        `data, and "${DEV_DB_NAME}" holds hand-seeded manual-test scenarios.`,
    );
  }
}

/**
 * Resolves the app's real database config — deliberately late.
 *
 * `databaseConfig` is a module-level object literal: `process.env.DB_NAME` is
 * read once, when the module is first imported, and the result is frozen for the
 * life of the process. Importing it at the top of this file would therefore
 * capture the default `crossfit_box_dev` *before* `pinE2eDatabase()` had a
 * chance to set anything, and the guard below would fail every run while the
 * app went on connecting correctly — a guard that lies in both directions.
 *
 * Requiring it only after the environment is set makes that first, cached
 * evaluation the correct one, and it is the same cached object the app then
 * connects with. The lateness is the mechanism, not a style choice.
 */
function resolveDatabaseConfig(): TypeOrmModuleOptions {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { databaseConfig } = require('../../src/config/database.config') as {
    databaseConfig: TypeOrmModuleOptions;
  };
  return databaseConfig;
}

/**
 * Points this process at the e2e database and proves the value landed.
 *
 * `DB_NAME` is overwritten, not defaulted. An inherited value is exactly how a
 * suite ends up destructive against the wrong database, so an ambient one is not
 * honoured. The assertion then reads the config the app actually connects with,
 * so this checks the wiring rather than the intent.
 */
export function pinE2eDatabase(): void {
  process.env.DB_NAME = E2E_DB_NAME;
  assertE2eDatabase(resolveDatabaseConfig().database as string | undefined);
}

/** A DataSource on the e2e database, guarded on the way in. */
export function e2eDataSource(): DataSource {
  const config = resolveDatabaseConfig();
  assertE2eDatabase(config.database as string | undefined);
  return new DataSource(config as DataSourceOptions);
}
