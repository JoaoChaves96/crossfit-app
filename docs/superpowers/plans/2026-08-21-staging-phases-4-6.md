# Staging Infrastructure — Phases 4–6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the already-deployable application from phases 1–3 and put it on the
internet at `api.boxops.dev` / `app.boxops.dev`, deployed automatically on every push to
`dev` that passes both CI and the 15 Playwright journeys, with demo data seeded manually.

**Architecture:** The NestJS API runs as one Fly machine in `fra`, co-located with the Neon
Postgres it talks to (`eu-central-1` = AWS Frankfurt). Migrations run as Fly's
`release_command` against Neon's **direct** endpoint, so a failed migration aborts the
deploy instead of serving a half-migrated schema; the running app uses Neon's **pooled**
endpoint. The Expo web export is a static bundle published to Cloudflare Pages by
`wrangler` from GitHub Actions — not by Cloudflare's Git integration, because the deploy
must be gated on CI and because `EXPO_PUBLIC_*` is inlined at build time, which makes the
build environment part of the contract. Deploy is a **job** in `ci.yml` with
`needs: [backend, frontend, image, e2e]` rather than a separate workflow, because
`workflow_run` can only depend on one workflow and would happily deploy while the other is
still red.

**Tech Stack:** Fly.io (machines, `flyctl`), Neon Postgres 15.19, Cloudflare Pages +
Cloudflare DNS, GitHub Actions, TypeORM migrations, Expo static web export, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-20-staging-infrastructure-design.md`

**Corrections to the spec, already ratified in `context/DECISION_LOG.md` (2026-08-21) — the
spec's text is the historical record, these win:**

| Spec says | Reality |
|---|---|
| Fly region `mad` | **`fra`** — Neon's region is fixed at creation and is Frankfurt; `mad` costs ~25–30ms on *every* query |
| Database `crossfit_box_staging` | **`boxops_staging`** |
| `CREATEDB` right "to be confirmed" | **Confirmed**: `neondb_owner` has `rolcreatedb = true`, and is not superuser |
| Domain "pending purchase at phase 4" | **Already bought** at Cloudflare Registrar |
| Accounts to be created in phase 4 | **Neon and Fly already provisioned.** Fly app `boxops-api-staging` exists in org `personal`, status `pending` (name reserved, no machine) |

## Global Constraints

- **Region: Fly `fra`. Database: Neon `boxops_staging`, PostgreSQL 15.19, `eu-central-1`.**
- **Origins: `https://api.boxops.dev` and `https://app.boxops.dev`.** Reverse-DNS bundle id
  `dev.boxops.mobile` (already set in `frontend/app.json`).
- **No step in the deploy pipeline may write application data.** Deploys run migrations
  only. The seed is manual, once, deliberately outside the pipeline.
- **The staging database is never written to by tests.** Every e2e run gets its own
  database.
- **`assertE2eDatabase()` is never loosened.** What it asserts may change; its refusal must
  still cover staging's own database — the modern form of the mistake that once truncated
  15 tables in the dev database.
- **Two Neon endpoints, differing by exactly `-pooler` in the hostname.** Pooled = app
  runtime. **Direct = every migration and every `CREATE DATABASE`/`DROP DATABASE`.** DDL
  through PgBouncer is a category of bug nobody should spend an afternoon on.
- **`migrationsRun` stays `false`.** Migrations are a release step; two machines booting
  together would race on the same DDL.
- **Migrations are forward-only and must not break the currently-running version.**
  `release_command` commits before the new machines take traffic, so if the health check
  then fails, Fly rolls back the *code* while the schema stays migrated.
- **`/api-docs` stays public on staging.** `npm run generate:api-types` reads
  `/api-docs-json`; gating it breaks the type-generation workflow `CLAUDE.md` mandates.
- **No secret value is ever written to a file in the repo, pasted into a chat, or echoed by
  a workflow.** Secrets are set by the human via `fly secrets set` / `gh secret set`.
- **Never `ALTER ROLE … PASSWORD` on Neon via SQL** — it desyncs the connection strings the
  Neon console and CLI display. Rotate through the console.
- **`min_machines_running = 1`, no scale-to-zero.** The three `@Cron` services must tick,
  and cold starts make e2e timings unreliable.
- **`flyctl` is installed (v0.4.87) and authenticated; org slug is `personal`.**
- Node 24 everywhere (`backend/package.json` pins `>=24 <25`). Postgres 15 everywhere.

### Secret inventory (the whole set, so no task invents one)

**Fly app secrets** (`fly secrets set --app boxops-api-staging`):

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** URL, database `boxops_staging` |
| `DATABASE_MIGRATION_URL` | Neon **direct** URL, same database |
| `JWT_SECRET` | fresh 32+ byte random, not any local value |
| `FRONTEND_URL` | `https://app.boxops.dev` |
| `CORS_ORIGINS` | `https://app.boxops.dev` |
| `PUBLIC_API_URL` | `https://api.boxops.dev` |
| `DATABASE_SSL` | `true` |

`NODE_ENV=production` comes from the Dockerfile's `ENV`, not a secret. `PORT` comes from
`fly.toml`'s `[env]`. `DISABLE_SCHEDULERS` is **not** set on staging — the crons should run.

**GitHub repository secrets** (`gh secret set`):

| Name | Scope |
|---|---|
| `FLY_API_TOKEN` | `fly tokens create deploy --app boxops-api-staging` (deploy-scoped, not a personal token) |
| `CLOUDFLARE_API_TOKEN` | Custom token, permission `Account → Cloudflare Pages → Edit` |
| `CLOUDFLARE_ACCOUNT_ID` | not secret, but stored alongside for convenience |
| `NEON_ADMIN_DATABASE_URL` | Neon **direct** URL — used only to `CREATE`/`DROP` throwaway e2e databases (Task 9) |

---

## File Structure

**Created:**

- `backend/fly.toml` — the Fly app definition: `fra`, health check, release command.
- `frontend/public/_redirects` — Cloudflare Pages SPA fallback so `/invite/<token>` resolves.
- `scripts/staging-seed.sh` — the manual, idempotent staging seed (Phase 6).
- `scripts/sql/staging-seed.sql` — its SQL body.
- `frontend/__tests__/e2e-env.test.ts` — unit tests for the e2e target resolution.

**Modified:**

- `backend/src/config/database.config.ts` — strict TLS verification.
- `backend/src/config/database.config.spec.ts` — its tests.
- `.github/workflows/ci.yml` — absorbs the `e2e` job, gains `deploy` and `remote-e2e`.
- `frontend/e2e/env.ts` — `local` | `remote` target; the guard is extended, never relaxed.
- `frontend/playwright.config.ts` — `webServer` only for the local target.
- `frontend/e2e/global-setup.ts` — remote target migrates a throwaway database.
- `frontend/.env.example`, `backend/.env.example` — the new variables.
- `context/PROJECT_STATE.md`, `epics/` tracking docs — progress, per `CLAUDE.md`.

**Deleted:**

- `.github/workflows/e2e.yml` — becomes a job in `ci.yml` (Task 5).

---

## Task ordering, and where you may stop

Tasks 1–6 deliver a working, automatically-deployed staging environment. **That is what
unblocks `epics/EMAIL_SERVICE_EPIC.md`.** Tasks 7–9 (remote e2e) add post-deploy
verification and are the spec's own "most moving parts, most likely to need a second pass";
they can be deferred without blocking anything. Task 10 (seed) is independent of 7–9.

Tasks 1, 3, 4 contain steps only a human with account access can perform. Those steps are
marked **[HUMAN]**. An agent executing this plan must stop at each one, state exactly what
it needs, and wait — it must not attempt to work around a missing secret.

---

### Task 1: `fly.toml` and the first manual deploy

**Files:**
- Create: `backend/fly.toml`
- Verify: `backend/.dockerignore` (exists), `backend/Dockerfile` (exists, builds)

**Interfaces:**
- Consumes: the Phase 1 Dockerfile and `GET /health`; `buildDatabaseConfig`'s
  `DATABASE_URL` + `DATABASE_SSL` support.
- Produces: a running app at `https://boxops-api-staging.fly.dev`, and the secret names
  every later task refers to.

- [ ] **Step 1: Confirm the app exists and has no machines**

```bash
fly apps list
fly machines list --app boxops-api-staging
```

Expected: app `boxops-api-staging`, owner `personal`, status `pending`; zero machines.
If the app is missing: `fly apps create boxops-api-staging --org personal`.

- [ ] **Step 2: Write `backend/fly.toml`**

```toml
# The staging API. One machine, always on, in the same city as the database.
#
# `fra` and not the spec's `mad`: Neon's region is fixed at project creation and
# is eu-central-1 (AWS Frankfurt). Frankfurt-to-Frankfurt is ~1-3ms; Madrid
# would add ~25-30ms to EVERY query, so a request making ten ORM round-trips
# would inherit ~300ms of pure network. Iberian user-facing latency barely
# differs between the two. See context/DECISION_LOG.md (2026-08-21).
app = 'boxops-api-staging'
primary_region = 'fra'

[build]
  dockerfile = 'Dockerfile'

# Migrations are a RELEASE step, never a boot side effect: `migrationsRun` is
# false in database.config.ts because two machines booting together would race
# on the same DDL. This runs once, before the new machines take traffic, and a
# non-zero exit aborts the deploy.
#
# It overrides DATABASE_URL with the DIRECT Neon endpoint for the duration of
# the command. DDL through PgBouncer (the pooled endpoint) is a class of failure
# with no upside here.
[deploy]
  release_command = "sh -c 'DATABASE_URL=\"$DATABASE_MIGRATION_URL\" npm run migration:run'"
  strategy = 'immediate'

[env]
  PORT = '3000'
  # DISABLE_SCHEDULERS is deliberately absent: staging SHOULD run the
  # class-lifecycle, membership-renewal and reminder crons. Only the e2e suite
  # silences them.

[http_service]
  internal_port = 3000
  force_https = true
  # No scale-to-zero. The three @Cron services must tick, and a cold start
  # would make the post-deploy journey timings unreliable.
  auto_stop_machines = false
  auto_start_machines = false
  min_machines_running = 1
  processes = ['app']

  [[http_service.checks]]
    # /health pings the database, so this fails a release that is listening but
    # cannot reach Neon — which is exactly the deploy that must not go green.
    interval = '15s'
    timeout = '5s'
    grace_period = '30s'
    method = 'GET'
    path = '/health'

[[vm]]
  size = 'shared-cpu-1x'
  memory = '512mb'
  cpus = 1
```

- [ ] **Step 3: Confirm `.dockerignore` excludes secrets and `node_modules`**

Run: `cat backend/.dockerignore`
Expected: `node_modules` and `.env` are both listed. If `.env` is not, add it — the image
must never carry a local environment file. (Phase 1 verified the image runs with zero `.env`
files present; this keeps that true.)

- [ ] **Step 4: [HUMAN] Set the Fly secrets**

The human runs this, substituting real values. Do not print the results.

```bash
fly secrets set --app boxops-api-staging \
  DATABASE_URL='<neon POOLED url, database boxops_staging>' \
  DATABASE_MIGRATION_URL='<neon DIRECT url, same database>' \
  JWT_SECRET="$(openssl rand -base64 48)" \
  FRONTEND_URL='https://app.boxops.dev' \
  CORS_ORIGINS='https://app.boxops.dev' \
  PUBLIC_API_URL='https://api.boxops.dev' \
  DATABASE_SSL='true'
```

Then confirm the names only (values are never displayed):

```bash
fly secrets list --app boxops-api-staging
```

Expected: exactly the seven names above.

Note `FRONTEND_URL` and `CORS_ORIGINS` already point at `app.boxops.dev`, which does not
resolve yet. That is correct and harmless — nothing reads them until a browser is involved,
and Task 4 makes the name real.

- [ ] **Step 5: Deploy**

```bash
cd backend && fly deploy --app boxops-api-staging
```

Expected, in order: image builds; `Running release_command`; migration output ending in
applied migrations (first deploy applies `Baseline`); one machine started; the health check
turns `passing`.

If `release_command` fails, the deploy aborts and no machine takes traffic — that is the
designed behaviour, not a problem to work around. Read the release logs
(`fly logs --app boxops-api-staging`) and fix the cause.

- [ ] **Step 6: Verify the deployed API serves**

```bash
curl -s https://boxops-api-staging.fly.dev/health
curl -s -o /dev/null -w '%{http_code}\n' https://boxops-api-staging.fly.dev/api-docs
```

Expected: `{"status":"ok","database":"up"}` and `200`.

- [ ] **Step 7: Verify the schema really landed in Neon, and that nothing seeded it**

```bash
fly ssh console --app boxops-api-staging -C \
  "node -e \"const{Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});c.connect().then(()=>c.query(\\\"select count(*)::int tables from pg_tables where schemaname='public'\\\")).then(r=>console.log(r.rows[0])).then(()=>c.query('select count(*)::int users from users')).then(r=>console.log(r.rows[0])).then(()=>c.end())\""
```

Expected: 18 tables (17 entities + TypeORM's `migrations` ledger) and **0 users**. A
non-zero user count means something seeded during deploy, which violates a global
constraint — stop and find it.

- [ ] **Step 8: Commit**

```bash
git add backend/fly.toml backend/.dockerignore
git commit -m "feat(infra): a fly app in fra, migrating as a release step

Region fra rather than the spec's mad: Neon is in eu-central-1 (Frankfurt)
and its region is fixed at creation, so co-locating saves ~25-30ms on every
query. release_command migrates through the DIRECT endpoint; the app runs on
the pooled one."
```

---

### Task 2: Verified TLS to Neon

**Files:**
- Modify: `backend/src/config/database.config.ts`
- Test: `backend/src/config/database.config.spec.ts`

**Interfaces:**
- Consumes: `buildDatabaseConfig(env)` from Phase 1.
- Produces: `DATABASE_SSL=true` now means *verified* TLS. A new escape hatch
  `DATABASE_SSL_INSECURE=true` exists for a server with an untrusted certificate.

**Why:** `sslmode=require` and `channel_binding=require` in a Neon URL are **libpq**
parameters. `node-postgres` ignores both. TLS comes solely from `DATABASE_SSL=true`, which
today produces `ssl: { rejectUnauthorized: false }` — encrypted, but the server certificate
is never checked, so a machine-in-the-middle between Fly and Neon would not be detected.
Neon serves Let's Encrypt certificates and Node's bundled CA store already trusts ISRG Root
X1, so verification needs no bundled CA file — only the flag flipped.

- [ ] **Step 1: Write the failing tests**

Add to `backend/src/config/database.config.spec.ts`:

```ts
describe('TLS', () => {
  it('verifies the server certificate when DATABASE_SSL is true', () => {
    const config = buildDatabaseConfig({
      DATABASE_URL: 'postgres://u:p@example.neon.tech/db',
      DATABASE_SSL: 'true',
    } as NodeJS.ProcessEnv) as { ssl?: { rejectUnauthorized: boolean } };

    expect(config.ssl).toEqual({ rejectUnauthorized: true });
  });

  it('allows an unverified connection only when explicitly asked', () => {
    const config = buildDatabaseConfig({
      DATABASE_URL: 'postgres://u:p@example.neon.tech/db',
      DATABASE_SSL: 'true',
      DATABASE_SSL_INSECURE: 'true',
    } as NodeJS.ProcessEnv) as { ssl?: { rejectUnauthorized: boolean } };

    expect(config.ssl).toEqual({ rejectUnauthorized: false });
  });

  it('omits ssl entirely when DATABASE_SSL is unset, so local Postgres still works', () => {
    const config = buildDatabaseConfig({} as NodeJS.ProcessEnv) as {
      ssl?: unknown;
    };

    expect(config.ssl).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx jest src/config/database.config.spec.ts`
Expected: the first test FAILS — received `{ rejectUnauthorized: false }`. The third passes
already.

- [ ] **Step 3: Implement**

In `backend/src/config/database.config.ts`, replace the TLS spread:

```ts
    ...(env.DATABASE_SSL === 'true'
      ? {
          ssl: {
            // Verification ON. `sslmode`/`channel_binding` in a provider URL are
            // libpq parameters that node-postgres silently ignores, so this flag
            // is the ONLY thing standing between us and an unauthenticated
            // channel. Neon serves Let's Encrypt certificates and Node's bundled
            // CA store trusts ISRG Root X1, so no CA file has to travel with the
            // image.
            //
            // DATABASE_SSL_INSECURE is the deliberate, named escape hatch for a
            // provider with a private CA. It has to be asked for by name; it is
            // not what a missing variable gets you.
            rejectUnauthorized: env.DATABASE_SSL_INSECURE !== 'true',
          },
        }
      : {}),
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx jest src/config/database.config.spec.ts`
Expected: PASS.

- [ ] **Step 5: Prove it against the real Neon endpoint**

Run: `cd backend && npm test && npx tsc --noEmit`
Expected: full unit suite green (520+), types clean.

Then redeploy and confirm the health check still passes — this is the real test, because it
is the only place a certificate is actually validated:

```bash
cd backend && fly deploy --app boxops-api-staging
curl -s https://boxops-api-staging.fly.dev/health
```

Expected: `{"status":"ok","database":"up"}`. A TLS failure would surface as `503` plus a
`self-signed certificate` / `unable to verify` error in `fly logs`.

- [ ] **Step 6: Also correct a stale comment while in this file**

`buildDatabaseConfig`'s `synchronize` comment says `e2eBackendEnv()` sets `NODE_ENV=test`.
It sets `NODE_ENV=production` now (changed in Phase 2, when e2e moved onto migrations).
Update the comment to say so — a comment that misdescribes the mechanism it guards is worse
than none.

- [ ] **Step 7: Commit**

```bash
git add backend/src/config/database.config.ts backend/src/config/database.config.spec.ts
git commit -m "fix(backend): staging TLS was encrypted but never verified

sslmode and channel_binding in a Neon URL are libpq parameters node-postgres
ignores, so rejectUnauthorized:false meant a MITM between Fly and Neon was
undetectable. Verification is now on by default, with DATABASE_SSL_INSECURE
as the named escape hatch."
```

---

### Task 3: `api.boxops.dev` — DNS and certificate

**Files:** none in the repo. This is DNS and Fly configuration.

**Interfaces:**
- Consumes: the running app from Task 1.
- Produces: `https://api.boxops.dev` serving the API with a valid certificate. Later tasks
  use this origin in `EXPO_PUBLIC_API_BASE_URL` and in the post-deploy smoke test.

- [ ] **Step 1: Ask Fly for the certificate first**

```bash
fly certs add api.boxops.dev --app boxops-api-staging
fly certs show api.boxops.dev --app boxops-api-staging
```

Expected: state `Awaiting configuration`, plus the DNS instructions Fly wants. Requesting
the certificate before the DNS record exists is deliberate: Fly then tells you exactly
which record it will validate against.

- [ ] **Step 2: [HUMAN] Add the DNS record in Cloudflare, proxy OFF**

Cloudflare dashboard → `boxops.dev` → DNS → Add record:

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name | `api` |
| Target | `boxops-api-staging.fly.dev` |
| Proxy status | **DNS only (grey cloud)** |
| TTL | Auto |

**The grey cloud is load-bearing.** Fly issues its own Let's Encrypt certificate, and
Let's Encrypt must reach *Fly* to validate the challenge. With the orange cloud on,
Cloudflare terminates TLS and answers instead, so `fly certs show` sits in
`Awaiting configuration` forever while the browser shows a Cloudflare 5xx. This is the
single most common Fly-behind-Cloudflare failure.

- [ ] **Step 3: Verify the record resolves before waiting on the certificate**

```bash
dig +short api.boxops.dev CNAME
dig +short api.boxops.dev A
```

Expected: the CNAME target is `boxops-api-staging.fly.dev.` and the A lookup returns Fly's
shared IPv4 — **not** a Cloudflare address (`104.*` / `172.67.*`). A Cloudflare address
means the proxy is still on; fix that before continuing.

- [ ] **Step 4: Wait for issuance and verify TLS end to end**

```bash
fly certs show api.boxops.dev --app boxops-api-staging
curl -sS https://api.boxops.dev/health
curl -sS -o /dev/null -w '%{http_code} %{ssl_verify_result}\n' https://api.boxops.dev/health
```

Expected: certificate state `Ready`; `{"status":"ok","database":"up"}`; `200 0`
(`ssl_verify_result` of `0` is a verified chain — no `-k` anywhere).

- [ ] **Step 5: Verify Swagger advertises the public origin**

```bash
curl -s https://api.boxops.dev/api-docs-json | node -e \
  "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).servers))"
```

Expected: `[ { url: 'https://api.boxops.dev' } ]`, from the `PUBLIC_API_URL` secret. If it
says `localhost`, the secret is missing — `main.ts` falls back to localhost by design.

- [ ] **Step 6: Record the proxy decision**

Append to `context/DECISION_LOG.md`:

```markdown
## `api.boxops.dev` Is Unproxied (2026-08-21)

**Decision:** The `api` CNAME to Fly is **DNS only** (grey cloud), not proxied.

**Rationale:** Fly issues and renews its own Let's Encrypt certificate via ACME
validation against the hostname. The Cloudflare proxy terminates TLS itself and
answers the challenge, so the Fly certificate never leaves `Awaiting
configuration` while the browser sees a Cloudflare error. Turning the proxy on
is possible *after* Fly holds a valid certificate, with SSL mode Full (strict) —
it buys WAF and DDoS absorption and hides the origin, and it is deferred rather
than rejected. `app.boxops.dev` is the opposite: Pages is proxied by nature.
```

- [ ] **Step 7: Commit**

```bash
git add context/DECISION_LOG.md
git commit -m "docs(infra): api.boxops.dev is deliberately unproxied"
```

---

### Task 4: The frontend on Cloudflare Pages

**Files:**
- Create: `frontend/public/_redirects`
- Modify: `frontend/.env.example`

**Interfaces:**
- Consumes: `https://api.boxops.dev` from Task 3.
- Produces: `https://app.boxops.dev` serving the SPA against the staging API, and the exact
  build command Task 6 automates.

**Why `_redirects`:** `frontend/app.json` sets `web.output: "static"`, so `expo export`
emits one HTML file per *known* route. `/invite/<token>` is dynamic — there is no
`invite/abc123.html` — and Cloudflare Pages would return its own 404. Pages checks static
assets **before** applying `_redirects`, so a catch-all rewrite fixes deep links without
shadowing the real static routes. Expo copies `public/` verbatim into the export output,
which is why the file lives there.

- [ ] **Step 1: Create `frontend/public/_redirects`**

```
# Cloudflare Pages SPA fallback.
#
# `expo export` with web.output "static" emits an HTML file per known route, so
# Pages serves those directly — it checks static assets before consulting this
# file. What it cannot serve is a DYNAMIC route: /invite/<token> has no
# corresponding file, and an invite link that 404s is the one link in this
# product that absolutely must open for a stranger.
#
# 200 (rewrite), not 301: the URL must stay intact for expo-router to read the
# token from it on the client.
/*    /index.html   200
```

- [ ] **Step 2: Build the staging bundle locally and verify the API URL is baked in**

```bash
cd frontend
rm -rf dist
EXPO_PUBLIC_API_BASE_URL=https://api.boxops.dev npm run export:web
grep -rl "api.boxops.dev" dist/_expo | head
grep -rl "localhost:3000" dist/_expo | head
find dist -path '*node_modules*' | head
```

Expected: the first grep lists at least one bundle; the second and the `find` list
**nothing**.

Use `npm run export:web`, never bare `npx expo export` — the script runs
`scripts/relocate-vendor-assets.mjs` afterwards, and without it every asset a package
owns is unreachable in production. See "Cloudflare Pages skips `node_modules`" below.

**`export:web` passes `--clear`, and that matters.** `EXPO_PUBLIC_*` is inlined by the
Metro transform, and Metro caches transforms per module. A module that didn't change is
not re-transformed, so it keeps whatever origin was inlined the *last* time it was
built — `rm -rf dist` does not help, because the cache is not in `dist`. Observed
directly: an export run with no variable set and `.env.local` present still produced
`const t="https://api.boxops.dev"` from a previous session's build, and only revealed
the `.env.local` LAN address once `--clear` was added. The `grep` above is the backstop
for the dangerous direction (a LAN address reaching a staging bundle); `--clear` removes
the ambiguity altogether.

This check is not ceremony. `EXPO_PUBLIC_*` is inlined at build time, and Expo resolves it
from `.env` **files in preference to the environment** — the behaviour that forced
`pinApiOrigin()` to exist (see `frontend/e2e/fixtures.ts`). A machine with a
`frontend/.env.local` pointing at a LAN address will bake *that* in and the export will
look fine. If the second grep hits, temporarily move `.env.local` aside and rebuild.

- [ ] **Step 3: Verify the fallback file survived the export**

Run: `cat frontend/dist/_redirects`
Expected: the file contents from Step 1. If it is missing, `public/` was not copied — check
that the directory is at `frontend/public/`, not `frontend/assets/public/`.

- [ ] **Step 4: [HUMAN] Create the Cloudflare API token**

Cloudflare dashboard → My Profile → API Tokens → Create Token → Custom token:

- Permissions: `Account` → `Cloudflare Pages` → `Edit`
- Account Resources: include your account
- No zone permissions needed for deploying; adding the custom domain is done in the UI.

Keep the value; it becomes the `CLOUDFLARE_API_TOKEN` GitHub secret in Task 6. Also note
your Account ID (Cloudflare dashboard sidebar).

- [ ] **Step 5: [HUMAN] Create the Pages project and deploy once by hand**

```bash
cd frontend
npx wrangler pages project create boxops-app --production-branch dev
CLOUDFLARE_API_TOKEN='<token>' CLOUDFLARE_ACCOUNT_ID='<id>' \
  npx wrangler pages deploy dist --project-name boxops-app --branch dev
```

Expected: an upload summary and a deployment URL like
`https://<hash>.boxops-app.pages.dev`.

Deploying by hand before automating is deliberate — it separates "the build and upload
work" from "the workflow wiring works", which are otherwise diagnosed together at the worst
possible moment.

- [ ] **Step 6: Verify the provider URL works before attaching the domain**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://boxops-app.pages.dev/
curl -s -o /dev/null -w '%{http_code}\n' https://boxops-app.pages.dev/invite/not-a-real-token

# Every asset must come back as its own content type, NOT text/html.
cd frontend && for f in $(find dist/assets -type f); do
  curl -s -o /dev/null -w "%{content_type}  $f\n" "https://boxops-app.pages.dev/${f#dist/}"
done
```

Expected: `200` for the first two. The second is the `_redirects` fallback proving itself —
without it that request is a 404.

**A status code alone verifies nothing here, and assuming otherwise cost a debugging
session.** Because `_redirects` ends in `/* /index.html 200`, a file that was never
uploaded still answers `200` — with HTML. So check `content_type`: any asset reporting
`text/html` was not uploaded. The symptom is a *blank page*, because
`useFonts` never resolves and the root layout renders nothing; the only clue in the
console is `OTS parsing error: invalid sfntVersion: 1008813135`, which is the ASCII
`<!DO` of `<!DOCTYPE`.

- [ ] **Step 7: [HUMAN] Attach `app.boxops.dev`**

Cloudflare dashboard → Workers & Pages → `boxops-app` → Custom domains → Set up a custom
domain → `app.boxops.dev`. Because the zone is in the same account, Cloudflare writes the
DNS record itself and issues the certificate. Pages **is** proxied — that is normal and
correct here, unlike the Fly record in Task 3.

- [ ] **Step 8: Verify the deployed app talks to the deployed API**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://app.boxops.dev/
```

Then, in a real browser at `https://app.boxops.dev`: register or log in, and confirm in
DevTools → Network that requests go to `https://api.boxops.dev` with no CORS error.

Expected: login succeeds. This is the spec's own Phase 4 verification —
"a real login works from a real browser". A CORS failure here means the `CORS_ORIGINS`
secret does not exactly match the origin, scheme included.

There are no users yet, so registering is the way to get in. Task 10 adds demo data.

- [ ] **Step 9: Document the new variable and commit**

Add to `frontend/.env.example`, beside the existing entry:

```
# Inlined into the bundle at BUILD time, not read at runtime. The deployed
# staging build is produced with EXPO_PUBLIC_API_BASE_URL=https://api.boxops.dev
# (see .github/workflows/ci.yml). Expo prefers .env FILES over the environment,
# so a local .env.local silently wins over an exported value — which is why the
# CI build greps the bundle to prove which URL landed.
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

```bash
git add frontend/public/_redirects frontend/.env.example
git commit -m "feat(frontend): a pages SPA fallback so invite deep links resolve

expo export with static output emits a file per KNOWN route, so /invite/<token>
had no file and Pages would 404 the one link that must open for a stranger.
Pages checks static assets before _redirects, so the catch-all does not shadow
real routes."
```

---

### Task 5: Fold the journeys into `ci.yml`

**Files:**
- Modify: `.github/workflows/ci.yml`
- Delete: `.github/workflows/e2e.yml`

**Interfaces:**
- Consumes: the existing `e2e.yml` job body, moved verbatim apart from its `name`/`on`
  headers.
- Produces: a job named `e2e` inside `ci`, which Task 6's `deploy` job can list in `needs`.

**Why:** `workflow_run` triggers on exactly one workflow, so a standalone `deploy.yml`
cannot require both `ci` and `e2e` — it would fire when whichever one it names finishes,
deploying while the other is still running or already red. Job-level `needs` is a real
barrier: if any dependency fails or is skipped, the dependent job never starts. This also
collapses two PR statuses into one.

- [ ] **Step 1: Move the `journeys` job into `ci.yml` as `e2e`**

Append to the `jobs:` block of `.github/workflows/ci.yml` — the whole job body from
`e2e.yml`, renamed:

```yaml
  e2e:
    # The 15 Playwright journeys, hermetic: Postgres as a service container, the
    # schema from migrations, the API and Expo web booted by Playwright's own
    # webServer. Nothing here reaches a cloud provider, so a provider outage or a
    # fork PR with no secrets cannot block it.
    #
    # A job in `ci` rather than its own workflow, because `deploy` must depend on
    # BOTH this and the fast checks. `workflow_run` can only name one workflow, so
    # a separate workflow would deploy while this one was still red. Job-level
    # `needs` is the only real barrier GitHub offers.
    runs-on: ubuntu-latest
    # Serial by design (playwright.config.ts workers: 1 — measured, see its
    # comment). ~6 min on a runner; allow generously more.
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
          # There is no lock file at the repo root — the two apps each have
          # their own. Without these paths setup-node looks only at the root,
          # finds nothing, and fails the job before a single test runs. This
          # job installs both, so both are listed.
          cache-dependency-path: |
            backend/package-lock.json
            frontend/package-lock.json

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

- [ ] **Step 2: Delete the old workflow**

```bash
git rm .github/workflows/e2e.yml
```

- [ ] **Step 3: Validate the YAML**

```bash
cd /Users/joao.chaves/Documents/crossfit-app
node -e "const y=require('yaml');const fs=require('fs');const d=y.parse(fs.readFileSync('.github/workflows/ci.yml','utf8'));console.log(Object.keys(d.jobs))"
```

Expected: `[ 'backend', 'frontend', 'image', 'e2e' ]`.

Use node's `yaml` package — **`python3` in this environment has no `yaml` module**, a trap
already hit once in Phase 3.

- [ ] **Step 4: Commit and prove it on GitHub**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: the journeys become a job, so a deploy can depend on them

workflow_run names exactly one workflow, so a separate deploy workflow would
fire on whichever finished first and ship while the other was red. Job-level
needs is the only real barrier, and that requires one workflow."
git push
```

Then: `gh run watch` (or `gh run list --workflow=ci --limit 1`).
Expected: one `ci` run with four jobs, all green; no `e2e` workflow listed any more.

---

### Task 6: The deploy job

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: jobs `backend`, `frontend`, `image`, `e2e` from Task 5; `backend/fly.toml` from
  Task 1; the Pages project from Task 4.
- Produces: automatic deployment of both halves on every green push to `dev`, plus a
  post-deploy smoke check.

- [ ] **Step 1: [HUMAN] Create the deploy token and set the GitHub secrets**

```bash
fly tokens create deploy --app boxops-api-staging --name github-actions
```

A deploy-scoped token, **not** a personal access token: it can deploy this one app and
nothing else, which is the whole point of it living in CI.

```bash
gh secret set FLY_API_TOKEN            # paste the fly token
gh secret set CLOUDFLARE_API_TOKEN     # paste the Pages token from Task 4
gh secret set CLOUDFLARE_ACCOUNT_ID    # paste the account id
gh secret list
```

Expected: the three names listed. Values are never echoed and never enter the repo.

- [ ] **Step 2: Add the `deploy` job to `ci.yml`**

```yaml
  deploy:
    # Staging deploys itself on every green push to `dev`.
    #
    # `needs` lists EVERY gate, the journeys included: a deploy that skipped
    # them would ship on unit tests and a type check alone, which is precisely
    # the class of breakage the journeys exist to catch. If any dependency fails
    # or is skipped, this job never starts.
    needs: [backend, frontend, image, e2e]
    # Pull requests must not deploy, and neither must `main` — there is exactly
    # one environment and `dev` owns it.
    if: github.ref == 'refs/heads/dev' && github.event_name == 'push'
    runs-on: ubuntu-latest
    # One environment, one deploy at a time. NOT cancel-in-progress: killing a
    # deploy midway through its release_command is how you get a migrated
    # database serving old code.
    concurrency:
      group: deploy-staging
      cancel-in-progress: false

    steps:
      - uses: actions/checkout@v4

      # ---- API -----------------------------------------------------------
      - uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy the API
        # fly.toml carries the release_command that runs migrations against the
        # DIRECT Neon endpoint before any new machine takes traffic. A failed
        # migration aborts the deploy rather than serving a half-migrated schema.
        run: flyctl deploy --remote-only --app boxops-api-staging
        working-directory: backend
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Smoke the API
        # Against the real public origin, so DNS, the certificate and CORS
        # config are all in the path — not just the fly.dev name.
        run: |
          set -euo pipefail
          for i in $(seq 1 30); do
            body="$(curl -fsS https://api.boxops.dev/health || true)"
            if [ "$body" = '{"status":"ok","database":"up"}' ]; then
              echo "API healthy: $body"; exit 0
            fi
            echo "attempt $i: $body"; sleep 5
          done
          echo "API did not become healthy"; exit 1

      # ---- Frontend ------------------------------------------------------
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - run: npm ci
        working-directory: frontend

      - name: Build the web bundle
        # EXPO_PUBLIC_* is inlined at BUILD time, so this value is baked into the
        # bundle and cannot be changed by anything at runtime.
        #
        # export:web, not bare `expo export`: it chains
        # scripts/relocate-vendor-assets.mjs, without which every package-owned
        # asset lands under a node_modules path that Pages refuses to upload.
        run: npm run export:web
        working-directory: frontend
        env:
          EXPO_PUBLIC_API_BASE_URL: https://api.boxops.dev

      - name: Assert no asset sits under a node_modules path
        # Pages skips these silently and the SPA rewrite answers 200 with HTML,
        # so this must fail the build rather than reach production.
        run: test -z "$(find dist -path '*node_modules*')"
        working-directory: frontend

      - name: Assert the staging API URL was baked in
        # Expo resolves EXPO_PUBLIC_* from .env FILES in preference to the
        # environment (the behaviour that forced pinApiOrigin() to exist). No
        # .env.local exists on a runner, so the export above is correct — but
        # this asserts it rather than trusting it, because the failure mode is a
        # deployed app quietly calling localhost.
        run: |
          set -euo pipefail
          grep -rq "api.boxops.dev" dist/_expo
          if grep -rq "localhost:3000" dist/_expo; then
            echo "The bundle still points at localhost — an .env file won."; exit 1
          fi
          echo "Bundle targets https://api.boxops.dev"
        working-directory: frontend

      - name: Publish to Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: frontend
          command: pages deploy dist --project-name boxops-app --branch dev

      - name: Smoke the app
        # The second URL is the _redirects SPA fallback: without it, the one link
        # that must open for a stranger with no app installed returns 404.
        run: |
          set -euo pipefail
          curl -fsS -o /dev/null https://app.boxops.dev/
          curl -fsS -o /dev/null https://app.boxops.dev/invite/smoke-test-token
          echo "App and invite fallback both serve"
```

- [ ] **Step 3: Validate the YAML**

```bash
node -e "const y=require('yaml');const fs=require('fs');const d=y.parse(fs.readFileSync('.github/workflows/ci.yml','utf8'));console.log(Object.keys(d.jobs), d.jobs.deploy.needs)"
```

Expected: five jobs, and `needs` = `[ 'backend', 'frontend', 'image', 'e2e' ]`.

- [ ] **Step 4: Commit, push, and watch a real deploy**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: deploy staging on green, gated on the journeys too

needs lists every gate including e2e: deploying on unit tests and a type check
alone would ship exactly what the journeys exist to catch. Not
cancel-in-progress — killing a deploy inside its release_command leaves a
migrated database serving old code."
git push
gh run watch
```

Expected: four gates green, then `deploy` runs; `fly deploy` shows the release command
applying zero pending migrations; both smoke steps pass.

- [ ] **Step 5: Prove the gate actually gates**

This is the step that makes the previous one mean something. On a scratch branch, break a
unit test, open a PR, and confirm `deploy` is *skipped* (it is `dev`-only), then confirm
the PR is red. Then, on `dev`, confirm that a red `e2e` job leaves `deploy` in `skipped`
rather than running.

The cheapest honest version: temporarily add `expect(true).toBe(false)` to one backend unit
test on a branch, push, observe `ci` red and `deploy` absent, revert.

Expected: `deploy` never starts when any dependency is red. Document what you observed in
the commit message or the PR body — an ungated gate that has never been tested is the thing
Phase 3 already caught once.

---

### Task 7: An e2e target, without weakening the guard

**Files:**
- Modify: `frontend/e2e/env.ts`
- Test: `frontend/__tests__/e2e-env.test.ts` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `type E2eTarget = 'local' | 'remote'`
  - `e2eTarget(): E2eTarget` — `remote` only when `E2E_TARGET=remote`, else `local`
  - `e2eWebUrl(): string`, `e2eApiUrl(): string`, `e2eDbName(): string`
  - `assertE2eDatabase(name: string): void` — unchanged signature, extended assertion
  - `E2E_FORBIDDEN_DB_NAMES` — names the suite must never touch, `boxops_staging` included
  - existing `E2E_DB_NAME`, `E2E_TIMEZONE`, `e2eBackendEnv()`, `e2eMigrationEnv()` keep
    working unchanged for the local target

**Why the guard is extended and not relaxed:** `assertE2eDatabase()` exists because a
predecessor suite truncated 15 tables in `crossfit_box_dev`, where hand-seeded manual-test
scenarios live. Remote e2e needs it to accept a per-run database name — and the moment it
accepts a *pattern* instead of a constant, the mistake it prevents becomes available again
in a new form: pointing at `boxops_staging` and eating the demo data. So the remote name
must match a strict pattern **and** the forbidden list is checked explicitly, in both
targets.

- [ ] **Step 1: Write the failing tests**

Create `frontend/__tests__/e2e-env.test.ts`:

```ts
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

  it('uses the hard-coded constants, ignoring the environment', () => {
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx jest __tests__/e2e-env.test.ts`
Expected: FAIL — `e2eTarget is not a function`.

- [ ] **Step 3: Implement in `frontend/e2e/env.ts`**

Keep every existing export. Add:

```ts
/**
 * Where this run's stack lives.
 *
 * `local` is the default and behaves exactly as this file always has: constants,
 * never inherited values. `remote` runs the same journeys against a DEPLOYED
 * environment — the Pages build and an ephemeral API — and takes its addresses
 * from the environment because a deployment's addresses are not knowable here.
 *
 * The default is deliberate. A missing or misspelled variable resolves to
 * `local`, which is the harmless direction: a local run against a remote
 * database is the accident worth preventing, not the reverse.
 */
export type E2eTarget = 'local' | 'remote';

export function e2eTarget(): E2eTarget {
  return process.env.E2E_TARGET === 'remote' ? 'remote' : 'local';
}

/**
 * Databases the suite must never touch, whatever the target says.
 *
 * `crossfit_box_dev` holds hand-seeded manual-test scenarios no script can
 * rebuild. `boxops_staging` holds the demo data, which a deploy is forbidden to
 * write and a test suite has even less business truncating. `neondb` and
 * `postgres` are provider-owned. This list is checked in BOTH targets — the
 * pattern below would already reject them, and that redundancy is the point: a
 * future edit to the pattern cannot quietly re-open the hole.
 */
export const E2E_FORBIDDEN_DB_NAMES: readonly string[] = [
  'crossfit_box_dev',
  'boxops_staging',
  'neondb',
  'postgres',
];

/**
 * The only shape a remote e2e database name may take: the local name, an
 * underscore, and a 7-40 character run id of lowercase alphanumerics.
 *
 * Anchored at both ends, and the suffix cannot be empty. `crossfit_box_e2e_` and
 * `crossfit_box_e2e_abc_staging` both fail, which is the shape a typo or a
 * copy-paste takes.
 */
const REMOTE_DB_PATTERN = new RegExp(`^${E2E_DB_NAME}_[a-z0-9]{7,40}$`);

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[e2e] ${name} is required when E2E_TARGET=remote. The remote target has ` +
        `no defaults on purpose: guessing a deployment's address is how a run ` +
        `ends up somewhere nobody intended.`,
    );
  }
  return value;
}

/** The web origin under test. */
export function e2eWebUrl(): string {
  return e2eTarget() === 'remote' ? requiredEnv('E2E_WEB_URL') : E2E_WEB_URL;
}

/** The API origin every `/api` request is pinned to. */
export function e2eApiUrl(): string {
  return e2eTarget() === 'remote' ? requiredEnv('E2E_API_URL') : E2E_API_URL;
}

/** The database this run may touch, and only this one. */
export function e2eDbName(): string {
  return e2eTarget() === 'remote' ? requiredEnv('E2E_DB_NAME') : E2E_DB_NAME;
}
```

Then replace `assertE2eDatabase` (same signature, extended assertion) and make
`E2E_ALLOWED_API_ORIGIN` a function of the target:

```ts
/**
 * Throws unless the given database name is this run's designated e2e database.
 *
 * Called before opening a connection and before any destructive statement.
 * Cheap, and the last line of defence for a mistake that is not recoverable.
 *
 * The remote target widened WHAT this accepts — a per-run throwaway name — and
 * nothing else. It still refuses the dev database, and it now also refuses
 * `boxops_staging`, which is the same mistake in its modern form: staging holds
 * demo data seeded by hand, outside the pipeline, precisely so that no automated
 * step can clobber it.
 */
export function assertE2eDatabase(name: string): void {
  const refuse = (why: string): never => {
    throw new Error(
      `[e2e] Refusing to run against database "${name}": ${why} ` +
        `This suite truncates data; the dev database holds hand-seeded ` +
        `manual-test scenarios and staging holds the demo data.`,
    );
  };

  if (E2E_FORBIDDEN_DB_NAMES.includes(name)) {
    refuse('it is on the forbidden list.');
  }

  if (e2eTarget() === 'remote') {
    if (!REMOTE_DB_PATTERN.test(name)) {
      refuse(
        `a remote run may only touch a per-run throwaway database matching ` +
          `${E2E_DB_NAME}_<runid>.`,
      );
    }
    return;
  }

  if (name !== E2E_DB_NAME) {
    refuse(`a local run may only touch "${E2E_DB_NAME}".`);
  }
}

/**
 * The API origin the app must be pinned to for this run.
 *
 * Local: the e2e backend, so a write can never reach the dev database over HTTP.
 * Remote: the ephemeral API in front of this run's throwaway database — NOT
 * staging's own API, which would write to `boxops_staging`. `pinApiOrigin()` in
 * fixtures.ts rewrites every `/api` request to whatever this returns, which is
 * what makes the deployed bundle's baked-in base URL irrelevant.
 */
export function e2eAllowedApiOrigin(): string {
  return e2eApiUrl();
}
```

Keep the existing `E2E_ALLOWED_API_ORIGIN` const as a deprecated alias so nothing breaks
mid-refactor:

```ts
/** @deprecated Use `e2eAllowedApiOrigin()` — it is target-aware. */
export const E2E_ALLOWED_API_ORIGIN = E2E_API_URL;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx jest __tests__/e2e-env.test.ts`
Expected: PASS, all 9.

- [ ] **Step 5: Point `fixtures.ts` at the target-aware origin**

In `frontend/e2e/fixtures.ts`, change the import and both uses inside `pinApiOrigin` from
the constant to `e2eAllowedApiOrigin()`. Resolve it once per call:

```ts
function pinApiOrigin(page: Page): void {
  const allowed = e2eAllowedApiOrigin();
  void page.route(
    (url) => url.pathname.startsWith('/api') && url.origin !== allowed,
    (route) => {
      const original = new URL(route.request().url());
      return route.continue({
        url: `${allowed}${original.pathname}${original.search}`,
      });
    },
  );
}
```

- [ ] **Step 6: Prove nothing local regressed**

```bash
cd frontend && npx tsc --noEmit && npm test && npm run test:e2e
```

Expected: types clean; the full unit suite green (399 + the 9 new); **15/15 journeys**
against the local target with no configuration change. That last one is the real assertion
of this task — the refactor must be invisible to the local suite.

- [ ] **Step 7: Commit**

```bash
git add frontend/e2e/env.ts frontend/e2e/fixtures.ts frontend/__tests__/e2e-env.test.ts
git commit -m "feat(e2e): a local/remote target, with a guard that got stricter

The remote target widened only WHAT assertE2eDatabase accepts (a per-run
throwaway name) and added boxops_staging to an explicit forbidden list checked
in both targets. Staging holds demo data seeded by hand outside the pipeline;
truncating it is the modern form of the dev-database mistake this guard exists
for. 15/15 local journeys unchanged."
```

---

### Task 8: The remote e2e harness

**Files:**
- Modify: `frontend/playwright.config.ts`
- Modify: `frontend/e2e/global-setup.ts`

**Interfaces:**
- Consumes: `e2eTarget()`, `e2eWebUrl()`, `e2eApiUrl()`, `e2eDbName()`,
  `assertE2eDatabase()` from Task 7.
- Produces: `E2E_TARGET=remote npm run test:e2e` runs the journeys against a deployed
  environment, booting nothing locally.

**What remote mode must not do:** boot a `webServer` (there is nothing to boot), run
migrations through the pooled endpoint, or truncate anything it did not create. The
throwaway database's creation and destruction belong to the workflow (Task 9), not here —
`global-setup.ts` connects and migrates, exactly as it does locally.

- [ ] **Step 1: Make `webServer` conditional in `playwright.config.ts`**

```ts
import {
  E2E_TIMEZONE,
  E2E_WEB_PORT,
  e2eApiUrl,
  e2eBackendEnv,
  e2eTarget,
  e2eWebUrl,
} from './e2e/env';

const isRemote = e2eTarget() === 'remote';
```

Then `baseURL: e2eWebUrl()`, and:

```ts
  // Nothing to boot against a deployed environment: the API is a Fly machine and
  // the web app is a static bundle on a CDN. Locally this is the whole stack.
  webServer: isRemote ? undefined : [ /* the two existing entries, unchanged,
                                        with `${e2eApiUrl()}/health` as the
                                        backend's readiness url */ ],
```

Leave `workers: 1` alone, including its comment. The spec permits revisiting it **for the
remote target only, with measurements** — a separate change, not this one.

- [ ] **Step 2: Make `global-setup.ts` target-aware**

Replace the constants it imports with the functions, and gate the connection settings:

```ts
/**
 * Connection settings for this run's database.
 *
 * Remote runs migrate through the DIRECT Neon endpoint, never the pooled one:
 * DDL through PgBouncer is a failure mode with no upside. The workflow passes it
 * as E2E_DATABASE_URL and creates/drops the database itself — this file only
 * connects, migrates and truncates, exactly as it does locally.
 */
function connectionConfig(): { connectionString: string } | typeof e2eDbConfig {
  if (e2eTarget() === 'remote') {
    const url = process.env.E2E_DATABASE_URL;
    if (!url) {
      throw new Error(
        '[e2e] E2E_DATABASE_URL is required when E2E_TARGET=remote. It must be ' +
          "Neon's DIRECT endpoint (no `-pooler` in the host), pointed at this " +
          "run's throwaway database.",
      );
    }
    return { connectionString: url };
  }
  return e2eDbConfig;
}
```

The `assertE2eDatabase(rows[0].db)` check against `SELECT current_database()` stays exactly
where it is and becomes *more* valuable: for a remote run it is the only thing standing
between a malformed `E2E_DATABASE_URL` and staging's own data. Also assert before
connecting: `assertE2eDatabase(e2eDbName())`.

The migration step needs the URL too — `e2eMigrationEnv()` sets `DB_NAME`, which the remote
target must not use. Extend it:

```ts
/**
 * Environment for running the backend's migration CLI against this run's
 * database.
 *
 * Local: the constant DB_NAME, never inherited. Remote: DATABASE_URL, which
 * `buildDatabaseConfig` prefers over the discrete DB_* variables — so passing
 * both would be ambiguous and only one is ever set.
 *
 * NODE_ENV=production in both cases, forcing synchronize off so the schema is
 * built by the migration and by nothing else. If synchronize also ran, a passing
 * suite would prove nothing about the baseline.
 */
export function e2eMigrationEnv(): Record<string, string> {
  const base = { NODE_ENV: 'production', DISABLE_SCHEDULERS: 'true' };

  if (e2eTarget() === 'remote') {
    const url = process.env.E2E_DATABASE_URL;
    if (!url) throw new Error('[e2e] E2E_DATABASE_URL is required for a remote run.');
    return { ...base, DATABASE_URL: url, DATABASE_SSL: 'true' };
  }

  return { ...base, DB_NAME: E2E_DB_NAME };
}
```

Note `e2eMigrationEnv().DB_NAME` is asserted in `global-setup.ts` today; that assertion
must become `assertE2eDatabase(e2eDbName())` so it holds for both targets.

- [ ] **Step 3: Verify the local target is untouched**

```bash
cd frontend && npx tsc --noEmit && npm test && npm run test:e2e
```

Expected: types clean, units green, **15/15 journeys**. Any change here is a regression.

- [ ] **Step 4: Verify remote mode refuses a bad target, before it can do damage**

```bash
cd frontend
E2E_TARGET=remote npm run test:e2e 2>&1 | head -20
```

Expected: fails immediately with the `E2E_WEB_URL is required` error — no browser launched,
no connection opened.

Then the assertion that matters most:

```bash
E2E_TARGET=remote \
E2E_WEB_URL=https://app.boxops.dev \
E2E_API_URL=https://api.boxops.dev \
E2E_DB_NAME=boxops_staging \
E2E_DATABASE_URL='<neon DIRECT url for boxops_staging>' \
npm run test:e2e 2>&1 | head -20
```

Expected: `[e2e] Refusing to run against database "boxops_staging": it is on the forbidden
list.` — thrown before any statement runs. **Run this. It is the one test in this plan
whose failure would be unrecoverable in production.**

- [ ] **Step 5: Commit**

```bash
git add frontend/playwright.config.ts frontend/e2e/global-setup.ts frontend/e2e/env.ts
git commit -m "feat(e2e): run the journeys against a deployed environment

Remote mode boots no webServer, migrates through Neon's DIRECT endpoint, and
proves its refusal to touch boxops_staging before opening a connection.
15/15 local journeys unchanged."
```

---

### Task 9: Remote e2e in the pipeline

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: Task 8's remote harness; `NEON_ADMIN_DATABASE_URL`; the deployed Pages build.
- Produces: a `remote-e2e` job that runs after `deploy` and fails the run if the deployed
  environment is broken.

**The shape, and why:** the journeys must exercise the *deployed* frontend but must not
write to `boxops_staging`. So each run creates `crossfit_box_e2e_<runid>` on Neon, deploys
the **same image** as a second short-lived Fly app pointed at it, and lets
`pinApiOrigin()` route the deployed bundle's `/api` traffic there. Both are destroyed
afterwards, in an `always()` step.

A **separate app** rather than a second machine in `boxops-api-staging`: machines in one app
share the app hostname and requests round-robin across them, so an ephemeral machine would
serve real staging traffic from a throwaway database. A separate app has its own hostname
and cannot be reached by accident.

- [ ] **Step 1: [HUMAN] Reserve the ephemeral app and set the admin URL secret**

```bash
fly apps create boxops-api-e2e --org personal
gh secret set NEON_ADMIN_DATABASE_URL   # Neon DIRECT url, database boxops_staging
```

The admin URL connects to `boxops_staging` only to issue `CREATE DATABASE` / `DROP
DATABASE` (Postgres requires connecting to *some* database to do that, and it cannot be the
one being dropped). `neondb_owner` has `rolcreatedb = true`, verified 2026-08-21.

Also grant the existing deploy token access to the new app, or create a second one:

```bash
fly tokens create deploy --app boxops-api-e2e --name github-actions-e2e
gh secret set FLY_API_TOKEN_E2E
```

- [ ] **Step 2: Add the `remote-e2e` job**

```yaml
  remote-e2e:
    # The 15 journeys against the DEPLOYED environment: the real Pages bundle, a
    # real certificate, real network latency to Neon. A failure here is a
    # deployment failure.
    #
    # It never touches boxops_staging. Each run gets its own Neon database and
    # its own short-lived Fly app in front of it; the deployed bundle's /api
    # traffic is rewritten to that app by pinApiOrigin(). A separate APP rather
    # than a second machine in boxops-api-staging: machines in one app share a
    # hostname and round-robin, so an ephemeral machine would serve real traffic
    # from a throwaway database.
    needs: [deploy]
    if: github.ref == 'refs/heads/dev' && github.event_name == 'push'
    runs-on: ubuntu-latest
    timeout-minutes: 40

    env:
      RUN_ID: ${{ github.run_id }}
      E2E_APP: boxops-api-e2e

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - run: npm ci
        working-directory: frontend

      - uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Create the throwaway database
        # The name must match the pattern assertE2eDatabase() enforces:
        # crossfit_box_e2e_<7-40 lowercase alphanumerics>. A GitHub run id is
        # digits, so it qualifies.
        #
        # The URL for it is the admin URL with its path swapped — the admin URL
        # itself points at boxops_staging, because Postgres requires connecting
        # to SOME database to create another, and it cannot be the one being
        # dropped. That connection issues DDL and nothing else.
        #
        # ::add-mask:: before anything else is written, so the derived URL is
        # redacted in the log even though it is not literally a secret value.
        id: db
        run: |
          set -euo pipefail
          NAME="crossfit_box_e2e_${RUN_ID}"
          psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$NAME\""
          # Path-only substitution: everything up to the last '/' is preserved,
          # so credentials, host and query string travel unchanged.
          URL="${ADMIN_URL%%\?*}"
          QUERY="${ADMIN_URL#"$URL"}"
          DB_URL="${URL%/*}/${NAME}${QUERY}"
          echo "::add-mask::$DB_URL"
          echo "name=$NAME" >> "$GITHUB_OUTPUT"
          echo "url=$DB_URL" >> "$GITHUB_OUTPUT"
        env:
          ADMIN_URL: ${{ secrets.NEON_ADMIN_DATABASE_URL }}

      - name: Stand up the ephemeral API
        # --stage so the secrets land without triggering a deploy of the
        # PREVIOUS image; the deploy on the next line picks them up. Without it
        # `fly secrets set` deploys immediately and you get two deploys, the
        # first of them running the old code against the new database.
        run: |
          set -euo pipefail
          flyctl secrets set --app "$E2E_APP" --stage \
            DATABASE_URL="$E2E_DATABASE_URL" \
            DATABASE_MIGRATION_URL="$E2E_DATABASE_URL" \
            DATABASE_SSL=true \
            JWT_SECRET="$(openssl rand -base64 48)" \
            FRONTEND_URL='https://app.boxops.dev' \
            CORS_ORIGINS='https://app.boxops.dev' \
            PUBLIC_API_URL="https://$E2E_APP.fly.dev" \
            DISABLE_SCHEDULERS=true
          # Same Dockerfile, same fly.toml, same code — so its release_command
          # migrates the throwaway database exactly as staging's migrates its
          # own. --app overrides fly.toml's `app` key.
          flyctl deploy --remote-only --app "$E2E_APP"
        working-directory: backend
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN_E2E }}
          E2E_DATABASE_URL: ${{ steps.db.outputs.url }}

      - name: Wait for the ephemeral API
        run: |
          set -euo pipefail
          for i in $(seq 1 40); do
            if [ "$(curl -fsS https://$E2E_APP.fly.dev/health || true)" \
                 = '{"status":"ok","database":"up"}' ]; then
              echo "ephemeral API healthy"; exit 0
            fi
            sleep 5
          done
          echo "ephemeral API never became healthy"; exit 1

      - name: Install Chromium
        run: npx playwright install --with-deps chromium
        working-directory: frontend

      - name: Journeys against staging
        run: npm run test:e2e
        working-directory: frontend
        env:
          E2E_TARGET: remote
          # The DEPLOYED bundle, so this exercises the real Pages output, the
          # real certificate and real latency to Neon.
          E2E_WEB_URL: https://app.boxops.dev
          # But NOT staging's own API: pinApiOrigin() rewrites every /api
          # request from that bundle to the ephemeral app, which is what keeps
          # boxops_staging untouched despite the frontend being staging's.
          E2E_API_URL: https://boxops-api-e2e.fly.dev
          E2E_DB_NAME: ${{ steps.db.outputs.name }}
          # global-setup.ts migrates and truncates through this. Neon's direct
          # endpoint, because the admin URL it derives from is the direct one.
          E2E_DATABASE_URL: ${{ steps.db.outputs.url }}

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report-remote
          path: |
            frontend/playwright-report
            frontend/test-results
          retention-days: 7

      - name: Tear down
        # always(), because a leaked Fly machine bills by the hour and a leaked
        # Neon database counts against storage. Both destroys are idempotent.
        if: always()
        run: |
          set +e
          flyctl scale count 0 --app "$E2E_APP" --yes
          psql "${{ secrets.NEON_ADMIN_DATABASE_URL }}" \
            -c "DROP DATABASE IF EXISTS \"${{ steps.db.outputs.name }}\" WITH (FORCE)"
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN_E2E }}
```

- [ ] **Step 3: Validate the YAML and the job graph**

```bash
node -e "const y=require('yaml'),fs=require('fs');const d=y.parse(fs.readFileSync('.github/workflows/ci.yml','utf8'));console.log(Object.keys(d.jobs));console.log(d.jobs['remote-e2e'].needs)"
```

Expected: six jobs; `remote-e2e` needs `[ 'deploy' ]`.

- [ ] **Step 4: Push and observe a full run**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run the journeys against the deployed environment

Each run gets its own Neon database and its own short-lived Fly app; the
deployed bundle's /api traffic is pinned to it. A separate app rather than a
second machine, because machines in one app share a hostname and would serve
real staging traffic from a throwaway database. Teardown is always()."
git push
gh run watch
```

Expected: gates → `deploy` → `remote-e2e` green, 15/15. Then confirm nothing leaked:

```bash
fly machines list --app boxops-api-e2e
psql "$NEON_ADMIN_URL" -c "\l" | grep crossfit_box_e2e || echo "no leaked databases"
```

Expected: zero machines, no `crossfit_box_e2e_*` databases.

- [ ] **Step 5: Confirm staging's own data was untouched**

If Task 10 has already run, compare a row count in `boxops_staging` before and after a
`remote-e2e` run. If it has not, assert the table count and that `users` is still whatever
it was. Expected: identical. This is the guarantee the whole target refactor exists to
provide, and it should be measured once rather than assumed forever.

---

### Task 10: The staging seed

**Files:**
- Create: `scripts/staging-seed.sh`
- Create: `scripts/sql/staging-seed.sql`
- Modify: `scripts/README.md`

**Interfaces:**
- Consumes: a migrated, reachable `boxops_staging`.
- Produces: one demo gym with an owner, a coach, athletes, class types, spaces, plans and a
  fortnight of classes. Idempotent: safe to run twice.

**Constraints, from the spec:** run **manually and never from the pipeline**; **additive**,
modelled on `scripts/dev-db-populate-members.sh` and explicitly not on
`scripts/dev-db-reset.sh`, which TRUNCATEs; must survive a redeploy.

- [ ] **Step 1: Write the SQL**

`scripts/sql/staging-seed.sql`, modelled on the insert block in `scripts/dev-db-reset.sh`
(users → gyms → class_types → spaces → membership_plans → gym_staff → gym_memberships →
athlete_membership_plans → classes) but with **every insert `ON CONFLICT (id) DO NOTHING`**
and fixed UUIDs derived from a constant demo-gym id. That is what makes a second run a
no-op instead of a duplicate-key failure.

Reuse the bcrypt hash for `password123` already present in `dev-db-reset.sh` — staging is a
demo environment with no real data, and inventing a second credential nobody records is how
a demo becomes unusable. Classes are generated relative to `CURRENT_DATE` so the schedule is
never empty, and the script is re-runnable to refresh them.

- [ ] **Step 2: Write the wrapper, with a hard guard against the wrong database**

`scripts/staging-seed.sh`:

```bash
#!/usr/bin/env bash
#
# Seed the staging demo data. MANUAL ONLY — never call this from a workflow.
#
# The pipeline is forbidden to write application data (see the staging
# infrastructure spec): deploys run migrations and nothing else, so that no
# deploy can clobber a demo someone is mid-way through showing. This script is
# the deliberate exception a human runs once.
#
# ADDITIVE and idempotent: every insert is ON CONFLICT DO NOTHING against fixed
# ids, so a second run changes nothing. It never truncates. Contrast
# scripts/dev-db-reset.sh, which destroys everything.
#
# Usage:
#   STAGING_DATABASE_URL='<neon DIRECT url>' ./scripts/staging-seed.sh
set -euo pipefail

cd "$(dirname "$0")/.."

: "${STAGING_DATABASE_URL:?Set STAGING_DATABASE_URL to Neon's DIRECT url for boxops_staging}"

# Refuse anything but the staging database. The mirror image of
# assertE2eDatabase(): that guard keeps tests OUT of this database, and this one
# keeps the seed from landing anywhere else — including the dev database, where
# hand-seeded scenarios live.
ACTUAL="$(psql "$STAGING_DATABASE_URL" -Atc 'SELECT current_database()')"
if [ "$ACTUAL" != 'boxops_staging' ]; then
  echo "❌ Refusing to seed \"$ACTUAL\" — this script only seeds boxops_staging." >&2
  exit 1
fi

USERS_BEFORE="$(psql "$STAGING_DATABASE_URL" -Atc 'SELECT count(*) FROM users')"
echo "🌱 Seeding boxops_staging (currently $USERS_BEFORE users). Nothing is deleted."

psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/staging-seed.sql

USERS_AFTER="$(psql "$STAGING_DATABASE_URL" -Atc 'SELECT count(*) FROM users')"
echo "✅ Done. Users: $USERS_BEFORE → $USERS_AFTER"
echo "   Log in at https://app.boxops.dev — all demo passwords are password123"
```

- [ ] **Step 3: Prove it locally first, against a throwaway database**

Never debug a seed against the environment it is meant to populate.

```bash
docker compose exec -T postgres psql -U postgres -c 'CREATE DATABASE seed_check'
cd backend && DB_NAME=seed_check NODE_ENV=production npm run migration:run && cd ..
STAGING_DATABASE_URL='postgres://postgres:postgres@localhost:5432/seed_check' \
  ./scripts/staging-seed.sh
```

Expected: the guard **rejects it** — `Refusing to seed "seed_check"`. Good: that proves the
guard. Temporarily point the check at `seed_check` to exercise the SQL, run it twice, and
confirm the second run reports an unchanged user count. Then restore the guard to
`boxops_staging` before committing.

- [ ] **Step 4: Verify idempotence explicitly**

Run the seed twice against `seed_check` and diff the row counts:

```bash
for t in users gyms classes membership_plans gym_memberships; do
  echo -n "$t: "
  docker compose exec -T postgres psql -U postgres -d seed_check -Atc "select count(*) from $t"
done
```

Expected: identical counts after the first and second runs.

- [ ] **Step 5: [HUMAN] Seed staging for real**

```bash
STAGING_DATABASE_URL='<neon DIRECT url for boxops_staging>' ./scripts/staging-seed.sh
```

Expected: user count rises from 0. Then, in a browser at `https://app.boxops.dev`, log in
as the demo owner and confirm the gym, its plans and its schedule are all visible.

- [ ] **Step 6: Verify it survives a redeploy — the spec's own acceptance test**

```bash
cd backend && fly deploy --app boxops-api-staging
```

Then re-check the row counts and reload the app.
Expected: unchanged, and still visible. A deploy that changed them would mean something in
the pipeline writes application data, which is a global constraint violation.

- [ ] **Step 7: Clean up and commit**

```bash
docker compose exec -T postgres psql -U postgres -c 'DROP DATABASE seed_check'
git add scripts/staging-seed.sh scripts/sql/staging-seed.sql scripts/README.md
git commit -m "feat(scripts): a manual, idempotent staging seed

Additive and ON CONFLICT DO NOTHING, so a second run is a no-op, and guarded to
refuse any database but boxops_staging. Manual by design: no pipeline step may
write application data, so no deploy can clobber a demo mid-presentation."
```

---

### Task 11: Documentation synchronisation

**Files:**
- Modify: `context/PROJECT_STATE.md`
- Modify: `context/PRE_PROD_CHECKLIST.md`
- Modify: `docs/LOCAL_DEV.md`

`CLAUDE.md` makes this mandatory rather than optional: the next session starts from the
docs.

- [ ] **Step 1: Update `context/PROJECT_STATE.md`**

Mark phases 4–6 done with what was actually deployed and measured: the two origins, the Fly
region and why it differs from the spec, the Neon database and version, the job graph
(`backend`/`frontend`/`image`/`e2e` → `deploy` → `remote-e2e`), and the seed's manual-only
rule. Carry forward the still-open item: **CI's Lint step remains
`continue-on-error: true`** (921 errors, 253 not auto-fixable), so it is not a gate.

- [ ] **Step 2: Update `context/PRE_PROD_CHECKLIST.md`**

Staging is not production. Record what deliberately does **not** exist yet: backups, a
tested restore, monitoring, alerting, and a decision on whether production exposes
`/api-docs`. Add the deferred item from Task 3 — turning the Cloudflare proxy on for
`api.boxops.dev` with SSL mode Full (strict).

- [ ] **Step 3: Update `docs/LOCAL_DEV.md`**

Add the remote e2e invocation and the seed command, both with the warning that
`E2E_DATABASE_URL` must be Neon's **direct** endpoint and that the guard will refuse
`boxops_staging`.

- [ ] **Step 4: Commit**

```bash
git add context/PROJECT_STATE.md context/PRE_PROD_CHECKLIST.md docs/LOCAL_DEV.md
git commit -m "docs(state): staging is deployed; record what it is not"
```

---

## Final verification

Run all of it, in this order, and record the numbers:

- [ ] `cd backend && npx tsc --noEmit` — clean
- [ ] `cd backend && npm test` — 520+ green (Task 2 adds 3)
- [ ] `cd backend && npm run test:e2e` — 239+ green
- [ ] `cd backend && npm run schema:check` — ✓ in sync
- [ ] `cd frontend && npx tsc --noEmit` — clean
- [ ] `cd frontend && npm test` — 408+ green (Task 7 adds 9)
- [ ] `cd frontend && npm run test:e2e` — 15/15 local
- [ ] `curl -sS https://api.boxops.dev/health` → `{"status":"ok","database":"up"}`, verified TLS
- [ ] `curl -sS -o /dev/null -w '%{http_code}' https://app.boxops.dev/invite/x` → `200`
- [ ] A real login in a real browser at `https://app.boxops.dev`
- [ ] One full `ci` run on `dev`: six jobs, all green, `remote-e2e` 15/15
- [ ] `fly machines list --app boxops-api-e2e` → zero machines (nothing leaked)
- [ ] No `crossfit_box_e2e_*` databases left on Neon
- [ ] `boxops_staging` row counts unchanged by a `remote-e2e` run
- [ ] The dev database is untouched throughout — check the user count before and after

---

## Self-review notes

**Spec coverage.** Phase 4 → Tasks 1, 3, 4 (provision, first manual deploy, DNS,
certificates, secrets). Phase 5 → Tasks 5, 6 (pipeline), 7, 8, 9 (remote e2e and the target
refactor). Phase 6 → Task 10. The spec's `docs/DECISIONS.md` invariant from Phase 2 is
already recorded. Its four named GitHub secrets are all present, plus `FLY_API_TOKEN_E2E`,
which the spec did not anticipate because it did not foresee the second Fly app.

**Two deliberate departures from the spec, both argued above and ratified in
`context/DECISION_LOG.md`:** Fly `fra` rather than `mad`, and `boxops_staging` rather than
`crossfit_box_staging`.

**One departure the spec did not consider:** it describes remote e2e as "a second
short-lived Fly **machine**". This plan uses a second Fly **app**, because machines within
one app share the app's hostname and requests round-robin across them — an ephemeral
machine would therefore serve real staging traffic from a throwaway database, which is the
exact failure the topology exists to prevent.

**Known gap, stated rather than hidden.** `workers: 1` is untouched. The spec permits
raising it for the remote target, but only with measurements, and this plan deliberately
ships remote e2e serial first. Raising it is a separate change with numbers attached — the
same way the `--workers=4` regression (13.7 min and 14 failures against 3.0 min serial) was
established rather than assumed.
