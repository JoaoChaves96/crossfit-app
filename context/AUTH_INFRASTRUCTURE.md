# Auth Infrastructure Initiative

**Status:** Planned (pre-MVP launch)  
**Scope:** Whole backend (not Gym Owner MVP specific)  
**Target:** Before production launch  

---

## Objective

Replace header-based auth (`x-user-id`, `x-gym-id` headers) with proper JWT validation across the entire backend.

This is **not** part of the Gym Owner MVP epic — it's foundational work that unblocks production-ready deployment.

---

## Current State

### What We Have (MVP/Dev)
- Header-based auth: `x-user-id`, `x-gym-id` headers read directly
- `JwtAuthGuard` is a stub — accepts any header, falls back to `'user-123'`
- No role guards on endpoints
- Works fine for local dev and testing
- All existing tests use header-based auth
- Athlete MVP works fully with this system

### Why It's Fine for MVP
- Feature validation doesn't require real auth
- Local testing doesn't need security
- It's documented as intentional and dev-only
- Athlete flow is complete and works

### Why It Must Change for Production
- No token validation = anyone can impersonate anyone
- No role guards = privilege escalation (any user can create gym)
- No audit trail
- Doesn't meet basic security standards

---

## Scope (Before Production)

### Must Fix
1. **JWT Validation** — Replace stub with real JWT validation logic
2. **Role Guards** — Add `@Roles()` guards to all endpoints
3. **Token Issuance** — Auth endpoint that issues real JWT tokens (login)
4. **User State** — Define and enforce user states: pending, active, inactive
5. **Test Auth Flow** — E2E tests with token issuance → validation

### Out of Scope (not blocking launch)
- OAuth/social login
- MFA
- Token refresh/expiry fine-tuning
- Session management
- Logout endpoints (can be added later)

---

## Affected Endpoints

All endpoints across all roles need JWT validation:

### Athlete Endpoints
- `GET /api/classes` — list classes (scoped to gym + membership)
- `POST /api/classes/:classId/bookings` — book class
- `GET /api/my-bookings` — view own bookings
- `DELETE /api/bookings/:bookingId` — cancel booking
- `POST /api/bookings/:bookingId/attendance` — log attendance

### Coach Endpoints (future, but must plan for)
- `GET /api/gyms/:gymId/classes` — list gym's classes
- `PATCH /api/classes/:classId/attendance` — mark attendance
- etc.

### Gym Owner Endpoints (Gym Owner MVP)
- `POST /api/gyms` — create gym
- `POST /gym-configuration/spaces` — add space
- `POST /gym-configuration/class-types` — add class type
- `POST /api/gyms/:gymId/classes` — create class
- `POST /api/gyms/:gymId/configuration/coaches` — invite coach

### Platform Admin Endpoints (future)
- TBD

---

## Technical Tasks

| Task | Est. Time | Notes |
|------|-----------|-------|
| Implement JWT token issuance (login endpoint) | 3h | Generate tokens with user claims (id, role, gym) |
| Implement real JWT validation in guard | 2h | Validate signature, expiry; extract claims |
| Add role decorators + guard to all endpoints | 4h | Mark endpoints with `@Roles(Role.ATHLETE, Role.COACH, ...)` |
| Update test fixtures to use real tokens | 4h | Generate test tokens in test setup; retire header mocking |
| Update frontend to store and send tokens | 3h | Handle login → store token → send in Authorization header |
| E2E tests for auth failure cases | 2h | Expired token, invalid token, wrong role, missing token |
| **Total** | **~18h** | Can be parallelized; ~2-3 days with 2 people |

---

## Dependencies

This work must be done **before** production launch, but **after** the Gym Owner MVP is feature-complete.

**Blocking:** Nothing — this doesn't block Gym Owner MVP development.  
**Blocked by:** Nothing — can start anytime.  
**Affects:** All frontend code (must be updated to handle tokens).

---

## Acceptance Criteria

- [ ] JWT token issuance works (login endpoint)
- [ ] All endpoints validate JWT tokens
- [ ] All endpoints enforce role-based access
- [ ] All tests use real tokens (no header-based auth in tests)
- [ ] E2E tests cover auth failure cases (expired, invalid, wrong role, missing)
- [ ] Frontend sends tokens in Authorization header
- [ ] No security warnings on code review
- [ ] Manual flow: login → create gym → schedule class → book class (as different roles)

---

## Timeline

This is separate from Gym Owner MVP timeline. Recommend:

1. **Phase 1:** Gym Owner MVP (feature-complete, security audit fixes)
2. **Phase 2:** Auth Infrastructure (JWT implementation, role guards)
3. **Phase 3:** Launch (manual testing, bug fixes)

**Not tied to 2026-05-05** — ship when ready.

---

## Notes

- This is infrastructure work, not a feature
- It affects the entire codebase, not just one epic
- It's best done as a focused, separate effort
- Test coverage is critical — auth bugs are silent and dangerous
- Coordinate with frontend team (token handling)
