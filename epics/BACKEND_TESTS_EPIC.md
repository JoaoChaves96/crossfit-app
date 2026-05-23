# EPIC: Backend Test Coverage (Epic N)

**Status:** ✅ COMPLETE (2026-05-07)  
**Start Date:** 2026-05-07  
**Owner:** Backend  
**Depends on:** Epic M (Refactor) — ✅ Complete  
**Next epic:** Epic O (Frontend Unit Tests)

---

## Objective

The backend has 2 unit test files covering 10 tests total, and 8 integration test files covering only the original core flows. 25 of 26 command handlers are untested, and 24+ endpoint groups have no integration coverage. This epic closes those gaps systematically.

---

## Current State

**Unit tests (2 files, ~10 tests):**
- `app.controller.spec.ts` — health check only
- `commands/class/handlers/create-class.handler.spec.ts` — 9 tests

**Integration/E2E tests (8 files):**
- Booking, class creation, coach classes, get coaches, gym configuration, gym creation, gym schedule, invite coach

**No coverage:**
- 25 command handlers
- 3 guards (JwtAuthGuard, RolesGuard, GymOwnershipGuard)
- Results, attendance, programming, edit/delete class, state transitions, membership plans, spaces, class types, members, invitation accept/list/delete, user profiles, gym profiles

---

## Decisions

- **TEST_ONLY invariant**: no test task may modify production code. If behavior is missing, the test fails and reports why.
- **Unit tests target handlers and guards** — not repositories or thin pass-through code.
- **Integration tests hit a real NestJS app + test database** — same pattern as existing `*.e2e-spec.ts` files in `backend/test/`.
- **Priority order**: handlers with branching logic first (booking, cancellation, state machine), then guards, then integration gaps.

---

## Scope

### Included

**Unit tests — command handlers:**
- `book-class.handler.ts` — 7 preconditions, waitlist vs booked decision, membership validation
- `cancel-booking.handler.ts` — waitlist promotion logic, capacity restoration, position renumbering
- `manually-transition-class-state.handler.ts` — unidirectional state machine (all valid + invalid transitions)
- `edit-class.handler.ts` — published-only guard, partial update logic
- `delete-class.handler.ts` — published-only guard, soft-delete
- `log-result.handler.ts` — completed-class-only guard, result entry
- `add-or-edit-programming.handler.ts` — create vs update branching
- `invite-coach.handler.ts` — deduplication, user creation vs existing user, transaction handling

**Unit tests — guards:**
- `gym-ownership.guard.ts` — matches / mismatches / routes without gymId param
- `roles.guard.ts` — correct role passes / wrong role rejects / missing metadata
- `jwt-auth.guard.ts` — valid token / expired token / missing token

**Integration tests — endpoint groups with zero coverage:**
- Class results: log result, edit result, toggle loggable status
- Attendance: mark attendance, verify attendance state
- Programming: add programming, edit programming
- Class lifecycle: edit class, delete class, manual state transitions
- Gym configuration: spaces CRUD, class types CRUD
- Members: list members, member status
- Invitations: accept invite, list invites, revoke invite
- Profiles: GET/PATCH user profile (`/api/me`), GET/PATCH gym profile

### Excluded

- Frontend tests (Epic O)
- Playwright/E2E browser tests (Epic P)
- Repository-layer unit tests (thin CRUD, low value)
- Performance or load tests

---

## Tasks

### Task #1 — Unit Tests: Booking & Cancellation Handlers

**TASK TYPE:** TEST_ONLY  
**AGENT:** backend-developer

Write unit tests for `book-class.handler.ts` and `cancel-booking.handler.ts`. These are the highest-value handlers — booking has 7 precondition branches and a waitlist decision tree; cancellation has waitlist promotion and position renumbering logic.

Mock all repositories. Test every branch: class not found, class not published, class full → waitlisted, membership invalid, already booked, cancel confirmed booking, cancel waitlisted booking, promote waitlisted athlete on cancel.

**Done when:**
- All booking precondition branches have a test
- Waitlist vs confirmed booking decision is tested
- Cancellation promotes the correct waitlisted athlete and renumbers positions
- `npx tsc --noEmit` passes

**Status:** ✅ Complete

---

### Task #2 — Unit Tests: State Machine & Lifecycle Handlers

**TASK TYPE:** TEST_ONLY  
**AGENT:** backend-developer

Write unit tests for `manually-transition-class-state.handler.ts`, `edit-class.handler.ts`, and `delete-class.handler.ts`.

State machine tests must cover: every valid transition, every invalid transition (returns 400), and transitions from terminal states. Edit and delete tests must cover the published-only guard (returns 400 for non-published classes).

**Done when:**
- All valid state transitions are tested
- All invalid transitions (wrong order, terminal states) return 400
- Edit and delete reject non-published classes
- `npx tsc --noEmit` passes

**Status:** ✅ Complete

---

### Task #3 — Unit Tests: Guards

**TASK TYPE:** TEST_ONLY  
**AGENT:** backend-developer

Write unit tests for all three guards in `backend/src/auth/guards/`:
- `gym-ownership.guard.ts`: route gymId matches JWT gymId → passes; mismatch → 401; no gymId param in route → passes through
- `roles.guard.ts`: correct role → passes; wrong role → 403; no metadata → passes
- `jwt-auth.guard.ts`: valid token → passes; expired/invalid → 401; missing → 401

Follow existing NestJS guard testing patterns (mock `ExecutionContext`).

**Done when:**
- All three guards have full branch coverage
- `npx tsc --noEmit` passes

**Status:** ✅ Complete

---

### Task #4 — Unit Tests: Remaining Priority Handlers

**TASK TYPE:** TEST_ONLY  
**AGENT:** backend-developer

Write unit tests for:
- `log-result.handler.ts` — completed-class-only guard, duplicate result check
- `add-or-edit-programming.handler.ts` — create vs update branching, state guard
- `invite-coach.handler.ts` — existing vs new user, duplicate invite guard, transaction rollback on failure

**Done when:**
- All branching conditions in each handler have a test
- `npx tsc --noEmit` passes

**Status:** ✅ Complete

---

### Task #5 — Integration Tests: Results, Attendance & Programming

**TASK TYPE:** TEST_ONLY  
**AGENT:** backend-developer

Add integration tests following the pattern in `backend/test/*.e2e-spec.ts` for:
- `POST /api/gyms/:gymId/classes/:classId/results` — log result (requires completed class)
- `PATCH /api/gyms/:gymId/results/:resultId` — edit result
- `POST /api/gyms/:gymId/classes/:classId/toggle-loggable` — toggle loggable status
- `POST /api/gyms/:gymId/classes/:classId/attendance` — mark attendance (requires in-progress class)
- `GET /api/gyms/:gymId/classes/:classId/results` — view results
- `POST /api/gyms/:gymId/classes/:classId/programming` — add/edit programming

Each test must verify: happy path, auth guard (401 without token), role guard (403 wrong role), gymId mismatch (401).

**Done when:**
- All 6 endpoint groups have happy path + auth/role/gymId guard tests
- Tests use real NestJS app + test DB (same pattern as existing e2e specs)
- `npx tsc --noEmit` passes

**Status:** ✅ Complete

---

### Task #6 — Integration Tests: Class Lifecycle & Gym Configuration

**TASK TYPE:** TEST_ONLY  
**AGENT:** backend-developer

Add integration tests for:
- `PATCH /api/gyms/:gymId/classes/:classId` — edit class (published-only guard)
- `DELETE /api/gyms/:gymId/classes/:classId` — delete class (published-only guard)
- `POST /api/gyms/:gymId/classes/:classId/transition` — manual state transition
- Spaces CRUD: create, list, update, delete
- Class types CRUD: create, list, update, delete
- `GET /api/gyms/:gymId/members` — members list

**Done when:**
- All endpoint groups have happy path + guard tests
- Edit/delete return 400 for non-published classes
- State transition returns 400 for invalid transitions
- `npx tsc --noEmit` passes

**Status:** ✅ Complete

---

### Task #7 — Integration Tests: Invitations & Profiles

**TASK TYPE:** TEST_ONLY  
**AGENT:** backend-developer

Add integration tests for:
- `GET /api/invites/:inviteToken` — validate invite (public)
- `POST /api/invites/:inviteToken/accept` — accept invite
- `GET /api/gyms/:gymId/invites` — list invites
- `DELETE /api/gyms/:gymId/invites/:inviteId` — revoke invite
- `GET /api/me` + `PATCH /api/me` — athlete profile
- `GET /api/gyms/:gymId/profile` + `PATCH /api/gyms/:gymId/profile` — gym profile

**Done when:**
- All endpoint groups have happy path + guard tests
- `npx tsc --noEmit` passes

**Status:** ✅ Complete

---

## Execution Order

Tasks #1–4 (unit tests) can run in parallel.
Tasks #5–7 (integration tests) can run in parallel after #1–4.

```
#1 (Booking handlers) ─┐
#2 (State machine)    ─┤─→ #5 (Results/Attendance/Programming)
#3 (Guards)           ─┤─→ #6 (Lifecycle/Config)
#4 (Remaining handlers)┘─→ #7 (Invitations/Profiles)
```

---

## Done When

- [ ] `book-class` and `cancel-booking` handlers fully unit tested
- [ ] State machine transitions fully unit tested
- [ ] All 3 guards fully unit tested
- [ ] `log-result`, `add-or-edit-programming`, `invite-coach` handlers unit tested
- [ ] Results, attendance, programming endpoints have integration tests
- [ ] Class lifecycle and gym configuration endpoints have integration tests
- [ ] Invitations and profiles endpoints have integration tests
- [ ] No production code modified
- [ ] `npx tsc --noEmit` passes
