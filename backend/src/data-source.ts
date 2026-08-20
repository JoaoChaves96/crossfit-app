import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { buildDatabaseConfig } from './config/database.config';

/**
 * The DataSource the TypeORM CLI uses. Never imported by the application.
 *
 * It is built from the same `buildDatabaseConfig` the app uses, so the CLI
 * cannot drift from the running schema — a CLI with its own entity list is how
 * a "generated" baseline ends up missing a table nobody notices until deploy.
 *
 * `synchronize` is forced off regardless of NODE_ENV. The CLI is pointed at
 * real databases, and a `migration:run` that quietly synchronized first would
 * make the migration appear to work while proving nothing about it.
 *
 * Exactly one export, and no `export default` alongside it: the CLI counts
 * exported DataSource instances and refuses a file that has two, even when both
 * names point at the same object.
 */
export const AppDataSource = new DataSource({
  ...buildDatabaseConfig(process.env),
  synchronize: false,
} as DataSourceOptions);
