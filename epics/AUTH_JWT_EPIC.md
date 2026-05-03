# EPIC: JWT Authentication Infrastructure

**Status:** 🔄 NOT STARTED  
**Start Date:** TBD  
**Owner:** Backend team  
**Replaces:** `context/AUTH_INFRASTRUCTURE.md` (now superseded by this epic)

---

## Objective

Replace the header-based auth stub with real JWT authentication across the entire backend.

This epic is **backend-only** — no new screens, no frontend token handling, no invite flows. Those are covered in subsequent epics. The goal is a hardened backend that validates real tokens, enforces roles, and rejects unauthenticated or unauthorised requests.

When this epic is complete, the dev bootstrap and header stub remain usable in local dev (via a dev-only bypass mode) but all production paths require a valid JWT.

---

## Current State

- `JwtAuthGuard` reads `x-user-id` and `x-gym-id` headers and allows all requests through
- `CurrentUser` decorator falls back to hardcoded `'user-123'`
- `CurrentGym` decorator falls back to hardcoded `'gym-123'`
- `RolesGuard` exists and is wired but depends on the stub for user identity
- `UserEntity` already has `passwordHash`, `status` (`pending | active | inactive`) — the data model is ready
- All existing E2E tests use header-based auth

---

## Scope

### Included
- JWT token issuance (login endpoint)
- Real JWT validation in `JwtAuthGuard`
- Role guards applied to all existing endpoints
- `CurrentUser` and `CurrentGym` decorators reading from JWT claims
- Password hashing on user creation (bcrypt)
- Update all E2E tests to use real tokens
- Dev-only bypass mode so local dev doesn't break

### Excluded
- Login/register screens (Epic B — Auth Flows)
- Frontend token storage and handling (Epic B)
- Invite flow and email delivery (Epic C — Invite & Onboarding)
- OAuth / social login
- Token refresh / expiry fine-tuning
- Logout endpoint

---

## JWT Token Design

Tokens are signed with a shared secret (env var `JWT_SECRET`).

**Claims:**
```json
{
  "sub": "<userId>",
  "email": "<email>",
  "gymId": "<activeGymId>",
  "role": "athlete | coach | owner",
  "iat": "<issuedAt>",
  "exp": "<expiry>"
}
```

**Expiry:** 7 days for MVP (no refresh token needed yet).

`gymId` in the token represents the user's active gym context. For users who belong to multiple gyms this will need to be re-issued when switching gym — deferred to a later epic.

---

## Backend Tasks

### Task #1: Login endpoint — `POST /api/auth/login`
**Agent:** backend-developer | **Type:** FEATURE

Create the login endpoint. Accepts `email` and `password`. Validates credentials against `UserEntity.passwordHash` (bcrypt compare). Returns a signed JWT with the claims above. The active `gymId` in the token is the first gym the user belongs to (owner or staff).

On failure: 401 with a generic message — never reveal whether the email exists.

New files:
- `backend/src/api/auth/auth.controller.ts`
- `backend/src/api/auth/auth.module.ts`
- `backend/src/api/auth/dto/login.dto.ts`
- `backend/src/api/auth/dto/login-response.dto.ts`
- `backend/src/domain/auth/auth.service.ts`

Install: `@nestjs/jwt`, `bcrypt`, `@types/bcrypt`

### Task #2: Real JWT validation in `JwtAuthGuard`
**Agent:** backend-developer | **Type:** REFACTOR

Replace the header-reading stub in `JwtAuthGuard` with real JWT validation:
- Extract Bearer token from `Authorization` header
- Verify signature against `JWT_SECRET` env var
- Verify expiry
- Populate `request.user` with decoded claims (`{ id, email, gymId, role }`)
- Return 401 for missing, expired, or invalid tokens

**Dev bypass:** if `NODE_ENV === 'development'` and no `Authorization` header is present, fall back to reading `x-user-id` / `x-gym-id` headers as before. This keeps the dev bootstrap working without a token during local development.

Update `CurrentUser` and `CurrentGym` decorators to read from `request.user` (populated by the guard) with no hardcoded fallbacks outside dev mode.

### Task #3: Apply role guards to all endpoints
**Agent:** backend-developer | **Type:** REFACTOR

Audit every controller and apply the correct `@Role()` decorator to every endpoint. Reference table:

| Endpoint | Required Role |
|---|---|
| `POST /api/gyms` | none (any authenticated user — gym creation is open) |
| `POST /api/gyms/:gymId/classes` | `owner` |
| `GET /api/gyms/:gymId/schedule` | `owner` |
| `POST /gym-configuration/spaces` | `owner` |
| `POST /gym-configuration/class-types` | `owner` |
| `POST /api/gyms/:gymId/configuration/coaches` | `owner` |
| `GET /api/gyms/:gymId/configuration/coaches` | `owner` |
| `GET /api/gyms/:gymId/coach/classes` | `coach` |
| `GET /api/gyms/:gymId/classes/:classId/programming` | `coach` or `owner` |
| `POST /api/gyms/:gymId/classes/:classId/programming` | `coach` |
| `GET /api/gyms/:gymId/classes/:classId/bookings` | `coach` or `owner` |
| `POST /api/gyms/:gymId/classes/:classId/attendance` | `coach` |
| `GET /api/gyms/:gymId/classes/:classId/results` | `coach` or `owner` |
| `POST /api/gyms/:gymId/classes/:classId/transition` | `coach` or `owner` |
| All athlete endpoints | `athlete` |

### Task #4: Password hashing on user creation
**Agent:** backend-developer | **Type:** BUG_FIX

Coach invite currently creates users with `passwordHash: null`. Fix the invite handler to:
- Generate a random temporary password and hash it with bcrypt (user will reset via invite flow in Epic C)
- Set user status to `pending` (not `active`) — the user has no credentials yet
- Wrap user + gym_staff creation in a database transaction — partial failure currently leaves orphaned records (flagged in `PRE_PROD_CHECKLIST.md`)

### Task #5: Update all E2E tests to use real tokens
**Agent:** backend-developer | **Type:** TEST_ONLY

Create a test helper that generates valid signed JWTs for each role. Replace all `x-user-id` / `x-gym-id` header usage in E2E tests with `Authorization: Bearer <token>`. Tests must still pass with the real `JwtAuthGuard`.

The dev bypass (Task #2) must NOT be active in the test environment (`NODE_ENV=test`).

---

## Dependencies

```
Task #1 (login endpoint) ──────────────────────────────────────────┐
Task #2 (JWT validation) ──────────────────────────────────────────┼→ Task #5 (update E2E tests)
Task #3 (role guards) ─────────────────────────────────────────────┘
Task #4 (password hashing) ─── independent, can run in parallel
```

Tasks #1, #2, #3, #4 can all run in parallel. Task #5 depends on all of them.

---

## Acceptance Criteria

- [ ] `POST /api/auth/login` issues a valid JWT for correct credentials
- [ ] `POST /api/auth/login` returns 401 for wrong credentials
- [ ] All endpoints reject requests with missing or invalid tokens (except in dev bypass mode)
- [ ] All endpoints enforce the correct role — wrong role returns 403
- [ ] `CurrentUser` and `CurrentGym` read from JWT claims with no hardcoded fallbacks
- [ ] Coach invite creates users with `status: pending` and `passwordHash` set
- [ ] User + staff creation is wrapped in a transaction
- [ ] All existing E2E tests pass using real JWT tokens
- [ ] Dev bootstrap still works locally via the `NODE_ENV=development` header bypass

---

## Pre-Prod Checklist Items Resolved

When this epic is complete, mark the following as done in `context/PRE_PROD_CHECKLIST.md`:
- [ ] Replace `JwtAuthGuard` stub with real JWT validation
- [ ] Add role guard to `POST /api/gyms`
- [ ] Auto-created users via coach invite set to `pending`
- [ ] User name must not default to email address
- [ ] Wrap user + staff creation in a single database transaction

---

## References

- **Supersedes:** `context/AUTH_INFRASTRUCTURE.md`
- **Pre-prod items:** `context/PRE_PROD_CHECKLIST.md`
- **User entity:** `backend/src/domain/user/entities/user.entity.ts`
- **Current auth stub:** `backend/src/auth/guards/jwt-auth.guard.ts`
- **Roles guard:** `backend/src/auth/guards/roles.guard.ts`
- **Next epic:** `epics/AUTH_FLOWS_EPIC.md` (login/register screens, frontend token handling)
