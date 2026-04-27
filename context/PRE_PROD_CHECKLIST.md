# Pre-Production Checklist

Items that must be resolved before production deployment.
This is a living document — add items as they surface during MVP development.

---

## Authentication & Authorization

- [ ] Replace `JwtAuthGuard` stub with real JWT validation (currently accepts any `x-user-id` header with hardcoded fallback `'user-123'`)
- [ ] Add role guard to `POST /api/gyms` — currently any user can create a gym (privilege escalation)

## Data Safety

- [ ] Auto-created users via coach invite should be set to `pending`, not `active` (no credentials yet)
- [ ] User name must not default to email address — use a placeholder until the user fills in their profile
- [ ] Wrap user + staff creation in a single database transaction — partial failure currently leaves orphaned users

---

## Notes

- Header-based auth (`x-user-id`, `x-gym-id`) is intentional for MVP/dev and is not a bug
- JWT and role guards are the production replacement for that mechanism
- Security audit conducted 2026-04-21 — full findings in `context/DECISION_LOG.md`
