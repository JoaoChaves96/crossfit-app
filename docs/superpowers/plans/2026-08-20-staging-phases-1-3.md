# Staging Infrastructure Phases 1–3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the backend and frontend deployable to a real environment, replace the never-executed migration history with a single verified baseline, and gate both behind CI — all without a cloud account or any spend.

**Architecture:** The application gains the seams a hosted environment needs (a container image, a health route, `DATABASE_URL`/TLS config, a CORS allowlist, real app identity) without changing any behaviour. Schema management then moves from "TypeORM `synchronize` built everything and five unregistered migration files sat unused" to "one generated baseline migration, registered, exercised by the local e2e suite on every run, and guarded by a drift check". Finally GitHub Actions runs the fast gate and the 15-journey Playwright suite hermetically, using a Postgres service container so nothing in CI touches a provider.

**Tech Stack:** NestJS 11, TypeORM 0.3.28, Postgres 15, Node 24, Docker (multi-stage `node:24-alpine`), Expo/React Native Web, Playwright, Jest, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-20-staging-infrastructure-design.md`

**Out of scope for this plan:** Phases 4–6 of the spec (provisioning Fly/Neon/Cloudflare, the deploy pipeline, remote e2e retargeting, demo-data seeding). Nothing here requires an account, a domain, or money. The domain is nonetheless confirmed — `boxops.dev`, registered at Cloudflare Registrar — so Task 6 can set the permanent app identity now.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **Node 24.** The dev machine is v24.8.0; the image targets `node:24-alpine`. Pin the major in `backend/package.json` `engines`.
- **Domain is `boxops.dev`** at Cloudflare Registrar. Reverse-DNS bundle identifier: `dev.boxops.mobile`. Frontend origin will be `https://app.boxops.dev`, API `https://api.boxops.dev`.
- **Do not change `synchronize: process.env.NODE_ENV !== 'production'` in Phase 1.** `frontend/e2e/env.ts` `e2eBackendEnv()` sets `NODE_ENV=test` *specifically* so synchronize builds the e2e schema. Task 10 moves e2e onto migrations deliberately, as its own reviewable change.
- **`databaseConfig` must stay a module-level exported `const`.** `backend/test/helpers/e2e-database.ts` `resolveDatabaseConfig()` late-`require`s it and asserts on `.database`; that lateness is load-bearing (see the comment at `test/helpers/e2e-database.ts:60-72`). Add a pure builder function alongside it — never replace the const with a function.
- **`/api-docs` stays public.** `npm run generate:api-types` reads `/api-docs-json`, and `CLAUDE.md` mandates that workflow.
- **Swagger is the API contract.** Any new or changed endpoint updates its `@Api*` decorators and its DTOs' `@ApiProperty` decorators. `T | null` properties always need an explicit `type:`.
- **No step may weaken an e2e database guard.** `frontend/e2e/env.ts` `assertE2eDatabase()` and `backend/test/helpers/e2e-database.ts` `assertE2eDatabase()` exist because a predecessor suite truncated 15 tables in `crossfit_box_dev`. They may be extended, never loosened.
- **`workers: 1` in `playwright.config.ts` stays.** Measured: `--workers=4` took 13.7 min with 14 failures against 3.0 min serial. Not revisited in this plan.
- **Commit after each task.** Do not push and do not open a PR — the user gives that go-ahead separately.
- **Baseline to preserve:** backend unit tests green (spec records 508), frontend tests green (spec records 397), `tsc` clean on both, and the 15 Playwright journeys green.

---

## Correction to the spec, applied throughout Phase 2

The spec's *Problem* §3 states that the partial unique index from `AddOneActiveMembershipPlanIndex` is "**not declared on `AthleteMembershipPlanEntity`**", concluding the guard "is currently absent everywhere" and must be hand-carried into the baseline.

**That is not the case, and it was verified false before this plan was written.** Commit `1bc4d1d` (2026-08-12, "fix(api): enforce one active membership plan row per member") added both the migration *and* the decorator. The decorator is at `backend/src/domain/athlete-membership-plan/entities/athlete-membership-plan.entity.ts:15-18`:

```typescript
@Index('IDX_athlete_membership_plans_one_active', ['gymMembershipId'], {
  unique: true,
  where: "status = 'active'",
})
```

TypeORM supports `where` for Postgres partial indexes, so `synchronize` built it. Both live databases have it:

```
$ docker compose exec -T postgres psql -U postgres -d crossfit_box_dev -tAc \
    "SELECT indexdef FROM pg_indexes WHERE tablename='athlete_membership_plans';"
CREATE UNIQUE INDEX "IDX_athlete_membership_plans_one_active"
  ON public.athlete_membership_plans USING btree ("gymMembershipId")
  WHERE ((status)::text = 'active'::text)
```

The same index is present in `crossfit_box_e2e`. **The invariant is enforced.** No hand-carrying is required, and Phase 2 is correspondingly lower-risk than the spec assumed.

The spec's derived recommendation still holds as a *rule* — a construct not expressible as an entity decorator is invisible to `schema:log` and must be hand-written — but a partial index is not an example of it, because TypeORM can express one. Task 11 records the rule with a correct rationale rather than a false example. Task 9 keeps a verification step that proves the index survives into the baseline, so the risk the spec was worried about is checked rather than merely assumed away.

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `backend/src/api/health/health.controller.ts` | `GET /health` — liveness plus a database ping. The only unauthenticated non-auth route. |
| `backend/src/api/health/health.controller.spec.ts` | Unit tests for the above. |
| `backend/src/api/health/dto/health-response.dto.ts` | Swagger response shape. |
| `backend/src/config/database.config.spec.ts` | Unit tests for the config builder's env precedence. |
| `backend/src/data-source.ts` | TypeORM CLI `DataSource`. Reuses the entity list; never imported by the app. |
| `backend/src/migrations/<ts>-Baseline.ts` | The whole schema, generated, replacing the five existing files. |
| `backend/Dockerfile` | Multi-stage production image. |
| `backend/.dockerignore` | Keeps `node_modules`, `dist`, `.env` out of the build context. |
| `backend/.env.example` | The seven backend variables that matter. |
| `frontend/.env.example` | `EXPO_PUBLIC_API_BASE_URL`. |
| `.github/workflows/ci.yml` | Fast hermetic gate: types, unit tests, lint, schema drift. |
| `.github/workflows/e2e.yml` | Playwright journeys against a Postgres service container. |

**Modified**

| File | Change |
|---|---|
| `backend/src/config/database.config.ts` | Add `buildDatabaseConfig()`; support `DATABASE_URL`, `DATABASE_SSL`; register `migrations`. |
| `backend/src/main.ts` | CORS allowlist; Swagger server from env. |
| `backend/src/http/http.module.ts` | Register `HealthController`. |
| `backend/src/domain/invite/invite.service.ts` | Delete the `https://app.crossfitbox.com` fallback. |
| `backend/package.json` | `engines`, migration scripts, `schema:log`. |
| `frontend/app.json` | Real `name`/`slug`/`scheme`, `ios.bundleIdentifier`, `android.package`. |
| `frontend/playwright.config.ts` | Wait on `/health`; run migrations before the API boots. |
| `frontend/e2e/global-setup.ts` | Build the e2e schema from migrations instead of relying on synchronize. |
| `frontend/e2e/env.ts` | Add the migration-run environment for the e2e backend. |
| `docs/DECISIONS.md` | Record the schema-construct invariant. |

---

# Phase 1 — Make the app deployable

## Task 1: `GET /health`

There is no health route. `frontend/playwright.config.ts:80` waits on `/api-docs` as a readiness proxy, which its own comment at `:79` flags as a workaround. Fly needs a real check, and Task 10 will point Playwright at this route.

**Files:**
- Create: `backend/src/api/health/health.controller.ts`
- Create: `backend/src/api/health/dto/health-response.dto.ts`
- Test: `backend/src/api/health/health.controller.spec.ts`
- Modify: `backend/src/http/http.module.ts` (import + `controllers` array at `:66-81`)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `GET /health` → `200 {"status":"ok","database":"up"}`, or `503` when the database ping throws. Task 10 and Task 13 both depend on this path and this status code.

**Why it is unauthenticated:** there is no `APP_GUARD` in this codebase — `grep -rn "APP_GUARD" backend/src` returns nothing — so guards are applied per controller with `@UseGuards(...)` (see `backend/src/api/auth/auth.controller.ts`). A controller with no `@UseGuards` is therefore public by construction. Do not add a guard here.

- [ ] **Step 1: Write the failing test**

Create `backend/src/api/health/health.controller.spec.ts`:

```typescript
import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  function controllerWith(query: jest.Mock): HealthController {
    return new HealthController({ query } as unknown as DataSource);
  }

  it('reports ok when the database answers', async () => {
    const query = jest.fn().mockResolvedValue([{ '1': 1 }]);

    await expect(controllerWith(query).check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('throws 503 when the database ping fails', async () => {
    const query = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(controllerWith(query).check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('does not leak the driver error message to the caller', async () => {
    const query = jest
      .fn()
      .mockRejectedValue(new Error('password authentication failed for user "postgres"'));

    await expect(controllerWith(query).check()).rejects.toThrow(
      /database unavailable/i,
    );
    await expect(controllerWith(query).check()).rejects.not.toThrow(/password/);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd backend && npx jest src/api/health --no-coverage`
Expected: FAIL — `Cannot find module './health.controller'`.

- [ ] **Step 3: Write the response DTO**

Create `backend/src/api/health/dto/health-response.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({
    example: 'ok',
    description: 'Always "ok" when the response is 200.',
  })
  status: 'ok';

  @ApiProperty({
    example: 'up',
    description: 'Result of a SELECT 1 against the application database.',
  })
  database: 'up';
}
```

- [ ] **Step 4: Write the controller**

Create `backend/src/api/health/health.controller.ts`:

```typescript
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { HealthResponseDto } from './dto/health-response.dto';

/**
 * Liveness for the platform's health check, and readiness for the e2e suite.
 *
 * Deliberately unauthenticated: this codebase registers no APP_GUARD, so a
 * controller without @UseGuards is public. A health check behind auth cannot be
 * used by a load balancer, and this route reveals nothing — the database branch
 * reports up/down and never the driver's message, which can carry credentials.
 *
 * It pings rather than merely returning 200. A process that is listening but
 * cannot reach Postgres serves nothing useful, and the deploy pipeline must
 * treat that as a failed release, not a healthy one.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness and database reachability',
    description:
      'Returns 200 when the process is listening and a SELECT 1 succeeds. ' +
      'Returns 503 when the database is unreachable. Unauthenticated.',
  })
  @ApiResponse({
    status: 200,
    description: 'The process and its database are both healthy.',
    type: HealthResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'The process is listening but the database is unreachable.',
  })
  async check(): Promise<HealthResponseDto> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }

    return { status: 'ok', database: 'up' };
  }
}
```

- [ ] **Step 5: Register the controller**

In `backend/src/http/http.module.ts`, add the import alongside the other controller imports:

```typescript
import { HealthController } from '../api/health/health.controller';
```

and add `HealthController` to the `controllers` array (`:66-81`), after `InviteController`:

```typescript
    InviteController,
    HealthController,
  ],
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd backend && npx jest src/api/health --no-coverage`
Expected: PASS, 3 tests.

- [ ] **Step 7: Verify the route live and in Swagger**

Run, with the dev Postgres container up:

```bash
cd backend && npm run start &
sleep 25
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/health   # expect 200
curl -s http://localhost:3000/health                                    # expect {"status":"ok","database":"up"}
curl -s http://localhost:3000/api-docs-json | grep -c '"/health"'       # expect 1
kill %1
```

- [ ] **Step 8: Commit**

```bash
git add backend/src/api/health backend/src/http/http.module.ts
git commit -m "feat(backend): a process that cannot reach its database is not healthy"
```

---

## Task 2: `DATABASE_URL`, TLS, and a registered `migrations` array

Neon issues a single `DATABASE_URL` and requires TLS. Local Postgres has no certificate, so TLS cannot be inferred from `NODE_ENV` without breaking one of the two — hence an explicit `DATABASE_SSL` flag. The `migrations` array is registered now so Phase 2 has somewhere to register the baseline.

**Files:**
- Modify: `backend/src/config/database.config.ts`
- Test: `backend/src/config/database.config.spec.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `buildDatabaseConfig(env: NodeJS.ProcessEnv): TypeOrmModuleOptions` and the unchanged `export const databaseConfig`. Task 8 (`data-source.ts`) imports `entities` and `buildDatabaseConfig`.

**Critical constraint:** `databaseConfig` stays an exported `const` evaluated at import time. `backend/test/helpers/e2e-database.ts:73-79` late-`require`s this module precisely so that first evaluation happens *after* `pinE2eDatabase()` sets `DB_NAME`. Introducing a builder function is safe only because the const keeps calling it at module scope. If you turn the const into a getter or a function, the jest e2e guard breaks.

**Second constraint:** when `DATABASE_URL` is set, TypeORM takes `url` and `database` is absent. `assertE2eDatabase()` reads `.database`, so it would throw `"(unset)"`. That is a *correct* refusal — a jest e2e run must not use a `DATABASE_URL` — but the tests below pin the precedence so the behaviour is intentional rather than incidental.

- [ ] **Step 1: Write the failing test**

Create `backend/src/config/database.config.spec.ts`:

```typescript
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
    expect(build({}).migrations).toEqual([`${__dirname}/../migrations/*.{ts,js}`]);
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
```

The last test matters: a deploy must run migrations as an explicit release step, not as a side effect of a process starting. Two machines booting at once would otherwise race on the same DDL.

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd backend && npx jest src/config/database.config --no-coverage`
Expected: FAIL — `buildDatabaseConfig is not a function`.

- [ ] **Step 3: Implement the builder**

In `backend/src/config/database.config.ts`, keep every entity import and the entity list exactly as they are. Replace the exported object literal (`:20-48`) with:

```typescript
/** The entity list, exported so `data-source.ts` cannot drift from the app. */
export const entities = [
  ClassEntity,
  GymEntity,
  GymStaffEntity,
  SpaceEntity,
  ClassTypeEntity,
  MembershipPlanEntity,
  UserEntity,
  BookingEntity,
  ProgrammingEntity,
  AttendanceEntity,
  ResultEntity,
  GymMembershipEntity,
  AthleteMembershipPlanEntity,
  InviteEntity,
  NotificationEntity,
  PushTokenEntity,
  ClassSeriesEntity,
];

/**
 * Builds the TypeORM options from an environment.
 *
 * A pure function of `env` so the precedence rules are unit-testable; the
 * module-level `databaseConfig` below is still a plain const evaluated once at
 * import. That is load-bearing: `test/helpers/e2e-database.ts` late-`require`s
 * this module so its first evaluation happens after `DB_NAME` is pinned, and
 * asserts on the `.database` it finds. Do not turn the const into a function.
 *
 * `DATABASE_URL` wins over the discrete `DB_*` variables because that is what a
 * managed provider issues, and a half-applied connection — provider host with a
 * local database name — is worse than either.
 *
 * TLS is an explicit flag rather than `NODE_ENV`-derived: the provider requires
 * it and local Postgres has no certificate, so no single inference serves both.
 */
export function buildDatabaseConfig(
  env: NodeJS.ProcessEnv,
): TypeOrmModuleOptions {
  const connection = env.DATABASE_URL
    ? { url: env.DATABASE_URL }
    : {
        host: env.DB_HOST || 'localhost',
        port: parseInt(env.DB_PORT || '5432'),
        username: env.DB_USERNAME || 'postgres',
        password: env.DB_PASSWORD || 'postgres',
        database: env.DB_NAME || 'crossfit_box_dev',
      };

  return {
    type: 'postgres',
    ...connection,
    ...(env.DATABASE_SSL === 'true'
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
    entities,
    migrations: [`${__dirname}/../migrations/*.{ts,js}`],
    // Migrations are an explicit release step, never a boot side effect: two
    // machines starting together would race on the same DDL.
    migrationsRun: false,
    // Unchanged on purpose. `frontend/e2e/env.ts` e2eBackendEnv() sets
    // NODE_ENV=test specifically so this stays on and builds the e2e schema.
    synchronize: env.NODE_ENV !== 'production',
    logging: env.DATABASE_LOGGING === 'true',
  };
}

export const databaseConfig: TypeOrmModuleOptions = buildDatabaseConfig(
  process.env,
);
```

`rejectUnauthorized: false` is what Neon's pooled endpoint needs without shipping a CA bundle in the image; the connection is still encrypted.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx jest src/config/database.config --no-coverage`
Expected: PASS, 7 tests.

- [ ] **Step 5: Prove the e2e guard still works**

This is the regression that would be expensive to discover later.

Run: `cd backend && npm run test:e2e 2>&1 | tail -20`
Expected: the suite connects to `crossfit_box_api_e2e` and passes as before. No `Refusing to run against database` error.

- [ ] **Step 6: Full backend suite and types**

Run: `cd backend && npx tsc --noEmit && npm test`
Expected: `tsc` clean; all unit tests green.

- [ ] **Step 7: Commit**

```bash
git add backend/src/config/database.config.ts backend/src/config/database.config.spec.ts
git commit -m "feat(backend): a managed provider hands over a URL, not five variables"
```

---

## Task 3: CORS allowlist and Swagger server from env

`backend/src/main.ts:12-20` accepts every origin unconditionally behind a comment saying "dev only". Deployed, that is the whole point of CORS discarded. `:34` hardcodes `addServer('http://localhost:3000')`, so the Swagger UI on staging would aim its "Try it out" at the reader's own machine.

**Files:**
- Modify: `backend/src/main.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `CORS_ORIGINS` (comma-separated) and `PUBLIC_API_URL` env contract. Task 5 documents both; Phase 4 sets them.

- [ ] **Step 1: Replace the CORS block**

In `backend/src/main.ts`, replace `:10-20` with:

```typescript
  // An allowlist when CORS_ORIGINS is set, today's allow-all when it is not.
  //
  // The fallback keeps every local workflow working unchanged — the Expo dev
  // server, a LAN device, the e2e suite's own web origin — none of which share
  // a fixed origin. A deployed environment always sets the variable, so
  // allow-all never reaches one. Requests with no Origin header (curl, health
  // checks, server-to-server) are allowed either way; CORS is a browser
  // mechanism and rejecting them would only break the health check.
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow: boolean) => void,
    ) => {
      if (corsOrigins.length === 0 || !origin) return callback(null, true);
      return callback(null, corsOrigins.includes(origin));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
  });
```

- [ ] **Step 2: Make the Swagger server address configurable**

Replace `:34` (`.addServer('http://localhost:3000')`) with:

```typescript
    .addServer(process.env.PUBLIC_API_URL ?? `http://localhost:${port}`)
```

and, above the `DocumentBuilder`, hoist the port so both uses agree:

```typescript
  const port = process.env.PORT ?? 3000;
```

then change the listen call at `:41` to:

```typescript
  await app.listen(port);
```

Leave `SwaggerModule.setup('api-docs', app, document)` exactly as it is — `npm run generate:api-types` reads `/api-docs-json`, and gating it would break the type-generation workflow `CLAUDE.md` mandates.

- [ ] **Step 3: Verify the allowlist behaves both ways**

Run:

```bash
cd backend
# Fallback: no CORS_ORIGINS, any origin echoed back.
npm run start & sleep 25
curl -s -D - -o /dev/null -H 'Origin: http://evil.example' http://localhost:3000/health | grep -i access-control-allow-origin
kill %1

# Allowlist: only the listed origin is permitted.
CORS_ORIGINS=https://app.boxops.dev npm run start & sleep 25
curl -s -D - -o /dev/null -H 'Origin: https://app.boxops.dev' http://localhost:3000/health | grep -i access-control-allow-origin
curl -s -D - -o /dev/null -H 'Origin: http://evil.example'   http://localhost:3000/health | grep -ci access-control-allow-origin
kill %1
```

Expected: first two `grep`s print an `access-control-allow-origin` header; the last prints `0`.

- [ ] **Step 4: Verify the Swagger server address follows the env**

Run:

```bash
cd backend && PUBLIC_API_URL=https://api.boxops.dev npm run start & sleep 25
curl -s http://localhost:3000/api-docs-json | grep -o 'https://api.boxops.dev'
kill %1
```

Expected: prints `https://api.boxops.dev`.

- [ ] **Step 5: Run the e2e suite — the origin change is exactly what could break it**

Run: `cd frontend && npm run test:e2e 2>&1 | tail -15`
Expected: 15 journeys pass. `CORS_ORIGINS` is unset there, so the allow-all fallback applies.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main.ts
git commit -m "feat(backend): CORS that allows everything is not CORS"
```

---

## Task 4: Delete the invite link's fake default

`backend/src/domain/invite/invite.service.ts:85-86` falls back to `https://app.crossfitbox.com` — a domain nobody here owns. A missing `FRONTEND_URL` therefore mints invite links that look right and go nowhere, and no error is raised. It is also a CrossFit-trademark string, which the spec rules out of any hostname we control.

**Files:**
- Modify: `backend/src/domain/invite/invite.service.ts`
- Test: whichever spec covers `invite.service.ts` — find it with `ls backend/src/domain/invite/*.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `FRONTEND_URL` becomes a required-in-production variable, documented by Task 5.

- [ ] **Step 1: Write the failing test**

Add to `backend/src/domain/invite/invite.service.spec.ts`. It already has `GYM_ID`, `OWNER_ID` and `EMAIL` constants in scope and calls `service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach')` (see `:71`, `:102`), so reuse those — do not restructure the file or add a fixture.

```typescript
  describe('FRONTEND_URL', () => {
    const originalFrontendUrl = process.env.FRONTEND_URL;

    afterEach(() => {
      if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
      else process.env.FRONTEND_URL = originalFrontendUrl;
    });

    it('falls back to localhost, never to a domain we do not own', async () => {
      delete process.env.FRONTEND_URL;

      const result = await service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach');

      expect(result.inviteLink).toMatch(/^http:\/\/localhost:8081\/invite\//);
      expect(result.inviteLink).not.toContain('crossfitbox.com');
    });

    it('uses FRONTEND_URL when it is set', async () => {
      process.env.FRONTEND_URL = 'https://app.boxops.dev';

      const result = await service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach');

      expect(result.inviteLink).toMatch(/^https:\/\/app\.boxops\.dev\/invite\//);
    });
  });
```

Place this `describe` inside the same outer `describe` that owns the `service` and its mocks, so the existing `beforeEach` wiring applies. If that `beforeEach` does not already make the `'coach'` path succeed (`:82` and `:92` show cases where it throws), use the arguments from the passing case at `:102` and copy its mock setup.

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd backend && npx jest src/domain/invite --no-coverage`
Expected: FAIL — the link contains `app.crossfitbox.com`.

- [ ] **Step 3: Replace the default**

At `invite.service.ts:85-86`:

```typescript
    // localhost, not a plausible-looking domain. The previous default was
    // `https://app.crossfitbox.com`, which nobody here owns: a missing
    // FRONTEND_URL minted invite links that looked correct and went nowhere,
    // silently. A localhost link is obviously wrong to whoever sees it, and
    // every deployed environment sets the variable.
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx jest src/domain/invite --no-coverage`
Expected: PASS.

- [ ] **Step 5: Confirm the trademark string is gone from source**

Run: `grep -rn "crossfitbox" backend/src frontend --include='*.ts' --include='*.tsx' --include='*.json'`
Expected: no matches outside test assertions that deliberately check for its absence.

- [ ] **Step 6: Commit**

```bash
git add backend/src/domain/invite
git commit -m "fix(invite): a link to a domain we do not own is worse than no link"
```

---

## Task 5: `.env.example` for both apps, and an `engines` pin

Neither app has an example env file, and `backend/package.json` has no `engines`, so nothing records which Node major the tests pass under.

**Files:**
- Create: `backend/.env.example`
- Create: `frontend/.env.example`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: the variable names introduced by Tasks 2, 3 and 4.
- Produces: the documented env contract Phase 4 configures.

- [ ] **Step 1: Write `backend/.env.example`**

```bash
# Copy to .env for local development. Every value here is a local default;
# a deployed environment sets all of them explicitly.

# --- Database -------------------------------------------------------------
# Preferred: one connection string, which is what a managed provider issues.
# When DATABASE_URL is set the discrete DB_* variables below are ignored.
# DATABASE_URL=postgres://user:password@host/database

# Local development uses the discrete variables against docker-compose.
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=crossfit_box_dev

# TLS. Required by the managed provider; impossible locally (no certificate),
# which is why this is an explicit flag rather than inferred from NODE_ENV.
DATABASE_SSL=false

# Logs every statement. Noisy — on for debugging a query, off otherwise.
DATABASE_LOGGING=false

# --- HTTP -----------------------------------------------------------------
PORT=3000

# Absolute origin of the frontend. Used to build invite links, so a wrong
# value produces links that resolve to the wrong place.
FRONTEND_URL=http://localhost:8081

# Comma-separated CORS allowlist. UNSET means allow all origins, which is
# what local development needs (Expo dev server, LAN device, e2e web origin).
# Always set it in a deployed environment.
# CORS_ORIGINS=https://app.boxops.dev

# The API's own public origin, advertised in the Swagger document so the
# "Try it out" button targets the right host. Defaults to localhost:$PORT.
# PUBLIC_API_URL=https://api.boxops.dev

# --- Auth -----------------------------------------------------------------
# Signs JWTs. Any deployed environment needs a long random value of its own.
JWT_SECRET=dev-secret-do-not-use-anywhere-real

# --- Scheduling -----------------------------------------------------------
# 'true' omits ScheduleModule, so the three @Cron services never tick. The
# e2e suites set this: the class-lifecycle cron rewrites fixtures underneath
# a running test. Any other value, schedulers run.
DISABLE_SCHEDULERS=false
```

- [ ] **Step 2: Write `frontend/.env.example`**

```bash
# Copy to .env.local for local development.
#
# EXPO_PUBLIC_* variables are INLINED INTO THE BUNDLE at build time, not read
# at runtime. A web build therefore bakes in whichever value was present when
# `expo export` ran, and pointing an existing build at a different API means
# rebuilding it.
#
# Use a LAN address (not localhost) when testing on a physical device.
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

- [ ] **Step 3: Pin the Node major**

In `backend/package.json`, add after `"license": "UNLICENSED",`:

```json
  "engines": {
    "node": ">=24 <25"
  },
```

- [ ] **Step 4: Verify `.env` is ignored but `.env.example` is not**

Run: `git check-ignore -v backend/.env && git status --short backend/.env.example frontend/.env.example`
Expected: `backend/.env` reported as ignored; both example files show as untracked (`??`).

If `.env.example` is swallowed by a broad `.env*` ignore rule, add a negation to the relevant `.gitignore`:

```gitignore
!.env.example
```

- [ ] **Step 5: Commit**

```bash
git add backend/.env.example frontend/.env.example backend/package.json .gitignore
git commit -m "docs(config): eight variables decide whether this app runs"
```

---

## Task 6: Real app identity in `app.json`

`frontend/app.json` still has `"name": "frontend"`, `"slug": "frontend"`, `"scheme": "frontend"`, and no `ios.bundleIdentifier` or `android.package`. Five lines now; effectively irreversible once a store listing exists, because bundle identifiers are permanent.

Native builds are out of scope, and the spec's standing constraint holds: **do not publish to the App Store or Play Store before a brand domain exists.** Setting the identifier is not publishing.

**Files:**
- Modify: `frontend/app.json`

**Interfaces:**
- Consumes: the confirmed domain `boxops.dev`.
- Produces: `scheme: "boxops"` — the deep-link scheme any later native work builds on.

- [ ] **Step 1: Set the identity fields**

In `frontend/app.json`, change the three `"frontend"` values:

```json
    "name": "BoxOps",
    "slug": "boxops",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "boxops",
```

Add `bundleIdentifier` to the existing `ios` block:

```json
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "dev.boxops.mobile"
    },
```

Add `package` to the existing `android` block, alongside `adaptiveIcon`:

```json
      "package": "dev.boxops.mobile",
```

Leave `web`, `plugins` and `experiments` untouched.

- [ ] **Step 2: Verify Expo still resolves the config**

Run: `cd frontend && npx expo config --type public | grep -E '"(name|slug|scheme)"|bundleIdentifier|"package"'`
Expected: `BoxOps`, `boxops`, `boxops`, `dev.boxops.mobile` twice.

- [ ] **Step 3: Verify nothing referenced the old slug**

Run: `grep -rn '"frontend"' frontend/app.json frontend/package.json; grep -rn "scheme: 'frontend'\|scheme=\"frontend\"" frontend --include='*.ts' --include='*.tsx'`
Expected: no matches. (`frontend/package.json`'s `"name": "frontend"` is the npm package name and may stay.)

- [ ] **Step 4: Run the frontend suite and types**

Run: `cd frontend && npx tsc --noEmit && npm test`
Expected: `tsc` clean; all tests green.

- [ ] **Step 5: Commit**

```bash
git add frontend/app.json
git commit -m "feat(frontend): a bundle identifier is permanent, so pick it before the store does"
```

---

## Task 7: The production image

A Dockerfile rather than a buildpack, because a container that runs on Fly runs unchanged on ECS, App Runner or Cloud Run — the portability rule that makes the platform choice cheap to reverse. Last in Phase 1 so it captures everything above.

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

**Interfaces:**
- Consumes: `GET /health` (Task 1), the env contract (Task 5), `engines` (Task 5).
- Produces: an image whose default command is `node dist/main.js`, and which has `devDependencies` available for the migration CLI. Phase 4's `release_command` depends on both.

**Note on `bcrypt`:** it is a native module, so the builder stage needs `python3 make g++`. If the alpine build proves fragile, switch both stages to `node:24-slim` and drop the `apk` lines — that is an acceptable deviation, but change *both* stages together so the glibc/musl target matches.

- [ ] **Step 1: Write `.dockerignore` first**

Create `backend/.dockerignore`. Do this before the Dockerfile: without it the build context includes `node_modules` and `.env`, which is both slow and a way to bake secrets into an image.

```
node_modules
dist
coverage
.env
.env.*
!.env.example
*.log
.git
test
**/*.spec.ts
```

- [ ] **Step 2: Write the Dockerfile**

Create `backend/Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1

# node:24 to match the machine the tests pass on (v24.8.0). An image on a
# different major is a variable nobody wants to debug from a deploy log.
FROM node:24-alpine AS builder

WORKDIR /app

# bcrypt compiles from source; alpine ships no toolchain.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------------------------------------------------------------------------

FROM node:24-alpine AS runtime

WORKDIR /app

# dumb-init as PID 1: Node does not reap children or forward SIGTERM by
# default, so without it a platform's graceful-shutdown signal is ignored and
# the container is killed mid-request.
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

# devDependencies are kept deliberately. The TypeORM CLI, ts-node and
# typescript are what run migrations as the release step, and a release
# command that cannot migrate makes the image useless for deployment.
COPY package*.json ./
RUN apk add --no-cache --virtual .build python3 make g++ \
 && npm ci \
 && npm cache clean --force \
 && apk del .build

COPY --from=builder /app/dist ./dist
# The migrations are needed as source: the CLI runs them through ts-node.
COPY --from=builder /app/src/migrations ./src/migrations
COPY --from=builder /app/src/data-source.ts ./src/data-source.ts
COPY tsconfig.json ./

# Never root. `node` already exists in the base image.
USER node

EXPOSE 3000

# `dist/main.js`, not `dist/main`. The extension is explicit because the
# shorthand has failed to resolve in this repo's own tooling before.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

**Ordering note:** `src/data-source.ts` and `src/migrations/` do not exist until Phase 2 (Tasks 8 and 9). Until then those two `COPY` lines will fail the build. Comment them out for this task with a `# Phase 2:` marker, and Task 9 Step 8 uncomments them.

- [ ] **Step 3: Build the image**

Run: `cd backend && docker build -t crossfit-api:local .`
Expected: build succeeds. If `bcrypt` fails to compile, apply the `node:24-slim` fallback from the note above and rebuild.

- [ ] **Step 4: Run the container against local Postgres and hit `/health`**

The container cannot reach `localhost` Postgres from inside its own network namespace; `host.docker.internal` is the bridge on macOS.

```bash
docker run --rm -d --name crossfit-api-test -p 3010:3000 \
  -e DATABASE_URL='postgres://postgres:postgres@host.docker.internal:5432/crossfit_box_dev' \
  -e JWT_SECRET=local-test-secret \
  -e FRONTEND_URL=http://localhost:8081 \
  -e DISABLE_SCHEDULERS=true \
  crossfit-api:local

sleep 15
curl -s -o /dev/null -w 'health: %{http_code}\n' http://localhost:3010/health   # expect 200
curl -s http://localhost:3010/health                                            # expect {"status":"ok","database":"up"}
docker logs crossfit-api-test 2>&1 | tail -20
docker rm -f crossfit-api-test
```

Expected: `health: 200`. `NODE_ENV=production` is set in the image, so `synchronize` is off and the app connects to the existing dev schema without altering it.

- [ ] **Step 5: Prove the 503 branch, which is the reason the route pings**

```bash
docker run --rm -d --name crossfit-api-baddb -p 3011:3000 \
  -e DATABASE_URL='postgres://postgres:postgres@host.docker.internal:5432/no_such_database' \
  -e JWT_SECRET=local-test-secret \
  crossfit-api:local
sleep 15
curl -s -o /dev/null -w 'health: %{http_code}\n' http://localhost:3011/health   # expect 503
docker rm -f crossfit-api-baddb
```

If the process instead exits on boot because TypeORM cannot connect, record that in the commit message: the platform's failed-health-check path is then "container never becomes healthy", which is an acceptable outcome and still blocks a bad release. Do not add retry logic to make the 503 appear.

- [ ] **Step 6: Confirm the image is not running as root and has no secrets**

```bash
docker run --rm crossfit-api:local sh -c 'id -u; ls -a /app | grep -c "^\.env$" || true'
```
Expected: a non-zero uid, and `0` `.env` files.

- [ ] **Step 7: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "feat(backend): an image that runs on Fly runs on ECS unchanged"
```

---

# Phase 2 — The schema baseline

The highest-risk phase: a wrong baseline is a silently broken environment rather than an error. Read the *Correction to the spec* section above before starting — the hand-carrying the spec anticipated is not required, and the audit in Task 9 confirms that rather than assuming it.

## Task 8: A `DataSource` for the CLI, and the migration scripts

`databaseConfig` is a `TypeOrmModuleOptions` for Nest; the TypeORM CLI needs a `DataSource` instance from a file it can import. There is currently no production `DataSource` anywhere — only `backend/test/helpers/e2e-database.ts` — no `migrations` key was registered before Task 2, and `package.json` has no migration script. That is the whole reason the five existing migrations have never run.

**Files:**
- Create: `backend/src/data-source.ts`
- Modify: `backend/package.json` (scripts)

**Interfaces:**
- Consumes: `buildDatabaseConfig` from Task 2. (`entities` is exported there too, but `data-source.ts` deliberately goes through the builder rather than assembling its own options — a CLI with its own entity list is how a "generated" baseline ends up missing a table.)
- Produces: `npm run migration:generate -- src/migrations/<Name>`, `migration:run`, `migration:revert`, `migration:show`, `schema:log`. Tasks 9, 10, 11, 12 and 13 all call these.

- [ ] **Step 1: Write the DataSource**

Create `backend/src/data-source.ts`:

```typescript
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
 */
export const AppDataSource = new DataSource({
  ...buildDatabaseConfig(process.env),
  synchronize: false,
} as DataSourceOptions);

export default AppDataSource;
```

- [ ] **Step 2: Add the scripts**

In `backend/package.json`, add to `scripts`:

```json
    "typeorm": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js -d src/data-source.ts",
    "migration:generate": "npm run typeorm -- migration:generate",
    "migration:run": "npm run typeorm -- migration:run",
    "migration:revert": "npm run typeorm -- migration:revert",
    "migration:show": "npm run typeorm -- migration:show",
    "schema:log": "npm run typeorm -- schema:log",
```

- [ ] **Step 3: Verify the CLI can see the five existing migrations**

Run: `cd backend && npm run migration:show`
Expected: the five existing migrations listed, all marked `[ ]` (not run) — the CLI's own confirmation of the spec's central finding that nothing has ever executed them.

- [ ] **Step 4: Verify `schema:log` runs at all**

Run: `cd backend && npm run schema:log`
Expected: it connects to `crossfit_box_dev` and prints its assessment. Output content does not matter yet — this step only proves the CLI is wired.

- [ ] **Step 5: Commit**

```bash
git add backend/src/data-source.ts backend/package.json
git commit -m "feat(backend): five migrations nothing could ever have run"
```

---

## Task 9: Audit the five, generate one baseline, delete them

The five files in `backend/src/migrations/` are incremental patches layered on a `synchronize`-built schema. The oldest opens with `ALTER TABLE "classes"` — a table no migration creates. They have never run anywhere. Git holds their history, so squashing loses nothing.

**The audit is already done and is reproduced below.** Each construct was checked against its entity declaration and against the live `crossfit_box_dev` and `crossfit_box_e2e` databases. Re-verify it — do not take it on faith — but it is a check, not an investigation.

| Migration | Construct | Entity-declared? | Baseline covers it? |
|---|---|---|---|
| `AddDurationToClasses` | `classes.duration` | Yes — `class.entity.ts:51` | Yes |
| `CreateNotificationTables` | `notifications`, `push_tokens` tables; 3 + 2 indexes; `users.notificationPreferences` | Yes — both entities registered in `databaseConfig`; indexes at `notification.entity.ts:10-12` and `push-token.entity.ts:10-11`; column at `user.entity.ts:42` | Yes |
| `AddMembershipAutoRoll` | `athlete_membership_plans.autoRoll`, `.autoRollCount` | Yes — `athlete-membership-plan.entity.ts:43,46` | Yes |
| `AddOneActiveMembershipPlanIndex` | partial unique index `IDX_athlete_membership_plans_one_active` | **Yes** — `athlete-membership-plan.entity.ts:15-18`, with `where: "status = 'active'"`. The spec says otherwise; the spec is wrong. | Yes — verify explicitly at Step 4 |
| `AddRoleToInvites` | `invites.role` | Yes — `invite.entity.ts:60` | Yes |

**One accepted divergence.** The migration creates `IDX_notifications_userId_createdAt` with `"createdAt" DESC`; the entity declares a plain `@Index(['userId', 'createdAt'])`, and the live databases have it ascending. The baseline will match the live databases. A Postgres btree scans backwards at equal cost, so the ordering is cosmetic. Record it in the commit message; do not hand-write SQL to reintroduce `DESC`.

Also note the drop of `REL_160876fc498111a4b78a6e08bc` in `AddOneActiveMembershipPlanIndex.up()` is not carried across, correctly: it is a defensive `DROP CONSTRAINT IF EXISTS` for a constraint that a freshly created database never has.

**Files:**
- Create: `backend/src/migrations/<timestamp>-Baseline.ts` (generated)
- Delete: all five existing files in `backend/src/migrations/`
- Modify: `backend/Dockerfile` (uncomment the Phase 2 `COPY` lines)

**Interfaces:**
- Consumes: `AppDataSource` and the scripts from Task 8.
- Produces: exactly one migration whose `up()` creates the full schema. Tasks 10, 11 and 13 run it.

- [ ] **Step 1: Re-verify the audit against the entities**

Run:

```bash
cd backend
grep -n "duration" src/domain/class/entities/class.entity.ts
grep -n "@Index\|autoRoll" src/domain/athlete-membership-plan/entities/athlete-membership-plan.entity.ts
grep -n "role" src/domain/invite/entities/invite.entity.ts
grep -n "@Index" src/domain/notification/entities/notification.entity.ts src/domain/notification/entities/push-token.entity.ts
grep -n "notificationPreferences" src/domain/user/entities/user.entity.ts
```

Expected: every construct in the table above is present. **If any is missing, stop and report it** — that construct must be hand-carried and the plan needs amending.

- [ ] **Step 2: Generate the baseline against a genuinely empty database**

A throwaway database, so the generated SQL is the full schema rather than a diff against an existing one. `crossfit_box_baseline_gen` is not a name any guard protects, and it is dropped at the end.

```bash
cd /Users/joao.chaves/Documents/crossfit-app
docker compose exec -T postgres psql -U postgres -c 'DROP DATABASE IF EXISTS crossfit_box_baseline_gen'
docker compose exec -T postgres psql -U postgres -c 'CREATE DATABASE crossfit_box_baseline_gen'

cd backend
DB_NAME=crossfit_box_baseline_gen npm run migration:generate -- src/migrations/Baseline
```

Expected: a new `src/migrations/<timestamp>-Baseline.ts` containing `CREATE TABLE` for all 17 entities.

- [ ] **Step 3: Read the generated SQL**

Open the generated file and read it. This is not ceremony — generation is exactly where a construct silently goes missing.

Confirm: 17 `CREATE TABLE` statements, the foreign keys, and a `down()` that drops what `up()` creates.

Run: `grep -c "CREATE TABLE" src/migrations/*-Baseline.ts`
Expected: 17.

- [ ] **Step 4: Confirm the partial unique index survived generation**

The single most important check in this phase.

Run: `grep -n "one_active" -A 2 src/migrations/*-Baseline.ts`
Expected: a `CREATE UNIQUE INDEX "IDX_athlete_membership_plans_one_active" ... WHERE status = 'active'`.

**If the `WHERE` clause is absent, stop.** The index would be a plain unique constraint on `gymMembershipId`, which forbids the append-only plan history and would break member reassignment on any database built from this baseline. In that case hand-write the index into the migration exactly as `1786492800000-AddOneActiveMembershipPlanIndex.ts` has it, before deleting that file.

- [ ] **Step 5: Delete the five superseded migrations**

```bash
cd backend
git rm src/migrations/1746403200000-AddDurationToClasses.ts \
       src/migrations/1748044800000-CreateNotificationTables.ts \
       src/migrations/1754870400000-AddMembershipAutoRoll.ts \
       src/migrations/1786492800000-AddOneActiveMembershipPlanIndex.ts \
       src/migrations/1786579200000-AddRoleToInvites.ts
ls src/migrations/
```

Expected: one file remains.

- [ ] **Step 6: Prove the baseline builds a working schema from empty**

```bash
cd /Users/joao.chaves/Documents/crossfit-app
docker compose exec -T postgres psql -U postgres -c 'DROP DATABASE IF EXISTS crossfit_box_baseline_gen'
docker compose exec -T postgres psql -U postgres -c 'CREATE DATABASE crossfit_box_baseline_gen'

cd backend
DB_NAME=crossfit_box_baseline_gen npm run migration:run
```

Expected: the baseline applies with no error.

- [ ] **Step 7: `schema:log` prints no pending changes — the objective check**

This is what proves the baseline and the entities agree.

```bash
cd backend && DB_NAME=crossfit_box_baseline_gen npm run schema:log
```
Expected: `Your schema is up to date - there are no queries to be executed by schema synchronization.`

Any queries listed are drift. Fix the cause before continuing; do not proceed with a non-empty result.

- [ ] **Step 8: Diff the migration-built schema against the synchronize-built one**

The strongest structural check available, and it catches what `schema:log` cannot — a construct present in neither the entities nor the baseline.

```bash
cd /Users/joao.chaves/Documents/crossfit-app
for db in crossfit_box_dev crossfit_box_baseline_gen; do
  docker compose exec -T postgres psql -U postgres -d $db -tAc \
    "SELECT tablename||' | '||indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY 1" \
    > "/tmp/idx-$db.txt"
done
diff /tmp/idx-crossfit_box_dev.txt /tmp/idx-crossfit_box_baseline_gen.txt
```

Expected: differences only in TypeORM's generated hash-suffixed index names (`IDX_<hash>`), which differ between databases and carry no meaning. Every *named* index — notably `IDX_athlete_membership_plans_one_active`, with its `WHERE` clause — must appear on both sides. Investigate anything else.

- [ ] **Step 9: Restore the Dockerfile's Phase 2 lines**

In `backend/Dockerfile`, uncomment the two `COPY` lines marked `# Phase 2:` (`src/migrations` and `src/data-source.ts`), then:

Run: `cd backend && docker build -t crossfit-api:local . && docker run --rm crossfit-api:local ls src/migrations`
Expected: build succeeds and the baseline file is listed inside the image.

- [ ] **Step 10: Drop the scratch database and run the full backend suite**

```bash
cd /Users/joao.chaves/Documents/crossfit-app
docker compose exec -T postgres psql -U postgres -c 'DROP DATABASE IF EXISTS crossfit_box_baseline_gen'
cd backend && npx tsc --noEmit && npm test && npm run test:e2e 2>&1 | tail -20
```
Expected: all green. Nothing in this task touched application code.

- [ ] **Step 11: Commit**

```bash
git add backend/src/migrations backend/Dockerfile
git commit -m "feat(backend): one baseline, because five patches on a schema nobody built is not a history

The notifications userId/createdAt index loses its DESC ordering: the entity
declares a plain composite index and both live databases already have it
ascending. A btree scans backwards at equal cost, so this is cosmetic.

The partial unique index enforcing one active plan per membership IS
entity-declared and does survive generation, verified against the generated
SQL and against both live databases. The design spec claimed otherwise."
```

---

## Task 10: Move the local e2e suite onto migrations

`frontend/e2e/global-setup.ts:6-10` documents that the schema arrives via `synchronize` during `webServer` boot, and `e2eBackendEnv()` sets `NODE_ENV=test` to keep that true. That means the migration path is exercised by nothing. After this task every local e2e run proves the baseline still builds a schema the 15 journeys pass against — which is the strongest available evidence and reuses work already done.

**Files:**
- Modify: `frontend/e2e/env.ts`
- Modify: `frontend/e2e/global-setup.ts`
- Modify: `frontend/playwright.config.ts`

**Interfaces:**
- Consumes: `npm run migration:run` (Task 8), the baseline (Task 9), `GET /health` (Task 1).
- Produces: an e2e database built by migrations. Task 13 reuses the same commands in CI.

**Do not loosen `assertE2eDatabase()`.** It exists because a predecessor suite truncated 15 tables in `crossfit_box_dev`. The migration step below is guarded by it too.

**Ordering problem to solve:** Playwright starts `webServer` *before* `globalSetup`. Today that ordering is what lets synchronize build the schema before the truncate. Migrations must instead run before the API boots — so they go in `globalSetup`, and the truncate that follows becomes conditional on tables existing rather than an assertion that they do.

- [ ] **Step 1: Add the migration environment to `env.ts`**

Append to `frontend/e2e/env.ts`:

```typescript
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
```

- [ ] **Step 2: Run migrations in `globalSetup`, before the API needs the schema**

In `frontend/e2e/global-setup.ts`, add the imports:

```typescript
import { execFileSync } from 'child_process';
import path from 'path';
import { E2E_DB_NAME, assertE2eDatabase, e2eDbConfig, e2eMigrationEnv } from './env';
```

Replace the header comment's ordering note (`:6-10`) with:

```typescript
 * Ordering note: Playwright starts `webServer` (a config plugin) before
 * globalSetup, so the API is already up by the time this runs. The schema
 * therefore CANNOT be built by the API's boot any more — `e2eBackendEnv()` no
 * longer relies on synchronize — so this file runs the migrations itself,
 * against an empty database, before truncating.
 *
 * Running migrations here rather than in a webServer command is what makes the
 * baseline load-bearing: every local run now proves the migration path builds a
 * schema the 15 journeys pass against.
```

Then, immediately after the `assertE2eDatabase(rows[0].db)` call (`:39`), insert the migration step:

```typescript
    // Build the schema from migrations. Idempotent: TypeORM skips migrations
    // already recorded in its own table, so a repeat run is a no-op.
    assertE2eDatabase(e2eMigrationEnv().DB_NAME);
    execFileSync('npm', ['run', 'migration:run'], {
      cwd: path.resolve(__dirname, '../../backend'),
      env: { ...process.env, ...e2eMigrationEnv() },
      stdio: 'inherit',
    });
```

Finally, replace the empty-tables error (`:48-53`) — an empty database is now a normal state on a first run, because migrations have just created the tables:

```typescript
    const tables = await client.query<{ name: string }>(
      `SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'`,
    );

    if (tables.rowCount === 0) {
      throw new Error(
        `[e2e] "${E2E_DB_NAME}" has no tables after migration:run. The baseline ` +
          `migration should have created them — check the migration output above.`,
      );
    }
```

Note the re-query: `tables` must be read *after* the migrations run, so make sure the existing query at `:44-46` sits below the `execFileSync` block rather than above it.

- [ ] **Step 3: Stop the backend from building the schema itself**

In `frontend/e2e/env.ts`, replace the `NODE_ENV: 'test'` entry in `e2eBackendEnv()` (`:92-102`) — keeping the historical note about the removed `x-user-id` backdoor, which is still worth having:

```typescript
    // `production`, so synchronize is OFF: the schema is built by
    // `migration:run` in global-setup.ts and by nothing else. While this was
    // `test`, synchronize built the e2e schema on boot and the migration path
    // was exercised by nothing — a baseline no test could contradict.
    //
    // This was once also load-bearing against `development`, because
    // JwtAuthGuard accepted a request with NO Authorization header and took
    // identity from `x-user-id` headers — a backdoor that would have masked
    // exactly the auth/token races this suite exists to catch. That branch was
    // removed on 2026-08-14, so every environment now behaves like this one.
    NODE_ENV: 'production',
```

`JWT_SECRET` comes from `backend/.env` via `dotenv/config` and is unaffected.

- [ ] **Step 4: Point the readiness wait at the real health route**

In `frontend/playwright.config.ts`, replace `:79-80`:

```typescript
      // A real health route now exists, and it pings the database — so this
      // waits for a stack that can actually serve, not merely one that is
      // listening. Swagger UI was a proxy for readiness, which its comment
      // admitted.
      url: `${E2E_API_URL}/health`,
```

Also update the comment at `:82-83`, which no longer describes what happens:

```typescript
      // Nest compiles before listening. The schema is already in place:
      // global-setup.ts runs the migrations.
```

- [ ] **Step 5: Run the suite from a genuinely empty database — the real test**

```bash
cd /Users/joao.chaves/Documents/crossfit-app
docker compose exec -T postgres psql -U postgres -c 'DROP DATABASE IF EXISTS crossfit_box_e2e'
docker compose exec -T postgres psql -U postgres -c 'CREATE DATABASE crossfit_box_e2e'
cd frontend && npm run test:e2e 2>&1 | tail -30
```

Expected: `migration:run` output appears in the setup log, then 15 journeys pass in roughly 3 minutes. **This is the proof that the baseline is behaviourally equivalent to the schema every test has run against so far.**

- [ ] **Step 6: Run it a second time to confirm idempotency**

Run: `cd frontend && npm run test:e2e 2>&1 | tail -15`
Expected: 15 pass again. `migration:run` reports no pending migrations rather than failing.

- [ ] **Step 7: Confirm the dev database was never touched**

```bash
docker compose exec -T postgres psql -U postgres -d crossfit_box_dev -tAc \
  "SELECT count(*) FROM users WHERE email LIKE '%@test.local'"
```
Expected: the same count as before the run. Note it before Step 5 so there is something to compare against.

- [ ] **Step 8: Commit**

```bash
git add frontend/e2e/env.ts frontend/e2e/global-setup.ts frontend/playwright.config.ts
git commit -m "feat(e2e): a baseline no test can contradict is not verified

The e2e schema was built by synchronize, so the migration path was exercised
by nothing. It is now built by migration:run, proved from an empty database:
15 journeys green means the baseline matches the schema they have always run
against."
```

---

## Task 11: The drift gate and the recorded invariant

`schema:log` is only useful if something runs it. Without a gate, the next entity change lands without a migration and the baseline starts rotting the same way the five patches did.

**Files:**
- Create: `backend/scripts/check-schema-drift.sh`
- Modify: `backend/package.json` (one script)
- Modify: `docs/DECISIONS.md`

**Interfaces:**
- Consumes: `migration:run`, `schema:log` (Task 8), the baseline (Task 9).
- Produces: `npm run schema:check`, exiting non-zero on drift. Task 12 calls it.

- [ ] **Step 1: Write the drift check**

Create `backend/scripts/check-schema-drift.sh`:

```bash
#!/usr/bin/env bash
#
# Fails when the entities and the migrations disagree.
#
# Builds a throwaway database from migrations alone, then asks TypeORM what
# synchronize WOULD do to it. Anything at all means an entity changed without a
# migration, and a deployed environment would be missing that change.
#
# A throwaway database rather than dev or e2e: dev is synchronize-built, so it
# already matches the entities and would report clean no matter how stale the
# migrations were. That would be a gate that always passes.
#
# Requires DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD for a server where the role
# can CREATE DATABASE. Never touches an existing database.
set -euo pipefail

DRIFT_DB="${DRIFT_DB:-crossfit_box_drift_check}"
export PGHOST="${DB_HOST:-localhost}"
export PGPORT="${DB_PORT:-5432}"
export PGUSER="${DB_USERNAME:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-postgres}"

cleanup() {
  psql -d postgres -c "DROP DATABASE IF EXISTS \"$DRIFT_DB\"" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup
psql -d postgres -c "CREATE DATABASE \"$DRIFT_DB\"" >/dev/null

DB_NAME="$DRIFT_DB" NODE_ENV=production npm run migration:run >/dev/null

OUTPUT="$(DB_NAME="$DRIFT_DB" NODE_ENV=production npm run schema:log 2>&1)"

if echo "$OUTPUT" | grep -q "there are no queries to be executed"; then
  echo "✓ Schema is in sync: migrations build exactly what the entities describe."
  exit 0
fi

echo "✗ Schema drift detected. An entity changed without a migration."
echo
echo "$OUTPUT"
echo
echo "Fix: cd backend && npm run migration:generate -- src/migrations/<DescriptiveName>"
echo "Then READ the generated SQL before committing it — generation is where a"
echo "construct silently goes missing."
exit 1
```

- [ ] **Step 2: Make it executable and add the script**

```bash
chmod +x backend/scripts/check-schema-drift.sh
```

In `backend/package.json` `scripts`:

```json
    "schema:check": "bash scripts/check-schema-drift.sh",
```

- [ ] **Step 3: Verify it passes on the current tree**

Run: `cd backend && npm run schema:check`
Expected: `✓ Schema is in sync`, exit 0.

- [ ] **Step 4: Verify it actually catches drift — a gate never proved to fail is not a gate**

Temporarily add a column to any entity, run the check, then revert:

```bash
cd backend
# Add a throwaway column to UserEntity.
python3 - <<'PY'
import re, pathlib
p = pathlib.Path('src/domain/user/entities/user.entity.ts')
s = p.read_text()
marker = '  @Column('
i = s.index(marker)
s = s[:i] + "  @Column({ type: 'varchar', nullable: true })\n  driftCanary: string | null;\n\n" + s[i:]
p.write_text(s)
PY

npm run schema:check; echo "exit: $?"   # expect ✗ and exit 1
git checkout src/domain/user/entities/user.entity.ts
npm run schema:check; echo "exit: $?"   # expect ✓ and exit 0
```

Expected: exit 1 with the drift report, then exit 0 after reverting. Confirm `git status --short` is clean for that entity afterwards.

- [ ] **Step 5: Record the invariant in `docs/DECISIONS.md`**

Append, matching the file's existing entry format:

```markdown
## Schema changes travel with a migration

**Decision:** Every change to an entity ships in the same pull request as a
migration that applies it. `backend/src/migrations/` holds one generated
baseline plus one migration per change after it.

**How each environment gets its schema:**

| Environment | Built by |
|---|---|
| Local dev | `synchronize` — fast iteration, disposable database |
| Local e2e | migrations |
| CI e2e | migrations |
| Staging | migrations, as an explicit release step |

**Workflow:** change the entity → `npm run migration:generate -- src/migrations/<Name>`
→ **read the generated SQL** → commit both together. `npm run schema:check` gates
this in CI by building a throwaway database from migrations alone and asserting
`schema:log` finds nothing to do.

**The reading step is not ceremony.** `schema:log` compares the entities to the
schema, so it is blind to anything the entities do not describe. A construct
written only in raw SQL — a check constraint, a trigger, a function, a
concurrent index — will be dropped by a regenerated baseline and no gate will
notice. Such constructs must be hand-written into a migration and marked with a
comment saying they are invisible to drift detection.

Partial indexes are *not* in that category: TypeORM expresses them via
`@Index(name, columns, { where })` and `synchronize` builds them. The one-active-
plan guard on `AthleteMembershipPlanEntity` is declared exactly that way and is
present in every database, which is why the baseline squash was safe.

**Why this exists:** before 2026-08-20 the five files in `backend/src/migrations/`
were never registered in `databaseConfig`, had no npm script, and had never run
anywhere. Every schema was built by `synchronize`, so a first deployment with
`NODE_ENV=production` would have come up against an empty database and failed on
its first query.
```

- [ ] **Step 6: Commit**

```bash
git add backend/scripts/check-schema-drift.sh backend/package.json docs/DECISIONS.md
git commit -m "feat(backend): a drift gate that has never failed is not a gate"
```

---

# Phase 3 — CI

Two workflows, both hermetic. Neither touches a provider, so a fork PR or a provider outage cannot block them.

## Task 12: `ci.yml` — the fast gate

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm run schema:check` (Task 11) and the existing `test`, `lint` scripts.
- Produces: a required-status-check name (`ci`) for later branch protection.

The repository is GitHub (`JoaoChaves96/crossfit-app`) and has no workflows yet.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/ci.yml`:

```yaml
# The fast gate: types, unit tests, lint, and schema drift. Never touches a
# cloud provider, so it cannot be blocked by one being down or by a fork PR
# having no access to secrets.
name: ci

on:
  push:
    branches: [main, dev]
  pull_request:

concurrency:
  # A new push supersedes the run in flight for the same ref.
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  backend:
    runs-on: ubuntu-latest

    services:
      postgres:
        # Matches docker-compose.yml, so a CI-only schema difference is not a
        # thing that can happen.
        image: postgres:15-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: postgres
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm
          cache-dependency-path: backend/package-lock.json

      - run: npm ci
        working-directory: backend

      - name: Types
        run: npx tsc --noEmit
        working-directory: backend

      - name: Lint
        # --fix is in the package script; CI must report, not rewrite.
        run: npx eslint "{src,apps,libs,test}/**/*.ts"
        working-directory: backend

      - name: Unit tests
        run: npm test
        working-directory: backend

      - name: Schema drift
        # The gate from Task 11: builds a throwaway database from migrations
        # alone and asserts the entities describe nothing more.
        run: npm run schema:check
        working-directory: backend
        env:
          DB_HOST: localhost
          DB_PORT: '5432'
          DB_USERNAME: postgres
          DB_PASSWORD: postgres
          JWT_SECRET: ci-secret-not-used-for-anything-real

  frontend:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - run: npm ci
        working-directory: frontend

      - name: Types
        run: npx tsc --noEmit
        working-directory: frontend

      - name: Tests
        # jsdom reports 750px, so unpinned suites exercise the mobile layout
        # only. Suites that care about desktop pin the viewport themselves.
        run: npm test
        working-directory: frontend

  image:
    # Proves the Dockerfile still builds. No registry push — that is Phase 5.
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/build-push-action@v6
        with:
          context: backend
          push: false
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 2: Check the lint invocation matches reality**

`npm run lint` carries `--fix`, which must not run in CI. Confirm the bare invocation reports the same problems:

Run: `cd backend && npx eslint "{src,apps,libs,test}/**/*.ts"`
Expected: exits 0 on the current tree. If it reports errors that `--fix` was silently repairing, fix them in this task and note it in the commit message.

- [ ] **Step 3: Validate the workflow file parses**

Run: `cd /Users/joao.chaves/Documents/crossfit-app && python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('ok')"`
Expected: `ok`.

- [ ] **Step 4: Confirm every referenced script exists**

Run: `cd backend && node -e "const s=require('./package.json').scripts; ['test','schema:check'].forEach(k=>{if(!s[k])throw new Error('missing '+k)}); console.log('ok')" && cd ../frontend && node -e "const s=require('./package.json').scripts; if(!s.test)throw new Error('missing test'); console.log('ok')"`
Expected: `ok` twice.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: types, tests, lint and schema drift on every pull request"
```

---

## Task 13: `e2e.yml` — the 15 journeys in CI

Today's suite, moved to CI unchanged. `playwright.config.ts:45` already has `forbidOnly: !!process.env.CI` and `:47` selects the `github` reporter under CI, so the config anticipates this.

**Files:**
- Create: `.github/workflows/e2e.yml`

**Interfaces:**
- Consumes: the migration-built e2e database (Task 10), `GET /health` (Task 1).
- Produces: a second status check (`e2e`), and a `playwright-report` artifact on failure.

Kept separate from `ci.yml` because it takes minutes rather than seconds; a fast gate that waits on a browser suite stops being a fast gate. `workers: 1` stays — see Global Constraints.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/e2e.yml`:

```yaml
# The 15 Playwright journeys, hermetic: Postgres as a service container, the
# schema from migrations, the API and Expo web export booted by Playwright's
# own webServer. Nothing here reaches a cloud provider.
name: e2e

on:
  push:
    branches: [main, dev]
  pull_request:

concurrency:
  group: e2e-${{ github.ref }}
  cancel-in-progress: true

jobs:
  journeys:
    runs-on: ubuntu-latest
    # Serial by design (playwright.config.ts workers: 1 — measured, see its
    # comment), so allow generously more than the ~3 min it takes locally.
    timeout-minutes: 30

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: postgres
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm

      - run: npm ci
        working-directory: backend

      - run: npm ci
        working-directory: frontend

      - name: Create the e2e database
        # global-setup.ts connects to it and refuses to create it, by design:
        # the name is a constant so no run can be pointed elsewhere.
        run: |
          PGPASSWORD=postgres psql -h localhost -U postgres -d postgres \
            -c 'CREATE DATABASE crossfit_box_e2e'

      - name: Install Chromium
        run: npx playwright install --with-deps chromium
        working-directory: frontend

      - name: Backend env
        # backend/.env is gitignored, and main.ts loads it via dotenv/config.
        # global-setup.ts runs the migrations; the API boots with synchronize
        # off (e2eBackendEnv sets NODE_ENV=production).
        run: |
          cat > backend/.env <<'EOF'
          JWT_SECRET=ci-e2e-secret-not-used-for-anything-real
          DB_HOST=localhost
          DB_PORT=5432
          DB_USERNAME=postgres
          DB_PASSWORD=postgres
          EOF

      - name: Journeys
        run: npm run test:e2e
        working-directory: frontend

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: |
            frontend/playwright-report
            frontend/test-results
          retention-days: 7
```

- [ ] **Step 2: Validate the workflow parses**

Run: `cd /Users/joao.chaves/Documents/crossfit-app && python3 -c "import yaml; yaml.safe_load(open('.github/workflows/e2e.yml')); print('ok')"`
Expected: `ok`.

- [ ] **Step 3: Reproduce the CI conditions locally**

The two things CI changes are `CI=true` (which flips `forbidOnly` and the reporter) and a database created empty moments earlier.

```bash
cd /Users/joao.chaves/Documents/crossfit-app
docker compose exec -T postgres psql -U postgres -c 'DROP DATABASE IF EXISTS crossfit_box_e2e'
docker compose exec -T postgres psql -U postgres -c 'CREATE DATABASE crossfit_box_e2e'
cd frontend && CI=true npm run test:e2e 2>&1 | tail -30
```

Expected: 15 journeys pass. A failure under `CI=true` that does not reproduce without it is almost certainly a stray `.only` caught by `forbidOnly`.

- [ ] **Step 4: Confirm which paths `frontend/.gitignore` would hide**

Run: `cd frontend && git check-ignore -v playwright-report test-results 2>&1 || echo "not ignored"`
Expected: either result is fine — the artifact upload reads the working directory, not the index. This step only confirms the paths are the ones the suite actually writes; adjust the workflow if `playwright.config.ts` is later given an explicit `outputDir`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/e2e.yml
git commit -m "ci: fifteen journeys, a service container, and no provider in the loop"
```

---

## Final verification

Run after Task 13, from a clean tree.

- [ ] **Step 1: Types and unit tests, both apps**

```bash
cd backend  && npx tsc --noEmit && npm test
cd ../frontend && npx tsc --noEmit && npm test
```
Expected: clean, and green — the spec records 508 backend and 397 frontend.

- [ ] **Step 2: Backend e2e — the guard that had the most to lose**

Run: `cd backend && npm run test:e2e 2>&1 | tail -20`
Expected: green, against `crossfit_box_api_e2e`.

- [ ] **Step 3: The journeys, from an empty migration-built database**

```bash
cd /Users/joao.chaves/Documents/crossfit-app
docker compose exec -T postgres psql -U postgres -c 'DROP DATABASE IF EXISTS crossfit_box_e2e'
docker compose exec -T postgres psql -U postgres -c 'CREATE DATABASE crossfit_box_e2e'
cd frontend && npm run test:e2e 2>&1 | tail -20
```
Expected: 15 pass in roughly 3 minutes.

- [ ] **Step 4: Drift gate**

Run: `cd backend && npm run schema:check`
Expected: `✓ Schema is in sync`.

- [ ] **Step 5: The image serves**

```bash
cd backend && docker build -t crossfit-api:local .
docker run --rm -d --name api-final -p 3010:3000 \
  -e DATABASE_URL='postgres://postgres:postgres@host.docker.internal:5432/crossfit_box_dev' \
  -e JWT_SECRET=local-test-secret \
  -e CORS_ORIGINS=https://app.boxops.dev \
  -e PUBLIC_API_URL=https://api.boxops.dev \
  -e DISABLE_SCHEDULERS=true \
  crossfit-api:local
sleep 15
curl -s -o /dev/null -w 'health: %{http_code}\n' http://localhost:3010/health
curl -s http://localhost:3010/api-docs-json | grep -o 'https://api.boxops.dev'
docker rm -f api-final
```
Expected: `health: 200`, and the public API URL in the Swagger document.

- [ ] **Step 6: The dev database is untouched**

```bash
docker compose exec -T postgres psql -U postgres -d crossfit_box_dev -tAc \
  "SELECT count(*) FROM users"
docker compose exec -T postgres psql -U postgres -tAc \
  "SELECT datname FROM pg_database WHERE datname LIKE 'crossfit%'"
```
Expected: the user count unchanged from before this plan began, and no leftover `crossfit_box_baseline_gen` or `crossfit_box_drift_check` databases.

- [ ] **Step 7: Confirm the documentation is in step**

`CLAUDE.md` mandates that completed work updates its tracking docs. Update `context/PROJECT_STATE.md` (and any staging or infrastructure epic doc, if one exists by then) to record phases 1–3 as complete, the correction to the spec's Problem §3, and phases 4–6 as pending the provisioning work.

Do **not** update the spec's own text — it is the historical record of an approved design. The correction belongs in the plan, the commit message, and `docs/DECISIONS.md`.

- [ ] **Step 8: Report, do not push**

Show the user the full commit list and the verification output. Pushing, opening a PR, and merging to `main` all need their explicit go-ahead.

---

## What phases 4–6 will need from this work

Recorded so the next plan does not have to rediscover it:

- `GET /health` is the Fly `[[http_service.checks]]` path.
- `npm run migration:run` is the Fly `release_command`. The image keeps `devDependencies` for exactly that.
- `DATABASE_URL` + `DATABASE_SSL=true` is how Neon is reached; the role needs `CREATEDB` so CI can create throwaway e2e databases.
- `CORS_ORIGINS=https://app.boxops.dev` and `PUBLIC_API_URL=https://api.boxops.dev` on the Fly app.
- `EXPO_PUBLIC_API_BASE_URL=https://api.boxops.dev` must be set **at build time** for the Cloudflare Pages build — Expo inlines it into the bundle.
- `FRONTEND_URL=https://app.boxops.dev` on the API, or invite links point at localhost.
- Retargeting the e2e suite at staging means giving `frontend/e2e/env.ts` a `local`/`remote` target. Extend `assertE2eDatabase()` so it still refuses staging's own database — do not loosen it.
