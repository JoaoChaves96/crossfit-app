# Staging Environment, Deploy Pipeline & Migration Baseline

**Date:** 2026-08-20
**Status:** Approved design, pending implementation plan
**Unblocks:** `epics/EMAIL_SERVICE_EPIC.md` (its hard prerequisite is a domain with DNS,
delivered by phase 4 here), and every future acceptance check that needs a real environment

---

## Problem

Nothing in this repository has ever been deployed. There is no CI, no container image, no
cloud configuration, and no production schema path. `docker-compose.yml` runs a single
local Postgres; the backend runs on `localhost:3000` and the frontend on an Expo dev
server pointed at a LAN address (`frontend/.env.local` → `EXPO_PUBLIC_API_BASE_URL`).

Three consequences, in ascending order of severity.

### 1. The email epic cannot start

`epics/EMAIL_SERVICE_EPIC.md` §3 identifies a domain with SPF, DKIM and DMARC as the hard
prerequisite — "without it, invites land in spam and the epic has failed even though the
code works". No domain exists. Its §5 *Done when* requires an invite arriving at a real
external address, which requires a reachable deployed backend. Both are infrastructure,
not application work, so the epic was blocked on this design rather than on any code.

The provider question (§3 recommends "SES if the app is already going to run on AWS,
Resend if it is not") could not be answered either, because there was no hosting decision
to key it off. That is now settled: not AWS, therefore Resend — see *Deferred decisions*.

### 2. There is no path from an empty database to the current schema

`backend/src/config/database.config.ts:46` sets `synchronize: process.env.NODE_ENV !==
'production'`, so every database that has ever existed — dev, e2e, and each Jest run — was
built by TypeORM `synchronize` from the 17 entities registered at `:27-45`.

The five files in `backend/src/migrations/` are incremental patches layered on top of that.
The oldest, `1746403200000-AddDurationToClasses.ts`, opens with `ALTER TABLE "classes"` —
a table no migration creates. They are also **not registered**: `databaseConfig` has no
`migrations` key, `package.json` has no migration script, and there is no production
`DataSource` (only `backend/test/helpers/e2e-database.ts`). Nothing has ever run them.

So a first deployment with `NODE_ENV=production` comes up against an empty database,
creates nothing, and fails on the first query.

### 3. An invariant silently stopped being enforced

`1786492800000-AddOneActiveMembershipPlanIndex.ts` creates a partial unique index in raw
SQL — `UNIQUE ON athlete_membership_plans ("gymMembershipId") WHERE status = 'active'` —
to guarantee that two concurrent plan assignments cannot each leave an active row. Its own
comment calls it "the only structural guarantee".

That index is **not declared on `AthleteMembershipPlanEntity`**. `synchronize` builds from
entities, and nothing runs migrations, so the index does not exist in the e2e database and
almost certainly not in the dev one. The guard is currently absent everywhere.

This is not an isolated bug — it is the failure mode of the whole arrangement. A construct
`synchronize` cannot express is invisible to the only mechanism that builds schemas, and
nothing detects the divergence. The baseline work below fixes this instance; the drift gate
prevents the class.

---

## Decisions taken

Recorded because each was chosen against alternatives, and re-litigating them later is
waste.

| Decision | Chosen | Rejected, and why |
|---|---|---|
| Purpose | One persistent staging environment, shaped so it can become production | "Just enough to unblock email" — risks infrastructure thrown away within weeks |
| Platform | Fly.io (API) + Neon (Postgres) + Cloudflare Pages (SPA) | Render-everything: ~2× cost once its time-limited free database expires, cold starts would corrupt e2e timings, and `CREATE DATABASE` rights were unconfirmed. Fly-everything: Fly Postgres is unmanaged, so backups become ours — a bad habit to carry into production. AWS: not cheap, and premature with nothing deployed |
| Region | Neon `eu-central-1`; Fly `mad` | US East is cheaper on some tiers but puts EU personal data (athlete names, emails, attendance) in the US. EU carries no price premium on these tiers, so there was no trade-off to make |
| Topology | One staging env + a throwaway database per e2e run | Per-PR ephemeral environments: markedly more pipeline engineering, and the place Neon branching would tempt us into lock-in. Two fixed environments: double cost, two configs to keep in step |
| Migration history | Squash the 5 migrations into one baseline | Preserving them: they only ever ran against local databases, nothing is deployed, so history has no value that git does not already hold |
| Domain | A neutral (non-brand) domain, bought at Cloudflare Registrar | Committing to a product name now — a naming decision driven by infrastructure rather than readiness. Free provider subdomains (`*.fly.dev`, `*.pages.dev`) — cannot pass SPF/DKIM/DMARC, so they fail to unblock email, which is the point |

### Portability rules

The platform choice is cheap to reverse only if these hold. They are requirements, not
preferences.

1. **Ship a Dockerfile, not a buildpack.** A container that runs on Fly runs unchanged on
   ECS, App Runner or Cloud Run. Buildpack auto-detection is the part that would have to be
   redone.
2. **Database access stays standard** — a `DATABASE_URL`, TLS, and migrations in the repo.
   Neon → RDS is then `pg_dump` and `pg_restore` plus a connection string.
3. **Provider configuration lives in the pipeline, never in `backend/` or `frontend/`.**
   Swapping Fly for ECS edits one workflow file and no application code.
4. **Neon database *branching* must not become load-bearing.** It is the most attractive
   feature for per-PR test isolation and has no AWS equivalent; depending on it would mean
   re-engineering test isolation during a migration. E2E isolation is therefore specified as
   "create a database, migrate, seed, drop", which works on Neon, on RDS, and on a laptop.
   If branching later makes that faster, it is an optimisation behind the same seam.

---

## Architecture

| Piece | Where | Notes |
|---|---|---|
| API | Fly app, region `mad`, 1× shared-cpu-1x / 512MB | `min_machines_running = 1`. No scale-to-zero: the three `@Cron` services must tick, and cold starts would make e2e timings unreliable |
| Frontend | Cloudflare Pages, SPA fallback | `npx expo export --platform web` → `dist/`. `app.json` already sets `web.output: "static"` |
| Database | Neon `eu-central-1`, database `crossfit_box_staging` | Role carries `CREATEDB` so CI can create throwaway e2e databases |
| Registrar + DNS | Cloudflare | `api.boxops.dev`, `app.boxops.dev`, and later the mail records at the root |

**The domain is `boxops.dev`**, bought at Cloudflare Registrar, pending purchase at phase 4.
Deliberately neutral rather than a brand: "box" is the community word for a CrossFit gym
without touching the trademark, and "ops" carries no product identity to regret. Chosen over
`boxops.app` because `app.boxops.dev` does not stammer and `.dev` is ~$2 cheaper.

Constraints it satisfies, recorded so a substitute would have to satisfy them too:

- Cloudflare Registrar sells at wholesale with no renewal hike, and co-locates registrar, DNS
  and Pages — the synergy that made this platform choice worth taking.
- **Not a cheap-reputation TLD** (`.xyz`, `.top`, `.online`). Spam filters weigh TLD
  reputation and the email epic's success depends on deliverability. `.dev` is a Google-run
  registry that mandates HTTPS and carries no such baggage.
- **Avoids the CrossFit trademark.** CrossFit LLC enforces it against unlicensed commercial
  use, so the existing `app.crossfitbox.com` placeholder in `invite.service.ts:86` is a
  liability, not a shortcut. The same rules out names colliding with shipped gym-software
  products.
- Yields a sane reverse-DNS bundle identifier: `dev.boxops.mobile`.

Verified unregistered by RDAP on 2026-08-20. RDAP reports registration, not price — if
Cloudflare quotes a premium at checkout, `boxlane.dev` and `gymops.dev` were free the same
day and satisfy the same constraints.

**Why the web target is permanent, not transitional.** Native iOS/Android will be added
later, but it does not replace Pages. An invite link must open for someone with no app
installed — that is what `/invite/<token>` is for — and the owner surface is desktop-shaped
(built and reviewed at 1280×832). Native is a second distribution channel consuming the same
source, added via EAS Build in its own epic.

The two intersect in our favour: for `https://app.boxops.dev/invite/<token>` to open an
installed app rather than a browser, the domain must serve `apple-app-site-association` and
`assetlinks.json` from its root. Pages serves both as static files, so hosting the SPA on the
domain we will deep-link into is a prerequisite satisfied for free rather than retrofitted.

### Stated constraints

- **Do not publish to the App Store or Play Store before the brand domain exists.** Bundle
  identifiers are permanent once a listing is live; publishing under the neutral domain means
  carrying that name forever or abandoning the listing. Native is out of scope for this epic,
  so honouring this costs nothing.
- **No step in the deploy pipeline may write application data.** Deploys run migrations only.
  Demo data reaches staging through a seed script run manually, once, deliberately outside the
  pipeline, so no deploy can clobber it.
- **The staging database is never written to by tests.** Every e2e run gets its own database.

---

## Phase 1 — Make the app deployable

No cloud account, no domain, no spend. Verifiable locally.

1. **`backend/Dockerfile`** (new) — multi-stage on `node:24-alpine`, runtime stage pruned to
   production dependencies. Node 24 to match the development machine (`node -v` → v24.8.0);
   an image on a different major than the one the tests pass under is a needless variable.
   `bcrypt` is a native module, so the builder stage needs `python3 make g++`; if that proves
   fragile, use `node:24-slim` instead. No `engines` field exists in `backend/package.json`;
   add one pinning that major.
2. **`GET /health`** (new) — there is no health route. `frontend/playwright.config.ts` waits
   on `/api-docs` as a proxy for readiness, which its own comment flags as a workaround. Fly
   needs a real check. Returns 200 plus a database ping.
3. **`database.config.ts`** — accept a `DATABASE_URL` (what Neon issues) in preference to the
   discrete `DB_*` variables, enable TLS via an explicit `DATABASE_SSL` flag (Neon requires it;
   local Postgres has no certificate, so this cannot be inferred from `NODE_ENV` without
   breaking one of the two), and register the `migrations` array.
   **Leave `synchronize: NODE_ENV !== 'production'` alone.** `frontend/e2e/env.ts`
   `e2eBackendEnv()` sets `NODE_ENV=test` *specifically* so synchronize builds the e2e schema;
   changing the rule here would break that suite for reasons unrelated to deployment. Phase 2
   moves e2e onto migrations deliberately and separately.
4. **`main.ts`** — CORS from a `CORS_ORIGINS` allowlist, falling back to today's allow-all
   only when unset (`main.ts:12-20` currently accepts every origin unconditionally, labelled
   "dev only"). Swagger's `addServer('http://localhost:3000')` (`:34`) comes from env.
   **`/api-docs` stays public on staging**: `npm run generate:api-types` reads
   `/api-docs-json`, and gating it would break the type-generation workflow that
   `CLAUDE.md` mandates. Whether production exposes it is deferred, not decided here.
5. **Delete the fake `FRONTEND_URL` default.** `invite.service.ts:86` falls back to
   `https://app.crossfitbox.com`, a domain nobody owns, so a missing variable silently mints
   dead invite links. Fail fast at boot, or fall back to localhost.
6. **`.env.example` for both apps** — neither exists, and after this there are eight variables
   that matter: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`, `PORT`,
   `DISABLE_SCHEDULERS`, `DATABASE_LOGGING`, `EXPO_PUBLIC_API_BASE_URL`.
7. **`frontend/app.json` identity** — `name`, `slug` and `scheme` are all still `"frontend"`,
   and there is no `ios.bundleIdentifier` or `android.package`. Set them from `boxops.dev` (`dev.boxops.mobile`).
   Five lines now; effectively irreversible after a store submission.

**Verification:** `docker run` serves the API against local Postgres and answers `/health`;
backend 508 unit tests and frontend 397 remain green; `tsc` clean on both.

No application behaviour changes and no domain module is touched.

---

## Phase 2 — The schema baseline

No cloud account. This is the highest-risk phase: a wrong baseline is a silently broken
environment rather than an error.

1. **`backend/src/data-source.ts`** (new) — a `DataSource` for the TypeORM CLI, reusing the
   entity list from `databaseConfig`. Add `migration:generate`, `migration:run`,
   `migration:revert` and `schema:log` scripts.
2. **Generate one `Baseline` migration** against an empty database, then delete the five
   existing files.
3. **Audit all five before deleting them.** Each must be sorted into *entity-declared, so the
   generated baseline covers it* or *raw SQL only, so it must be carried across by hand*. One
   is already known to be the latter: the partial unique index in
   `AddOneActiveMembershipPlanIndex` (see *Problem* §3). A generated baseline derives from
   entities and will omit it, and `schema:log` cannot flag the omission because TypeORM does
   not know the index should exist. The other four need checking, not assuming.
4. **Move local e2e onto migrations.** `e2eBackendEnv()` currently relies on synchronize; the
   e2e database becomes migration-built, so every e2e run exercises the migration path.

**Verification**, in increasing strength:

- `schema:log` against a migration-built database prints nothing. Objective, and it catches
  entity-vs-schema drift in general.
- The 15 Playwright journeys pass against a migration-built e2e database. If they do, the
  baseline is behaviourally equivalent to the schema every test has run against so far. This
  is the strongest proof available and reuses existing work.
- **A CI drift gate** asserting `schema:log` stays empty, so a future entity change cannot
  land without a migration.

### The schema workflow from here

| Environment | Schema built by |
|---|---|
| Local dev | `synchronize` — fast iteration, disposable database |
| Local e2e | migrations |
| CI throwaway e2e database | migrations |
| Staging | migrations, via Fly `release_command` |

Change an entity → `npm run migration:generate` → **read the generated SQL** → commit the
migration in the same pull request as the entity change. The reading step is not ceremony;
the partial-index case is precisely what generation gets wrong.

**New invariant to record in `docs/DECISIONS.md` during implementation:** any schema
construct not expressible as an entity decorator — partial indexes, check constraints,
triggers — must be hand-written in a migration and noted as such, because `schema:log` is
blind to it. This is the exact reason the one-active-plan guard silently ceased to exist.

---

## Phase 3 — CI

No cloud account. Two workflows, both hermetic.

- **`ci.yml`** — on every pull request and push: backend `tsc` + unit tests, frontend `tsc` +
  tests, lint, and the schema drift gate. The fast gate; it never touches the cloud.
- **`e2e.yml`** — Postgres as a service container, schema via `migration:run`, API and Expo
  web export booted, 15 journeys. Today's suite, moved to CI. It stays hermetic so a fork PR
  or a provider outage cannot block it. `forbidOnly: !!process.env.CI` in
  `playwright.config.ts` already anticipates this, as does its `github` reporter.

---

## Phase 4 — Provision

Requires accounts and spend. **Blocked on `boxops.dev` being bought.**

Buy the domain; create the Cloudflare, Fly and Neon accounts; provision the Neon project and
the Fly app; deploy once by hand before automating it; add the DNS records and certificates.

Four GitHub repository secrets, with scopes specified at implementation time: `FLY_API_TOKEN`,
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and a Neon admin `DATABASE_URL` (admin
because CI must `CREATE DATABASE`). Fly secrets carry the runtime configuration:
`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`, `NODE_ENV=production`.

Account creation and payment are the user's to do; every line of configuration is ours.

**Verification:** the staging URL is reachable, TLS valid on both names, and a real login
works from a real browser.

---

## Phase 5 — Deploy pipeline and remote e2e

**`deploy-staging.yml`**, on push to `dev`: build and push the API image → `fly deploy`, whose
`release_command` runs `migration:run` so a failed migration aborts the deploy instead of
serving a half-migrated schema → build the frontend with `EXPO_PUBLIC_API_BASE_URL` pointed at
staging (Expo inlines `EXPO_PUBLIC_*` at build time, so this is baked, not runtime) → publish
to Pages → run the journeys against the deployed environment. A failure there is a deployment
failure.

### Retargeting the e2e suite without weakening its safety guard

`frontend/e2e/env.ts` hard-codes `localhost:3001`, `localhost:8082` and
`E2E_DB_NAME = 'crossfit_box_e2e'`, and `assertE2eDatabase()` refuses anything else. That is
a deliberate mechanism with a documented cause: a predecessor suite truncated 15 tables in the
dev database, where hand-seeded manual-test scenarios live. **The guard is not loosened — what
it asserts changes.**

- `env.ts` gains a **target**: `local` (today's constants, the default) or `remote` (URLs and
  database name from the environment). The assertion becomes "the target must be the
  *designated* e2e target", so it still refuses to point at staging's own database — the
  modern form of the same mistake, and the one that would eat the demo data.
- Each run creates `crossfit_box_e2e_<sha>` on the Neon instance, migrates it, points a
  **second short-lived Fly machine** at it, runs the journeys, then drops both.
- `webServer` is dropped for the remote target — there is nothing to boot — and
  `pinApiOrigin()` (`e2e/fixtures.ts:42-52`) rewrites to the staging API origin instead of
  localhost.
- **`workers: 1` may finally be revisited, but only for the remote target.** The config's
  comment is correct that the shared Expo dev server is the constraint; against a static export
  on a CDN that constraint is gone. Two caveats: the ephemeral API is one 512MB machine, and
  the journeys share one database. Ship remote e2e serial first, measure, then raise workers as
  a separate change with numbers — the same way the `--workers=4` regression (13.7 min and 14
  failures, versus 3.0 min serial) was established rather than assumed.

Cost: one extra Fly machine and one extra Neon database per deploy, alive for minutes. This is
the phase with the most moving parts and the one most likely to need a second pass.

---

## Phase 6 — Demo data

An idempotent staging seed, modelled on `scripts/dev-db-populate-members.sh`, **run manually
and never from the pipeline**.

**Verification:** the demo data is visible in the deployed app and survives a redeploy.

---

## Out of scope

- **A production environment**, and with it backups, a tested restore, monitoring and
  alerting. These are production concerns; `context/PRE_PROD_CHECKLIST.md` is where they
  belong. The genuinely unrecoverable risk on this stack is data you did not back up, and it
  does not exist until real customer data does.
- **EAS / native builds**, store accounts (Apple $99/yr, Google $25 once), and push
  credentials for `expo-notifications`. Its own epic, with its own lead times.
- **Native test tooling** (Maestro, Detox). Playwright is web-only.
- **Per-PR ephemeral environments.**
- **The email epic itself.** Phase 4 delivers its prerequisite; `EMAIL_SERVICE_EPIC.md` picks
  up as the next epic.

## Deferred decisions

- **Whether production exposes `/api-docs`.** Staging keeps it public because
  `generate:api-types` depends on it.
- **Mail provider.** This design settles the input the email epic was missing: hosting is not
  AWS, so by `EMAIL_SERVICE_EPIC.md` §3's own rule the answer is **Resend**, not SES. Confirm
  at signup — its prices predate May 2026. SES remains one adapter file away, because that
  epic already specifies a provider-agnostic port.
- **Raising `workers` for remote e2e.** Requires measurement, not a guess.
- **The brand domain.** Moving to it costs an afternoon of configuration plus the second
  domain: `FRONTEND_URL`, `CORS_ORIGINS`, `EXPO_PUBLIC_API_BASE_URL`, a new certificate, the
  Pages custom domain, DNS, and DKIM re-verification. Old invite links are handled by keeping
  the neutral domain and 301-redirecting it; invites expire in 7 days, so the window is small.
  Sender reputation restarts, which is negligible at ~50 invites a month.
