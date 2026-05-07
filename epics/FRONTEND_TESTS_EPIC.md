# EPIC: Frontend Unit Tests (Epic O)

**Status:** 🔲 Not Started  
**Start Date:** TBD  
**Owner:** Frontend  
**Depends on:** Epic M (Refactor) — ✅ Complete  
**Next epic:** Epic P (Playwright E2E)

---

## Objective

The frontend has zero test files. This epic adds unit tests for the logic that matters: custom hooks and screens/components with non-trivial business logic. Pure render-only components are deliberately excluded — they offer low signal and high maintenance cost.

---

## Current State

- **0 test files** across all of `frontend/`
- No test runner configured for React Native / Expo (Jest setup likely needed)
- No testing utilities or mocks established

---

## Decisions

- **TEST_ONLY invariant**: no test task may modify production logic. If behavior is missing or broken, the test fails and reports why.
- **Skip dumb components**: components that only render props with no conditional logic, no API calls, and no state are excluded. Examples: `SettingsSidebar`, `SettingsTabBar`, `ClassManagementSidebar`.
- **Test hooks directly**: custom hooks with auth, API, or state logic are the highest value target.
- **Test complex screens via their logic**: screens with significant branching (booking states, form validation, class states) are tested through their hooks and state, not through shallow rendering.
- **Jest + React Native Testing Library**: follow Expo's recommended testing setup.

---

## Scope

### Included

**Infrastructure (prerequisite):**
- Jest + React Native Testing Library setup for Expo
- Test utilities: mock API client, mock auth context, mock navigation

**Custom hooks:**
- `useAuth.ts` — login, logout, token decode, session restore, role extraction
- `useApiClient.ts` — authenticated client initialization, token attachment, 401 handling
- `useGym.ts` — gym context reads, gym switching
- `useClassTransition.ts` — state transition alert flow, API call, navigation on success/failure

**Complex screens / components (logic-heavy):**
- `schedule-dashboard/` — week navigation, date filtering, class card booking state rendering (booked / full / waitlisted / available)
- `class-details.tsx` — button state logic (book / join waitlist / leave waitlist / booked) based on booking status and capacity
- `(tabs)/my-bookings.tsx` — filter toggle logic, confirmed vs waitlisted card rendering
- `gym-settings/SpacesTab.tsx` — form validation, create vs edit mode, delete confirm
- `gym-settings/ClassTypesTab.tsx` — same as above
- `create-class.tsx` — form validation, picker state, datetime handling
- `edit-class.tsx` — pre-fill logic, partial update submission

### Excluded

- Pure render components: `SettingsSidebar`, `SettingsTabBar`, `ClassManagementSidebar`, `ClassHeader`, `ResultsPanel` (no logic)
- Navigation configuration (`_layout.tsx`)
- Style files (`.styles.ts`)
- Generated API types (`api.gen.ts`)
- Dev bootstrap screen

---

## Tasks

### Task #1 — Infra: Jest + Testing Library Setup

**TASK TYPE:** INFRA  
**AGENT:** frontend-developer

Set up Jest and React Native Testing Library for the Expo project. Follow Expo's official recommended configuration.

Deliverables:
- Jest config (`jest.config.js` or `jest.config.ts`) compatible with Expo
- `jest-setup.ts` with any required global mocks (React Native modules, AsyncStorage, navigation)
- Utility file `frontend/test-utils/` with: mock API client factory, mock auth context wrapper, mock navigation
- Verify setup works: a trivial smoke test must pass (`npm test` runs)

**Done when:**
- `npm test` runs without configuration errors
- A trivial smoke test (e.g. `expect(true).toBe(true)`) passes
- Mock utilities exist for auth context, API client, and navigation
- `npx tsc --noEmit` passes

**Status:** 🔲 Not Started

---

### Task #2 — Unit Tests: Auth & API Hooks

**TASK TYPE:** TEST_ONLY  
**AGENT:** frontend-developer  
**Depends on:** Task #1

Write unit tests for `useAuth.ts` and `useApiClient.ts`.

`useAuth` tests:
- Login stores token and sets user state
- Logout clears token and user state
- Session restore reads token from storage and decodes user on mount
- Role is correctly extracted from JWT claims
- Invalid/expired token on restore clears state

`useApiClient` tests:
- Bearer token is attached to requests when authenticated
- 401 response triggers logout and redirect
- Requests work without token for public endpoints

**Done when:**
- All login/logout/restore branches tested
- Token attachment and 401 handling tested
- `npm test` passes

**Status:** 🔲 Not Started

---

### Task #3 — Unit Tests: Gym & Class Transition Hooks

**TASK TYPE:** TEST_ONLY  
**AGENT:** frontend-developer  
**Depends on:** Task #1

Write unit tests for `useGym.ts` and `useClassTransition.ts`.

`useGym` tests:
- Returns current gym from context
- Gym switching updates context

`useClassTransition` tests:
- Shows confirmation alert before transitioning
- On confirm: calls PATCH transition endpoint, navigates on success
- On cancel: does nothing
- On API error: surfaces error without navigating

**Done when:**
- All branches in both hooks tested
- `npm test` passes

**Status:** 🔲 Not Started

---

### Task #4 — Unit Tests: Schedule & Class Details Logic

**TASK TYPE:** TEST_ONLY  
**AGENT:** frontend-developer  
**Depends on:** Task #1

Write unit tests for the booking state logic in `schedule-dashboard/` and `class-details.tsx`.

Schedule dashboard tests:
- Week navigation increments/decrements the displayed week correctly
- Class cards render correct status badge: available / booked / full / waitlisted
- Date filter shows only classes for the selected day

Class details tests:
- "Book" button shown when class is available and athlete not booked
- "Booked" state shown when athlete has confirmed booking
- "Join Waitlist" shown when class is full and athlete not on waitlist
- "Waitlist #N — Leave Waitlist" shown when athlete is on waitlist
- Cancel button triggers correct API call (cancel booking vs leave waitlist)

**Done when:**
- All booking state branches tested for both screens
- `npm test` passes

**Status:** 🔲 Not Started

---

### Task #5 — Unit Tests: Form Screens

**TASK TYPE:** TEST_ONLY  
**AGENT:** frontend-developer  
**Depends on:** Task #1

Write unit tests for the form logic in `create-class.tsx` and `edit-class.tsx`.

`create-class` tests:
- Submit disabled when required fields are empty
- Submit calls POST with correct payload
- Picker state updates correctly on selection
- Date/time validation rejects invalid inputs

`edit-class` tests:
- Form pre-fills with existing class data on mount
- Only changed fields are included in PATCH payload
- Delete action shows confirm dialog before calling DELETE
- Navigation goes back on successful save or delete

**Done when:**
- Form validation branches tested
- Pre-fill and partial update logic tested
- Delete confirm flow tested
- `npm test` passes

**Status:** 🔲 Not Started

---

### Task #6 — Unit Tests: Gym Settings Tabs

**TASK TYPE:** TEST_ONLY  
**AGENT:** frontend-developer  
**Depends on:** Task #1

Write unit tests for `SpacesTab.tsx` and `ClassTypesTab.tsx` inside `gym-settings/`.

For each tab:
- Empty state renders when list is empty
- Create form appears on "Add" action
- Edit form pre-fills when editing an existing item
- Submit calls correct endpoint (POST for create, PATCH for edit)
- Delete shows confirm dialog, calls DELETE on confirm
- Form validation blocks submission when required fields are missing

**Done when:**
- Create / edit / delete flows tested for both tabs
- Form validation tested
- `npm test` passes

**Status:** 🔲 Not Started

---

## Execution Order

Task #1 must complete first. Tasks #2–6 can run in parallel after #1.

```
#1 (Jest setup) → #2 (Auth/API hooks)
              → #3 (Gym/Transition hooks)
              → #4 (Schedule/Class Details)
              → #5 (Form screens)
              → #6 (Gym Settings tabs)
```

---

## Done When

- [ ] Jest + React Native Testing Library configured and running
- [ ] `useAuth` and `useApiClient` fully tested
- [ ] `useGym` and `useClassTransition` fully tested
- [ ] Schedule dashboard booking state logic tested
- [ ] Class details booking state logic tested
- [ ] Create class and edit class form logic tested
- [ ] Spaces and class types tab logic tested
- [ ] No production code modified
- [ ] `npm test` passes
