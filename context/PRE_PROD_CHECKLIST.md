# Pre-Production Checklist

Items that must be resolved before production deployment.
This is a living document — add items as they surface during MVP development.

---

## Authentication & Authorization

- [x] Replace `JwtAuthGuard` stub with real JWT validation ✅ Epic A (2026-05-03)
- [x] Add role guard to `POST /api/gyms` ✅ Epic A (2026-05-03)
- [x] Enforce `gyms.status` on gym-scoped mutations ✅ 2026-08-14 — `GymStatusGuard` on every
      `:gymId` route + a check in `InviteService` for invite acceptance. Suspension is a
      read-only freeze (`docs/DECISIONS.md`). Before this, three handlers out of ~40 mutations
      checked status, so the rule held only where someone had remembered it.
- [ ] Make suspension **reachable** — nothing transitions a gym out of `active` in MVP; the
      platform-admin approve/suspend surface is Phase 2. The enforcement above ships first so
      the state is safe on the day something can set it.

## Data Safety

- [x] Auto-created users via coach invite should be set to `pending`, not `active` ✅ Epic A (2026-05-03)
- [x] User name must not default to email address — placeholder 'Coach' used until profile setup ✅ Epic A (2026-05-03)
- [x] Wrap user + staff creation in a single database transaction ✅ Epic A (2026-05-03)

## Staging Is Not Production (2026-08-21)

Staging is deployed and live — `https://api.boxops.dev` (Fly, `fra`) and
`https://app.boxops.dev` (Cloudflare Pages) against Neon `boxops_staging`. Everything below
deliberately does **not** exist yet. It is listed here so nobody mistakes a working staging
environment for a production-ready one.

- [ ] **Backups.** Neon's free tier retains a point-in-time window; nothing has been configured,
      and no retention period has been chosen against a stated recovery objective.
- [ ] **A *tested* restore.** Untested backups are not backups. Nobody has restored
      `boxops_staging` to a new branch and pointed an app at it.
- [ ] **Monitoring.** No uptime check, no dashboard, no log retention beyond what Fly and
      Cloudflare keep by default. The only automated signal that the deployment works is the
      `staging-smoke` CI job, which runs once per deploy and not on a schedule.
- [ ] **Alerting.** Nothing pages anyone. Staging can be down indefinitely and no one is told.
- [ ] **Decide whether production exposes `/api-docs`.** Swagger is currently public on
      `api.boxops.dev` and advertises every route and DTO. Acceptable for a demo environment,
      an unforced disclosure in production.
- [ ] **Turn the Cloudflare proxy on for `api.boxops.dev`, with SSL mode Full (strict).**
      Deferred from Task 3: the record is a grey cloud today because Fly terminates TLS itself
      and proxying it without Full (strict) would have downgraded the hop. Doing it properly
      buys DDoS absorption and hides the origin address.
- [ ] **The class lifecycle state machine is enforced by the application alone.** `classes.state`
      is a plain `varchar` — TypeORM's `enum:` is metadata with no Postgres enum type and no CHECK
      constraint behind it. Any direct SQL write can put a class into a state the state machine
      forbids, and the seed script writes SQL directly.

---

## Notes

- Header-based auth (`x-user-id`, `x-gym-id`) is **gone** as of 2026-08-14. It was
  intentional for early MVP/dev, then survived as a `NODE_ENV=development` bypass in
  `JwtAuthGuard` after JWT landed. Removed: it let the caller choose their own identity
  and gym, so every downstream identity and tenant check ran on caller-supplied values.
- JWT and role guards are now the only mechanism, dev included. Mint a dev token with
  `scripts/dev-token.sh <email>`.
- Security audit conducted 2026-04-21 — full findings in `context/DECISION_LOG.md`
