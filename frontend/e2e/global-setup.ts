/**
 * Playwright globalSetup: hand the run an empty e2e database.
 *
 * It does exactly one thing. It does NOT seed — journeys seed themselves
 * (helpers/seed.ts), which is what lets them run in any order.
 *
 * Ordering note: Playwright starts `webServer` (a config plugin) before
 * globalSetup, so by the time this runs the e2e backend has booted and TypeORM
 * `synchronize` has built the schema. That is why an empty database needs no
 * migration step — and why truncating here, rather than before boot, works.
 *
 * Every failure below throws. Its predecessor caught an unreachable database,
 * logged `console.warn`, and let the suite proceed, so a run against no database
 * at all reported green.
 */
import { Client } from 'pg';
import { E2E_DB_NAME, assertE2eDatabase, e2eDbConfig } from './env';

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

    // Discovered rather than listed: a hardcoded table list silently stops
    // clearing whatever entity is added next, and stale rows across runs are
    // how order-dependent suites start.
    const tables = await client.query<{ name: string }>(
      `SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'`,
    );

    if (tables.rowCount === 0) {
      throw new Error(
        `[e2e] "${E2E_DB_NAME}" has no tables. The e2e backend should have created them on ` +
          `boot via TypeORM synchronize — check that it started and that DB_NAME reached it.`,
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
