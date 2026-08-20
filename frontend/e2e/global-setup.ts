/**
 * Playwright globalSetup: hand the run an empty e2e database.
 *
 * It does exactly one thing. It does NOT seed — journeys seed themselves
 * (helpers/seed.ts), which is what lets them run in any order.
 *
 * Ordering note: Playwright starts `webServer` (a config plugin) before
 * globalSetup, so the API is already up by the time this runs. The schema
 * therefore CANNOT be built by the API's boot any more — `e2eBackendEnv()` no
 * longer relies on synchronize — so this file runs the migrations itself,
 * against an empty database, before truncating.
 *
 * Running migrations here rather than in a webServer command is what makes the
 * baseline load-bearing: every local run now proves the migration path builds a
 * schema the 15 journeys pass against.
 *
 * Every failure below throws. Its predecessor caught an unreachable database,
 * logged `console.warn`, and let the suite proceed, so a run against no database
 * at all reported green.
 */
import { execFileSync } from 'child_process';
import path from 'path';
import { Client } from 'pg';
import {
  E2E_DB_NAME,
  assertE2eDatabase,
  e2eDbConfig,
  e2eMigrationEnv,
} from './env';

/**
 * TypeORM's own ledger of applied migrations. Schema metadata, not application
 * data, and truncating it would tell the next run that nothing has been applied
 * — so `migration:run` would try to CREATE TABLE over tables that still exist.
 */
const MIGRATIONS_LEDGER = 'migrations';

async function globalSetup(): Promise<void> {
  assertE2eDatabase(e2eDbConfig.database);

  const client = new Client(e2eDbConfig);

  try {
    await client.connect();
  } catch (err) {
    throw new Error(
      `[e2e] Could not connect to "${E2E_DB_NAME}" at ${e2eDbConfig.host}:${e2eDbConfig.port}. ` +
        `Create it first: docker exec crossfit_postgres psql -U postgres -c 'CREATE DATABASE ${E2E_DB_NAME}'. ` +
        `(${err instanceof Error ? err.message : String(err)})`,
    );
  }

  try {
    // Re-assert against the name the SERVER reports, not the one we asked for.
    // Cheap, and it closes the gap between "we intended to connect to the e2e
    // database" and "we are connected to it".
    const { rows } = await client.query<{ db: string }>('SELECT current_database() AS db');
    assertE2eDatabase(rows[0].db);

    // Build the schema from migrations. Idempotent: TypeORM skips migrations
    // already recorded in its own table, so a repeat run is a no-op.
    assertE2eDatabase(e2eMigrationEnv().DB_NAME);
    execFileSync('npm', ['run', 'migration:run'], {
      cwd: path.resolve(__dirname, '../../backend'),
      env: { ...process.env, ...e2eMigrationEnv() },
      stdio: 'inherit',
    });

    // Discovered rather than listed: a hardcoded table list silently stops
    // clearing whatever entity is added next, and stale rows across runs are
    // how order-dependent suites start. Read AFTER the migrations run — on a
    // first run the tables do not exist until then.
    const tables = await client.query<{ name: string }>(
      `SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public' AND tablename <> $1`,
      [MIGRATIONS_LEDGER],
    );

    if (tables.rowCount === 0) {
      throw new Error(
        `[e2e] "${E2E_DB_NAME}" has no tables after migration:run. The baseline ` +
          `migration should have created them — check the migration output above.`,
      );
    }

    const quoted = tables.rows.map((r) => `"${r.name}"`).join(', ');
    await client.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);

    console.log(`[e2e] Truncated ${tables.rowCount} tables in ${E2E_DB_NAME}.`);
  } finally {
    await client.end();
  }
}

export default globalSetup;
