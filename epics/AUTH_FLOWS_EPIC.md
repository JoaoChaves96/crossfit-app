# EPIC: Auth Flows (Epic B)

**Status:** ✅ COMPLETE  
**Owner:** Frontend team (backend assist)  
**Depends on:** `epics/AUTH_JWT_EPIC.md` — ✅ Complete  
**Next epic:** `epics/INVITE_ONBOARDING_EPIC.md` (Epic C — Invite & Onboarding)

Login and self-registration shipped: `POST /api/auth/register` exists alongside `login`,
`frontend/app/login.tsx`, `register.tsx` and `no-gym.tsx` are live, every screen goes through the
shared API client, and unauthenticated navigation is guarded.

**Password reset is not part of this epic and never was** — it is scoped separately in
`epics/PASSWORD_RESET_EPIC.md`, which is where a forgotten password is handled. It was excluded here
because there was no way to email anyone; that constraint is gone now that
`epics/EMAIL_SERVICE_EPIC.md` shipped the mail seam.

**Three notes for anyone reading this as a record rather than a brief:**

1. **The shipped paths differ from the plan below.** The auth context and API client landed as
   `frontend/hooks/useAuth.ts`, `hooks/useApiClient.ts`, `utils/api-client.ts` and `utils/storage.ts`,
   not the `frontend/src/context/…` / `frontend/src/lib/…` layout Task #3 proposed. The code is the
   truth; the task text is left as written for history.
2. **The design references in Tasks #1 and #4–#6 are retired.** Pencil, `.pen` files and the
   `ux-designer` agent are no longer how design works here — see `frontend/DESIGN.md` and the
   `impeccable` skill. Do not treat `designs/auth-screens.pen` as a specification.
3. **The dev bootstrap credentials below are wrong.** `frontend/app/dev-bootstrap.tsx` ships
   `owner@example.com` / `coach@example.com` / `athlete@example.com` with password `password123`,
   and gates itself on `__DEV__` rather than `NODE_ENV`.

---

## Objective

Give real users a way to authenticate. This epic adds the login and register screens,
wires up frontend token storage, and protects all navigation behind auth.

When this epic is complete:
- Unauthenticated users land on the login screen
- Athletes can self-register with email + password + name
- After login, users are routed to the correct home screen for their role
- All API calls automatically carry the Bearer token
- The dev bootstrap screen shows one-tap sample accounts instead of raw credentials

---

## Current State

*(As at the start of the epic. All five lines are now resolved — see the Status section.)*

- Backend has `POST /api/auth/login` — issues real JWTs
- All endpoints require a valid Bearer token (JWT guard + role guard)
- Frontend still makes API calls with no auth headers — will break in production
- No login or register screens exist
- Dev bootstrap screen uses header stub — needs updating for the JWT era

---

## Scope

### Included
- `POST /api/auth/register` backend endpoint (athlete self-registration)
- Login screen (all roles — single shared screen)
- Register screen (athletes only)
- Auth context: token storage, session restore on app start
- API client: attach Bearer token to all requests automatically
- Navigation guard: redirect unauthenticated users to login
- Role-based routing after login (owner → schedule dashboard, coach → my classes, athlete → class schedule)
- Updated dev bootstrap screen: sample user cards, one-tap login

### Excluded
- Invite flow and email delivery (Epic C)
- Password reset / forgot password — now its own epic, `epics/PASSWORD_RESET_EPIC.md`
- OAuth / social login
- Token refresh

---

## Register Endpoint Design

### `POST /api/auth/register`

Request:
```json
{ "email": "...", "password": "...", "name": "..." }
```

Response (200):
```json
{ "accessToken": "..." }
```

- Creates a `UserEntity` with `status: active` and bcrypt-hashed password
- No gym association — the user exists but belongs to no gym yet
- Returns a signed JWT immediately (user is logged in after registration)
- 409 if email already exists (safe message — does not reveal account details)
- 400 for validation errors (missing fields, weak password)

The JWT claims at registration: `{ sub, email, gymId: null, role: null }`. Frontend must
handle the null gym/role state (show an empty "you're not in a gym yet" screen for athletes).

---

## Frontend Architecture

### Auth Context

A React context (`AuthContext`) that wraps the entire app and exposes:
- `token: string | null`
- `user: { id, email, role, gymId } | null`
- `login(token: string): void` — store token, decode claims, update state
- `logout(): void` — clear token and state, redirect to login
- `isAuthenticated: boolean`
- `isLoading: boolean` — true while restoring session on app start

Token storage: `expo-secure-store` on native, `AsyncStorage` on web (Expo handles the
platform difference via a thin wrapper).

On app start: read token from storage → check expiry → if valid restore session,
if expired clear and redirect to login.

### API Client

A central `apiClient` utility (wrapping fetch or axios) that:
- Reads the token from `AuthContext`
- Attaches `Authorization: Bearer <token>` to every request
- Handles 401 responses by calling `logout()` and redirecting to login

All existing API calls in screens must migrate to use `apiClient` instead of raw fetch.

### Navigation Guard

In the root `_layout.tsx`: if `!isAuthenticated && !isLoading`, redirect to `/login`.

After login, route by role:
- `owner` → `/(tabs)/schedule`
- `coach` → `/coach-classes`
- `athlete` → `/(tabs)/schedule`
- `null` (just registered, no gym) → `/no-gym` (simple screen: "You're not in a gym yet. Ask your gym owner for an invite.")

### Dev Bootstrap Screen Update

Replace the raw header fields with a list of sample user cards. Each card shows a role
label and display name. Tapping a card calls `POST /api/auth/login` with hardcoded dev
credentials and stores the resulting token via `AuthContext.login()`.

Sample accounts (seeded in dev DB — see bootstrap setup):
- Owner — owner@dev.com / devpassword
- Coach — coach@dev.com / devpassword
- Athlete — athlete@dev.com / devpassword

The screen is only reachable in `NODE_ENV=development`. In production it does not exist
in the navigation stack.

---

## Tasks

### Task #1: UX Design — Login, Register, No-Gym screens — 🗑 RETIRED (Pencil)
**Agent:** ux-designer | **Type:** FEATURE

Design the following screens in `designs/auth-screens.pen` (auth screens are
role-agnostic and live in their own file to accommodate future flows like forgot
password and reset password):

- **Login** — email + password fields, submit button, link to Register
- **Register** — name + email + password fields, submit button, link to Login
- **No Gym** — empty state: message explaining the user is not in a gym yet, no actions

Use existing screens in `designs/athlete-screens.pen` as style reference.

### Task #2: Backend — Register endpoint — ✅ DONE
**Agent:** backend-developer | **Type:** FEATURE

Implement `POST /api/auth/register` as described in the Register Endpoint Design section
above. Follow the same pattern as `POST /api/auth/login` in `backend/src/api/auth/`.

New files:
- `backend/src/api/auth/dto/register.dto.ts`
- `backend/src/api/auth/dto/register-response.dto.ts` (can reuse `LoginResponseDto` if identical)

Update:
- `backend/src/api/auth/auth.controller.ts` — add the register endpoint
- `backend/src/domain/auth/auth.service.ts` — add register logic

The endpoint must be public (no JwtAuthGuard). Add full Swagger decorators.

### Task #3: Frontend INFRA — Auth context + token storage + API client — ✅ DONE
**Agent:** frontend-developer | **Type:** INFRA

Implement the auth infrastructure as described in the Frontend Architecture section.

New files:
- `frontend/src/context/AuthContext.tsx` — context, provider, hook
- `frontend/src/lib/apiClient.ts` — fetch wrapper that attaches Bearer token
- `frontend/src/lib/tokenStorage.ts` — thin wrapper over expo-secure-store / AsyncStorage

Update:
- `frontend/app/_layout.tsx` — wrap app in AuthProvider, add navigation guard

Do NOT migrate existing screens to apiClient yet — that is part of Tasks #4–#7.

### Task #4: Frontend FEATURE — Login screen — ✅ DONE
**Agent:** frontend-developer | **Type:** FEATURE

DESIGN REFERENCE: `designs/athlete-screens.pen` — frame: "Login"

Implement the login screen at `frontend/app/login.tsx`.

On submit: call `POST /api/auth/login` via apiClient, call `AuthContext.login(token)`,
then route by role as described in the Navigation Guard section.

Handle loading, error (wrong credentials → show inline message), and success states.

### Task #5: Frontend FEATURE — Register screen — ✅ DONE
**Agent:** frontend-developer | **Type:** FEATURE

DESIGN REFERENCE: `designs/athlete-screens.pen` — frame: "Register"

Implement the register screen at `frontend/app/register.tsx`.

On submit: call `POST /api/auth/register` via apiClient, call `AuthContext.login(token)`,
then route to `/no-gym` (role and gymId will be null for a newly registered user).

Handle loading, error (email taken → show inline message), and success states.

### Task #6: Frontend FEATURE — No-Gym screen — ✅ DONE
**Agent:** frontend-developer | **Type:** FEATURE

DESIGN REFERENCE: `designs/athlete-screens.pen` — frame: "No Gym"

Implement `frontend/app/no-gym.tsx`. Static screen with a message explaining the user
is not yet part of a gym and should ask their gym owner for an invite.

Include a logout button that calls `AuthContext.logout()`.

### Task #7: Frontend FEATURE — Migrate existing screens to apiClient — ✅ DONE
**Agent:** frontend-developer | **Type:** REFACTOR

Replace all raw fetch calls in existing screens with `apiClient`. No behaviour changes —
only the HTTP layer changes. Screens: coach-classes, coach-class-details,
coach-mark-attendance, athlete schedule, my-bookings, class-details, gym-owner schedule,
coaches screen, invite-coach modal.

### Task #8: Frontend FEATURE — Dev bootstrap screen update — ✅ DONE
**Agent:** frontend-developer | **Type:** FEATURE

Update the dev bootstrap screen to show sample user cards (Owner, Coach, Athlete).
Each card calls `POST /api/auth/login` with hardcoded dev credentials and logs the
user in via `AuthContext.login(token)`. Remove the old raw header fields.

The screen must only be reachable when `NODE_ENV=development`.

---

## Dependencies

```
Task #1 (UX design) ────────────────────────────────────────────────────┐
Task #2 (register endpoint) ────────────────────────────────────────────┤
Task #3 (auth context + API client) ────────────────────────────────────┤
                                                                         ↓
                                          Tasks #4, #5, #6, #7, #8 (screens)
```

Tasks #1, #2, #3 can run in parallel. Tasks #4–#8 depend on all three.

---

## Acceptance Criteria

- [x] `POST /api/auth/register` creates an athlete account and returns a JWT
- [x] `POST /api/auth/register` returns 409 for duplicate email
- [x] Unauthenticated users are redirected to the login screen — `frontend/app/_layout.tsx`, which
      also exempts `/login`, `/register` and `/invite/*` so signed-out onboarding stays reachable
- [x] Login screen issues a token and routes to the correct home screen by role
- [x] Register screen creates an account and routes to the no-gym screen
- [x] No-gym screen is shown for users with no gym association
- [x] All API calls carry the Bearer token automatically — `frontend/hooks/useApiClient.ts`
- [x] 401 responses log the user out and redirect to login — `wrap401` in `useApiClient.ts`
- [x] Dev bootstrap shows sample user cards and logs in with one tap
- [x] Logout clears the token and redirects to login

---

## References

- **Depends on:** `epics/AUTH_JWT_EPIC.md`
- **Next:** `epics/INVITE_ONBOARDING_EPIC.md` (Epic C — Invite & Onboarding)
- **Forgotten password:** `epics/PASSWORD_RESET_EPIC.md`
- **Auth guard:** `backend/src/auth/guards/jwt-auth.guard.ts`
- **Login endpoint:** `backend/src/api/auth/auth.controller.ts`
- **Shipped frontend auth:** `frontend/hooks/useAuth.ts`, `hooks/useApiClient.ts`,
  `utils/api-client.ts`, `utils/storage.ts`
- **Design:** `frontend/DESIGN.md` + the `impeccable` skill (the `.pen` files are retired)
