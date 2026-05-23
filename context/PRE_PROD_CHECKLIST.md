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

- Header-based auth (`x-user-id`, `x-gym-id`) is intentional for MVP/dev and is not a bug
- JWT and role guards are the production replacement for that mechanism
- Security audit conducted 2026-04-21 — full findings in `context/DECISION_LOG.md`
