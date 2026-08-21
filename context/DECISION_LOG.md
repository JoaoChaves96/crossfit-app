# Decision Log

## Auth Model

- JWT bearer auth everywhere, including local dev (2026-08-14)
- Identity comes only from a verified token; no header ever names the acting user
- Superseded: header-based auth (x-user-id, x-gym-id), and the dev-only bypass that
  outlived it

## Booking State

- Derived by merging:
  - class schedule
  - /api/me/bookings
- Never inferred from capacity

## Cancel Booking

- bookingId comes only from bookings query
- DELETE has no body
- URL param is source of truth

## Alerts

- Centralized cross-platform helper
- No direct Alert.alert usage in screens

## Next Feature Phase: Minimal Gym Owner (2026-04-21)

**Decision:** Build Minimal Gym Owner MVP next instead of full Gym Owner or Coach features.

**Rationale:**
- Unblocks all remaining features (Coach can't work without gyms/classes)
- Enables B2B: Gym owners can self-serve create gym, schedule classes, invite coaches
- Backend already fully designed; endpoints exist for all Minimal Gym Owner operations
- Faster to ship (2-3 weeks) than full Gym Owner (4-8 weeks)
- Sets up Coach features as natural Phase 2

**Scope (Minimal):**
- Create/configure gym (1 screen)
- Create/schedule classes (1 screen)  
- Invite coaches (modal or simple screen)
- Skip: Member management, billing, analytics (Phase 3)

**No refactoring risk:** Frontend screens are isolated; backend API contract already established.

---

## Security Audit Results (2026-04-21)

**Status:** CRITICAL findings require fixes before frontend work proceeds.

**Summary:**
- 2 CRITICAL issues (no auth, no role guard on gym creation)
- 3 HIGH issues (auto-created users, data leakage, transaction safety)
- 3 MEDIUM/LOW issues (input validation, error handling, test coverage)

**Full audit:** Run security-review agent on backend/src/api/gym/ and backend/src/commands/gym/

**CRITICAL Issues:**
1. `JwtAuthGuard` accepts any `x-user-id` header + hardcoded fallback `'user-123'` → no auth
2. `POST /api/gyms` has no `RolesGuard` → any user becomes gym owner (privilege escalation)

**Blocker Decision:** Frontend cannot safely integrate until gym creation endpoint has real auth and role guard.

**Recommended Action:** Fix CRITICAL + HIGH issues before spawning frontend developers (1-2 day effort estimated).

---

## Staging Provisioning: Fly `fra`, not `mad` (2026-08-21)

**Decision:** The staging API runs in Fly region **`fra`**, superseding the
`mad` named in `docs/superpowers/specs/2026-08-20-staging-infrastructure-design.md`.

**Rationale:** The spec's region choice was reasoned only on data residency ("keep EU
personal data in the EU"), which both regions satisfy equally. Application-to-database
latency was never weighed, because no database existed yet. Neon now does exist, in
`eu-central-1` (AWS Frankfurt), and a Neon project's region is fixed at creation. `fra`
is the same city as the database (~1-3ms); `mad` is ~25-30ms away, paid on *every* query,
so a request making ten ORM round-trips would inherit ~300ms of pure network. User-facing
latency from Iberia differs negligibly between the two. Co-locating with the database is
therefore free.

**Consequence:** `fly.toml` declares `primary_region = "fra"`. The spec's text stands as
the historical record of an approved design; this entry is the correction.

## Staging Database Is `boxops_staging` (2026-08-21)

**Decision:** The Neon database is **`boxops_staging`**, not the `crossfit_box_staging`
the staging spec names. The role is `neondb_owner`, PostgreSQL **15.19**, region
`eu-central-1`.

**Rationale:** The name follows the bought domain (`boxops.dev`) rather than the CrossFit
trademark the project is deliberately moving away from in anything externally visible.
The version is deliberate parity with the `postgres:15-alpine` used by
`docker-compose.yml` and both CI workflows, so the schema-drift gate compares like with
like.

**Do not "fix" the database to match the spec.** The spec is stale on this point.

**Verified, and load-bearing:** `neondb_owner` has `rolcreatedb = true` (and is not
superuser). The design's throwaway-database-per-e2e-run topology depends on that right;
it is now confirmed rather than assumed.

## Neon Add-Ons Are Declined (2026-08-21)

**Decision:** Neon Auth, the Neon Data API, and any other provider add-on stay off.

**Rationale:** The application owns authentication end to end (`UserEntity`, bcrypt, JWT
issuance, role guards, `GymStatusGuard`, invites). Neon Auth would provision its own
schema objects, which is noise in exactly the `npm run schema:check` drift gate built to
make schema truth trustworthy. Together with Neon branching, add-ons are the platform's
real lock-in vectors; the standing rule is that everything stays portable to RDS.

## Staging TLS Is Encrypted But Not Yet Authenticated (2026-08-21)

**Known limitation, recorded so it is not mistaken for a solved problem.**
`sslmode` and `channel_binding` in a Neon connection URL are **libpq** parameters that
`node-postgres` silently ignores. TLS comes from `DATABASE_SSL=true`, which
`buildDatabaseConfig` turns into `ssl: { rejectUnauthorized: false }` — the traffic is
encrypted, but the server certificate is not verified, so a machine-in-the-middle between
Fly and Neon would not be detected. Closing this means pinning Neon's CA and setting
`rejectUnauthorized: true`; it is a deliberate decision for the phases 4-6 plan.

## `api.boxops.dev` Is Unproxied (2026-08-21)

**Decision:** The `api` CNAME to Fly is **DNS only** (grey cloud), not proxied.

**Rationale:** Fly issues and renews its own Let's Encrypt certificate via ACME
validation against the hostname. The Cloudflare proxy terminates TLS itself and
answers the challenge, so the Fly certificate never leaves `Awaiting
configuration` while the browser sees a Cloudflare error. Turning the proxy on
is possible *after* Fly holds a valid certificate, with SSL mode Full (strict) —
it buys WAF and DDoS absorption and hides the origin, and it is deferred rather
than rejected. `app.boxops.dev` is the opposite: Pages is proxied by nature.

**Verified 2026-08-21:** `api.boxops.dev` resolves to `66.241.125.76` (Fly, not a
Cloudflare edge address), the certificate reached `Status = Issued` within 15s of
`fly certs create`, and `GET https://api.boxops.dev/health` returns
`{"status":"ok","database":"up"}` behind an `issuer=Let's Encrypt` certificate
for `CN=api.boxops.dev`.
