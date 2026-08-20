import { buildDatabaseConfig } from './database.config';

type PgOptions = ReturnType<typeof buildDatabaseConfig> & {
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  ssl?: unknown;
  migrations?: unknown[];
  synchronize?: boolean;
};

function build(env: Record<string, string | undefined>): PgOptions {
  return buildDatabaseConfig(env as NodeJS.ProcessEnv) as PgOptions;
}

describe('buildDatabaseConfig', () => {
  it('uses the discrete DB_* variables when DATABASE_URL is absent', () => {
    const config = build({
      DB_HOST: 'db.internal',
      DB_PORT: '6543',
      DB_USERNAME: 'app',
      DB_PASSWORD: 'secret',
      DB_NAME: 'crossfit_box_e2e',
    });

    expect(config.url).toBeUndefined();
    expect(config.host).toBe('db.internal');
    expect(config.port).toBe(6543);
    expect(config.database).toBe('crossfit_box_e2e');
  });

  it('falls back to the local dev defaults when nothing is set', () => {
    const config = build({});

    expect(config.host).toBe('localhost');
    expect(config.port).toBe(5432);
    expect(config.database).toBe('crossfit_box_dev');
  });

  it('prefers DATABASE_URL over the discrete variables', () => {
    const config = build({
      DATABASE_URL: 'postgres://u:p@ep-neon.eu-central-1.aws.neon.tech/staging',
      DB_HOST: 'localhost',
      DB_NAME: 'crossfit_box_dev',
    });

    expect(config.url).toBe(
      'postgres://u:p@ep-neon.eu-central-1.aws.neon.tech/staging',
    );
    expect(config.host).toBeUndefined();
    expect(config.database).toBeUndefined();
  });

  it('enables TLS only when DATABASE_SSL is exactly "true"', () => {
    expect(build({ DATABASE_SSL: 'true' }).ssl).toEqual({
      rejectUnauthorized: false,
    });
    expect(build({ DATABASE_SSL: 'false' }).ssl).toBeUndefined();
    expect(build({}).ssl).toBeUndefined();
  });

  it('registers a migrations glob so the CLI and the app agree', () => {
    expect(build({}).migrations).toEqual([
      `${__dirname}/../migrations/*.{ts,js}`,
    ]);
  });

  it('keeps synchronize off only in production', () => {
    expect(build({ NODE_ENV: 'production' }).synchronize).toBe(false);
    expect(build({ NODE_ENV: 'test' }).synchronize).toBe(true);
    expect(build({}).synchronize).toBe(true);
  });

  it('never runs migrations automatically on boot', () => {
    expect(
      (build({ NODE_ENV: 'production' }) as { migrationsRun?: boolean })
        .migrationsRun,
    ).not.toBe(true);
  });
});
