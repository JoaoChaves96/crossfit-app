# EPIC: Playwright E2E Test Suite (Epic P)

**Status:** 🔲 Not Started  
**Start Date:** TBD  
**Owner:** Frontend + Backend  
**Depends on:** Epic N (Backend Tests) + Epic O (Frontend Unit Tests)  
**Next epic:** TBD

---

## Objective

Add a Playwright test suite that runs against the full running stack (backend + frontend) and covers the critical user flows for all three roles. These tests are the primary regression safety net — if a flow breaks, Playwright catches it before it ships.

---

## Current State

- No Playwright setup exists
- Backend runs on port 3000, frontend (Expo web) on port 8081
- Test credentials exist: `owner@example.com`, `coach@example.com`, `athlete@example.com` / `password123`
- Database is PostgreSQL with a seed script

---

## Decisions

- **Playwright targets Expo web** (`http://localhost:8081`) — not native mobile. Web and mobile share the same logic; web is automatable.
- **Tests run against a seeded test database** — same seed data used in existing backend e2e tests. A reset script must run before the suite.
- **Tests are role-scoped** — each spec file covers one role's flows end-to-end.
- **No flaky selectors** — use `data-testid` attributes where needed. If a selector is fragile, add a `data-testid` to the component (this is the only production code change allowed in this epic).
- **CI-ready** — the suite must be runnable with a single command and produce a clear pass/fail.

---

## Scope

### Included

**Infrastructure:**
- Playwright setup: config, base URL, test credentials, database reset hook
- `data-testid` attributes added to key interactive elements where selectors would otherwise be fragile (buttons, inputs, nav items)
- Shared auth helpers: `loginAs(role)` utility that logs in and returns an authenticated page

**Athlete flows:**
- Registration: new account → no-gym screen → invite link → joined gym → schedule visible
- Login → view schedule → book a class → class appears in My Bookings
- Cancel a booking → class no longer in My Bookings
- Book a full class → waitlisted → position shown in My Bookings
- Complete class flow → Training History shows logged result

**Gym Owner flows:**
- Login → view schedule dashboard → navigate week
- Create a class → class appears on schedule
- Edit a class → changes reflected on schedule
- Delete a class → class removed from schedule
- Invite a coach → coach appears in coaches list
- Deactivate a coach → coach marked inactive
- Gym settings: add a space → appears in list; add a class type → appears in list
- Class management: view bookings, mark attendance, view results

**Coach flows:**
- Login → view assigned classes
- Open a class → add programming → programming saved
- Mark attendance for booked athletes
- View results after athletes log them

**Cross-role regression flows:**
- Class state progression: owner publishes → booking closes automatically → in progress → completed → athlete can log result
- Waitlist promotion: athlete on waitlist → another athlete cancels → waitlisted athlete is promoted

### Excluded

- Payment flows (not implemented)
- Platform admin flows (not implemented)
- Native mobile (Playwright targets web only)
- Visual regression / screenshot diffing
- Performance testing

---

## Tasks

### Task #1 — Infra: Playwright Setup

**TASK TYPE:** INFRA  
**AGENT:** frontend-developer

Set up Playwright in the project root (or a dedicated `e2e/` directory).

Deliverables:
- `playwright.config.ts` — base URL `http://localhost:8081`, test directory, screenshot/video on failure
- `e2e/helpers/auth.ts` — `loginAs('owner' | 'coach' | 'athlete')` utility using test credentials
- `e2e/helpers/db-reset.ts` — script that resets and re-seeds the test database before the suite runs (call the existing seed script or backend test helpers)
- Global setup hook that runs db-reset before all tests
- `data-testid` attributes added to: nav items (sidebar, tab bar), primary action buttons (Book, Cancel, Save, Submit, Delete, Invite), form inputs for login/register/create-class/edit-class
- Verify: `npx playwright test` runs and a trivial navigation test passes

**Done when:**
- `npx playwright test` runs without config errors
- Auth helper logs in and lands on the correct home screen for each role
- DB reset runs before the suite
- `npx tsc --noEmit` passes

**Status:** 🔲 Not Started

---

### Task #2 — E2E: Athlete Flows

**TASK TYPE:** TEST_ONLY  
**AGENT:** frontend-developer  
**Depends on:** Task #1

Write Playwright specs for all athlete flows in `e2e/athlete.spec.ts`.

Flows:
1. Login → schedule visible with class cards
2. Book a class → appears in My Bookings with "Confirmed" state
3. Cancel a booking → removed from My Bookings
4. Book a full class → "Waitlisted" badge shown in My Bookings with position number
5. Training History → shows completed classes

Each flow must: start from login, complete the full interaction, assert the final visible state.

**Done when:**
- All 5 flows pass
- `npx playwright test e2e/athlete.spec.ts` exits green

**Status:** 🔲 Not Started

---

### Task #3 — E2E: Gym Owner Flows

**TASK TYPE:** TEST_ONLY  
**AGENT:** frontend-developer  
**Depends on:** Task #1

Write Playwright specs for all gym owner flows in `e2e/owner.spec.ts`.

Flows:
1. Login → schedule dashboard loads with week view
2. Create a class → class card appears on schedule
3. Edit a class → updated details shown on schedule
4. Delete a class → class removed from schedule
5. Invite a coach → coach appears in coaches list
6. Deactivate a coach → coach shows inactive state
7. Gym settings: add a space → appears in spaces list
8. Gym settings: add a class type → appears in class types list
9. Class management: open a class → bookings panel shows booked athletes

**Done when:**
- All 9 flows pass
- `npx playwright test e2e/owner.spec.ts` exits green

**Status:** 🔲 Not Started

---

### Task #4 — E2E: Coach Flows

**TASK TYPE:** TEST_ONLY  
**AGENT:** frontend-developer  
**Depends on:** Task #1

Write Playwright specs for all coach flows in `e2e/coach.spec.ts`.

Flows:
1. Login → assigned classes list loads
2. Open a class → add programming → programming visible on next load
3. Mark attendance for booked athletes → attendance saved
4. View results after athletes have logged them

**Done when:**
- All 4 flows pass
- `npx playwright test e2e/coach.spec.ts` exits green

**Status:** 🔲 Not Started

---

### Task #5 — E2E: Cross-Role Regression Flows

**TASK TYPE:** TEST_ONLY  
**AGENT:** frontend-developer  
**Depends on:** Tasks #2, #3, #4

Write Playwright specs for flows that span multiple roles in `e2e/cross-role.spec.ts`.

Flows:
1. **Class lifecycle**: owner creates class → athlete books → class transitions through states → athlete logs result → result appears in training history
2. **Waitlist promotion**: owner creates class at capacity → athlete A books → athlete B joins waitlist → athlete A cancels → athlete B is promoted to confirmed

These tests use multiple authenticated sessions (owner page + athlete page).

**Done when:**
- Both cross-role flows pass end-to-end
- `npx playwright test e2e/cross-role.spec.ts` exits green

**Status:** 🔲 Not Started

---

## Execution Order

```
#1 (Playwright setup)
    ├── #2 (Athlete flows)
    ├── #3 (Owner flows)
    ├── #4 (Coach flows)
    └── (after #2, #3, #4) → #5 (Cross-role flows)
```

Tasks #2–4 can run in parallel after #1.

---

## Done When

- [ ] Playwright configured and runnable with `npx playwright test`
- [ ] DB reset runs before suite
- [ ] `data-testid` attributes on all key interactive elements
- [ ] Athlete flows: login, book, cancel, waitlist, training history
- [ ] Owner flows: schedule, create/edit/delete class, coaches, settings, class management
- [ ] Coach flows: classes, programming, attendance, results
- [ ] Cross-role: full class lifecycle, waitlist promotion
- [ ] `npx playwright test` exits green across all spec files
- [ ] No production logic modified (only `data-testid` attributes added)
