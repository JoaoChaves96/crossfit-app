/**
 * The e2e suite's own safety guard, tested.
 *
 * This file exists because assertE2eDatabase() is the last line of defence for
 * an unrecoverable mistake — the dev database holds hand-seeded scenarios no
 * script can rebuild, and staging holds demo data a deploy must not clobber.
 * A guard with no tests is a guard nobody can safely change.
 */
import {
  E2E_DB_NAME,
  assertE2eDatabase,
  e2eApiUrl,
  e2eDbConnection,
  e2eDbName,
  e2eTarget,
  e2eWebUrl,
} from '../e2e/env';

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('e2eTarget', () => {
  it('defaults to local when nothing is set', () => {
    delete process.env.E2E_TARGET;
    expect(e2eTarget()).toBe('local');
  });

  it('is remote only for the exact string "remote"', () => {
    process.env.E2E_TARGET = 'remote';
    expect(e2eTarget()).toBe('remote');

    process.env.E2E_TARGET = 'REMOTE';
    expect(e2eTarget()).toBe('local');

    process.env.E2E_TARGET = 'staging';
    expect(e2eTarget()).toBe('local');
  });
});

describe('local target', () => {
  beforeEach(() => {
    delete process.env.E2E_TARGET;
  });

  it("ignores a remote target's URLs and database name", () => {
    process.env.E2E_WEB_URL = 'https://app.boxops.dev';
    process.env.E2E_API_URL = 'https://api.boxops.dev';
    process.env.E2E_DB_NAME = 'boxops_staging';

    expect(e2eWebUrl()).toBe('http://localhost:8082');
    expect(e2eApiUrl()).toBe('http://localhost:3001');
    expect(e2eDbName()).toBe(E2E_DB_NAME);
  });

  it('accepts only the e2e database', () => {
    expect(() => assertE2eDatabase('crossfit_box_e2e')).not.toThrow();
    expect(() => assertE2eDatabase('crossfit_box_dev')).toThrow(/Refusing/);
    expect(() => assertE2eDatabase('boxops_staging')).toThrow(/Refusing/);
  });
});

/**
 * The ports resolve at module load, so each case has to re-import the module with
 * the environment already set — the same way a real run sees it, since
 * `playwright.config.ts` and the spawned backend both read the value once.
 */
describe('port overrides', () => {
  function load(env: Record<string, string | undefined>) {
    delete process.env.E2E_API_PORT;
    delete process.env.E2E_WEB_PORT;
    Object.assign(process.env, env);

    let mod: typeof import('../e2e/env') | undefined;
    jest.isolateModules(() => {
      // A fresh module registry is the whole point; `import` is hoisted and would
      // bind the values from before the environment was set.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require('../e2e/env');
    });
    return mod!;
  }

  it('defaults to 3001/8082 when nothing is set', () => {
    const env = load({});
    expect(env.E2E_API_PORT).toBe(3001);
    expect(env.E2E_WEB_PORT).toBe(8082);
    expect(env.E2E_API_URL).toBe('http://localhost:3001');
    expect(env.E2E_WEB_URL).toBe('http://localhost:8082');
  });

  it('takes both ports from the environment, URLs included', () => {
    const env = load({ E2E_API_PORT: '3101', E2E_WEB_PORT: '8182' });
    expect(env.E2E_API_URL).toBe('http://localhost:3101');
    expect(env.E2E_WEB_URL).toBe('http://localhost:8182');
  });

  it('boots the backend on the overridden API port', () => {
    const env = load({ E2E_API_PORT: '3101' });
    expect(env.e2eBackendEnv()).toEqual(
      expect.objectContaining({ PORT: '3101', DB_NAME: 'crossfit_box_e2e' }),
    );
  });

  // Falling back here would land the run on the port the caller was escaping.
  it.each(['0', '70000', 'abc', '8082.5', '-1'])(
    'refuses %s rather than falling back',
    (raw) => {
      expect(() => load({ E2E_WEB_PORT: raw })).toThrow(/not a port number/);
    },
  );

  it('treats an empty value as unset', () => {
    expect(load({ E2E_WEB_PORT: '' }).E2E_WEB_PORT).toBe(8082);
  });
});

describe('remote target', () => {
  beforeEach(() => {
    process.env.E2E_TARGET = 'remote';
    process.env.E2E_WEB_URL = 'https://app.boxops.dev';
    process.env.E2E_API_URL = 'https://boxops-api-e2e.fly.dev';
    process.env.E2E_DB_NAME = 'crossfit_box_e2e_abc1234';
  });

  it('reads its URLs and database from the environment', () => {
    expect(e2eWebUrl()).toBe('https://app.boxops.dev');
    expect(e2eApiUrl()).toBe('https://boxops-api-e2e.fly.dev');
    expect(e2eDbName()).toBe('crossfit_box_e2e_abc1234');
  });

  it('accepts a per-run throwaway database', () => {
    expect(() => assertE2eDatabase('crossfit_box_e2e_abc1234')).not.toThrow();
  });

  it('still refuses staging, dev, and anything off-pattern', () => {
    expect(() => assertE2eDatabase('boxops_staging')).toThrow(/Refusing/);
    expect(() => assertE2eDatabase('crossfit_box_dev')).toThrow(/Refusing/);
    expect(() => assertE2eDatabase('neondb')).toThrow(/Refusing/);
    expect(() => assertE2eDatabase('postgres')).toThrow(/Refusing/);
    // Prefix-only is not enough: this is the shape a typo takes.
    expect(() => assertE2eDatabase('crossfit_box_e2e_')).toThrow(/Refusing/);
    expect(() => assertE2eDatabase('crossfit_box_e2e_abc1234_staging')).toThrow(
      /Refusing/,
    );
  });

  it('throws a named error when the environment is incomplete', () => {
    delete process.env.E2E_DB_NAME;
    expect(() => e2eDbName()).toThrow(/E2E_DB_NAME/);
  });
});

/**
 * `e2eDbConnection()` comes from Ruling P2: seed.ts and global-setup.ts both open
 * their own client, so the local/remote branch has to live in one place or be
 * duplicated. Tested here for the same reason as the guard — it decides which
 * database a truncate lands in.
 */
describe('e2eDbConnection', () => {
  it('returns the local container settings for the local target', () => {
    delete process.env.E2E_TARGET;
    process.env.E2E_DATABASE_URL = 'postgres://someone@somewhere/boxops_staging';

    expect(e2eDbConnection()).toEqual(
      expect.objectContaining({ database: E2E_DB_NAME }),
    );
  });

  it('returns the remote connection string for the remote target', () => {
    process.env.E2E_TARGET = 'remote';
    process.env.E2E_DATABASE_URL = 'postgres://u:p@direct.neon.tech/crossfit_box_e2e_abc1234';

    expect(e2eDbConnection()).toEqual({
      connectionString: 'postgres://u:p@direct.neon.tech/crossfit_box_e2e_abc1234',
    });
  });

  it('throws a named error naming the direct endpoint when the URL is absent', () => {
    process.env.E2E_TARGET = 'remote';
    delete process.env.E2E_DATABASE_URL;

    expect(() => e2eDbConnection()).toThrow(/E2E_DATABASE_URL/);
    expect(() => e2eDbConnection()).toThrow(/direct/i);
  });
});
