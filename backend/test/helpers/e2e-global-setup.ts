/**
 * Jest `globalSetup` for the backend e2e suite.
 *
 * Runs once in the main process before any worker is forked, which buys three
 * things a per-file `setupFiles` hook cannot:
 *
 *  1. **The env reaches every worker.** Workers inherit the main process
 *     environment, so pinning `DB_NAME` here covers the whole run — the same
 *     mechanism jest-tz.setup.ts relies on for the unit suite.
 *  2. **The schema is built once.** `synchronize` is on for any non-production
 *     NODE_ENV, so without this every worker would issue DDL against the same
 *     schema concurrently. Creating it here first leaves each worker's
 *     synchronize with nothing to do.
 *  3. **The run starts clean.** Truncating once here is what per-spec `afterAll`
 *     cleanup never managed; leftovers had been accumulating run over run.
 *
 * This is also where the run dies if the database is missing, with the command
 * to create it — an empty target is a setup problem, not a test failure.
 */
import { E2E_DB_NAME, e2eDataSource, pinE2eDatabase } from './e2e-database';

export default async function setupE2eDatabase(): Promise<void> {
  // `synchronize` keys off NODE_ENV, and this process is the one that builds the
  // schema, so it has to agree with the workers about which environment it is.
  process.env.NODE_ENV = 'test';
  pinE2eDatabase();

  const dataSource = e2eDataSource();

  try {
    await dataSource.initialize();
  } catch (error) {
    throw new Error(
      `[e2e] Could not connect to "${E2E_DB_NAME}". Create it first:\n` +
        `  docker exec crossfit_postgres psql -U postgres -c 'CREATE DATABASE ${E2E_DB_NAME}'\n` +
        `Underlying error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    // Builds the schema on first run and reconciles it after an entity change.
    await dataSource.synchronize();

    const tables = await dataSource.query<{ tablename: string }[]>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );

    if (tables.length > 0) {
      const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
      // One statement, CASCADE: the fixtures are a graph of foreign keys, so
      // table-at-a-time truncation would fail on ordering.
      await dataSource.query(`TRUNCATE TABLE ${list} CASCADE`);
    }

    console.log(`[e2e] ${E2E_DB_NAME} ready — ${tables.length} tables truncated.`);
  } finally {
    await dataSource.destroy();
  }
}
