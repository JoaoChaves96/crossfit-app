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
