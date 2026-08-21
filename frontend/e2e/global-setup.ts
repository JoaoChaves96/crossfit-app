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
  assertE2eDatabase,
  e2eDbConnection,
  e2eDbName,
  e2eMigrationEnv,
  e2eTarget,
} from './env';

/**
 * TypeORM's own ledger of applied migrations. Schema metadata, not application
 * data, and truncating it would tell the next run that nothing has been applied
 * — so `migration:run` would try to CREATE TABLE over tables that still exist.
 */
const MIGRATIONS_LEDGER = 'migrations';

async function globalSetup(): Promise<void> {
  // Before anything opens a socket. On a remote run this is the check standing
  // between a malformed E2E_DB_NAME and staging's own data.
  const dbName = e2eDbName();
  assertE2eDatabase(dbName);

  // From env.ts rather than assembled here: `helpers/seed.ts` opens its own
  // client from the same function, and two copies of the remote branch is how
  // the two files would drift onto different databases.
  const client = new Client(e2eDbConnection());

  try {
    await client.connect();
  } catch (err) {
    // The remedy differs by target, and a wrong remedy sends someone creating a
    // local database to fix a deployment. Neither message mentions a host: on a
    // remote run the address lives inside E2E_DATABASE_URL, which carries the
    // password and must not be echoed.
    const remedy =
      e2eTarget() === 'remote'
        ? `Check E2E_DATABASE_URL points at Neon's DIRECT endpoint for "${dbName}", ` +
          `and that the workflow created that database before this ran.`
        : `Create it first: docker exec crossfit_postgres psql -U postgres -c 'CREATE DATABASE ${dbName}'.`;

    throw new Error(
      `[e2e] Could not connect to "${dbName}". ${remedy} ` +
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
    //
    // Asserted against `e2eDbName()` rather than the migration env's DB_NAME,
    // which only exists on the local path — a remote run passes DATABASE_URL
    // instead, so reading `.DB_NAME` there would assert on `undefined`.
    assertE2eDatabase(e2eDbName());
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
        `[e2e] "${dbName}" has no tables after migration:run. The baseline ` +
          `migration should have created them — check the migration output above.`,
      );
    }

    const quoted = tables.rows.map((r) => `"${r.name}"`).join(', ');
    await client.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);

    console.log(`[e2e] Truncated ${tables.rowCount} tables in ${dbName}.`);
  } finally {
    await client.end();
  }
}

export default globalSetup;
