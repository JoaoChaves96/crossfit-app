# Pre-Production Checklist

Items that must be resolved before production deployment.
This is a living document — add items as they surface during MVP development.

---

## Authentication & Authorization

- [x] Replace `JwtAuthGuard` stub with real JWT validation ✅ Epic A (2026-05-03)
- [x] Add role guard to `POST /api/gyms` ✅ Epic A (2026-05-03)

## Data Safety

- [x] Auto-created users via coach invite should be set to `pending`, not `active` ✅ Epic A (2026-05-03)
- [x] User name must not default to email address — placeholder 'Coach' used until profile setup ✅ Epic A (2026-05-03)
- [x] Wrap user + staff creation in a single database transaction ✅ Epic A (2026-05-03)

---

## Notes

- Header-based auth (`x-user-id`, `x-gym-id`) is **gone** as of 2026-08-14. It was
  intentional for early MVP/dev, then survived as a `NODE_ENV=development` bypass in
  `JwtAuthGuard` after JWT landed. Removed: it let the caller choose their own identity
  and gym, so every downstream identity and tenant check ran on caller-supplied values.
- JWT and role guards are now the only mechanism, dev included. Mint a dev token with
  `scripts/dev-token.sh <email>`.
- Security audit conducted 2026-04-21 — full findings in `context/DECISION_LOG.md`
