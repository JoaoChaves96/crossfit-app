# EPIC: Gym Settings (Epic F)

**Status:** ✅ COMPLETE (2026-05-05)  
**Start Date:** 2026-05-05  
**Owner:** UX + Frontend team  
**Depends on:** `epics/CLASS_MANAGEMENT_EPIC.md` — ✅ Complete  
**Next epic:** TBD

---

## Objective

Give gym owners a UI to manage their gym configuration — training spaces and class types. These are prerequisites for creating classes from the UI (the Create Class form needs spaces and class types to be configured first).

---

## Current State

- All backend endpoints exist and are working (GET + POST/PATCH/DELETE for spaces, GET + POST for class types)
- "Settings" nav item exists in the schedule dashboard sidebar but is disabled (`enabled: false`)
- `Gym Settings` Pencil frame exists with 3 tabs (Spaces, Class Types, Booking Rules) but only the Spaces empty state is designed — list/edit states and Class Types content are missing
- Booking Rules has no backend — will be a placeholder tab

---

## Scope

### Included

- UX design: Spaces list + add/edit form states, Class Types list + add form states (within existing `Gym Settings` frame)
- Frontend: `gym-settings.tsx` screen with Spaces and Class Types tabs
- Frontend: Enable and wire sidebar Settings nav item

### Excluded

- Booking Rules tab (no backend — renders as "Coming soon" placeholder)
- Gym Profile editing (separate screen)
- Membership Plans (known non-goal — payments deferred)

---

## API Surface (all existing, no new endpoints needed)

**Spaces:**
- `GET /api/gyms/:gymId/configuration/spaces` → `{ spaces: [{ id, name, baseCapacity }] }`
- `POST /api/gyms/:gymId/configuration/spaces` → create `{ name, baseCapacity }`
- `PATCH /api/gyms/:gymId/configuration/spaces/:spaceId` → update `{ name?, baseCapacity? }`
- `DELETE /api/gyms/:gymId/configuration/spaces/:spaceId` → delete

**Class Types:**
- `GET /api/gyms/:gymId/configuration/class-types` → `{ classTypes: [{ id, name, loggable, resultMetrics }] }`
- `POST /api/gyms/:gymId/configuration/class-types` → `{ operation: 'create'|'update'|'delete', classTypeId?, name?, loggable?, resultMetrics? }`

---

## Tasks

### Task #1 — UX Design

Add state variants to the existing `Gym Settings` frame in `designs/gym-owner-screens.pen`.

**Spaces tab — add these states within the frame:**
- **List state:** table/list of spaces, each row showing name + capacity + Edit + Delete actions; "Add Space" button in top-right
- **Add/Edit form:** inline or modal form with name field + capacity field + Save/Cancel buttons

**Class Types tab — add content within the frame:**
- **List state:** list of class types, each row showing name + loggable badge + result metric + Edit + Delete actions; "Add Class Type" button
- **Add/Edit form:** name field + loggable toggle + result metric selector (time/reps/weight/rounds/none) + Save/Cancel

**Booking Rules tab:**
- Simple "Coming soon" placeholder — no form content needed

**Constraints:** reuse existing design tokens only. Match card, button, table, and form patterns from other gym owner frames.

**Status:** ✅ Complete

---

### Task #2 — Frontend: Gym Settings screen (Spaces tab)

- New file: `frontend/app/gym-settings.tsx`
- Register in `_layout.tsx` stack: `<Stack.Screen name="gym-settings" options={{ headerShown: false }} />`
- Implement sidebar nav (reuse pattern from `schedule-dashboard.tsx`) with Settings tab active
- Three tabs: Spaces (default), Class Types, Booking Rules
- **Spaces tab:**
  - Fetch `GET /api/gyms/:gymId/configuration/spaces` on mount
  - List state: table rows with name, capacity, Edit + Delete buttons
  - Add Space: inline form or modal — POST to create
  - Edit Space: populate form with existing values — PATCH to update
  - Delete Space: confirm dialog — DELETE
  - Empty state matching Pencil design (icon + description + "Add Space" button)
- Booking Rules tab: "Coming soon" text placeholder
- All types from `src/types/api.gen.ts` (run `npm run generate:api-types` first)

**Status:** ✅ Complete

---

### Task #3 — Frontend: Class Types tab

- Add Class Types tab content to `gym-settings.tsx`
- Fetch `GET /api/gyms/:gymId/configuration/class-types` on tab focus
- List state: rows with name, loggable badge, result metric label, Edit + Delete buttons
- Add Class Type: form with name, loggable toggle, result metric selector → `POST` with `operation: 'create'`
- Edit Class Type: same form pre-filled → `POST` with `operation: 'update'`
- Delete Class Type: confirm dialog → `POST` with `operation: 'delete'`
- Empty state: icon + description + "Add Class Type" button

**Status:** ⏳ Not started

---

### Task #4 — Frontend: Wire sidebar nav → Gym Settings

- In `frontend/app/schedule-dashboard.tsx`: change Settings nav item from `enabled: false` to `enabled: true`
- Wire the `onNavigate` handler: when `key === 'settings'` → `router.push('/gym-settings')`
- Also wire Settings nav item in `class-management.tsx` sidebar if it has one

**Status:** ✅ Complete

---

## Security Invariants

- All endpoints already enforce `@Role('owner')` and `gymId` isolation — no backend changes needed
- `gymId` always comes from `GymContext`, never from user input

---

## Done When

- [x] UX frames updated in `designs/gym-owner-screens.pen` with list + form states
- [x] `gym-settings.tsx` renders Spaces tab with full CRUD (add, edit, delete)
- [x] Class Types tab renders with full CRUD
- [x] Booking Rules tab shows placeholder
- [x] Settings nav item in sidebar is enabled and navigates correctly
- [x] TypeScript strict mode passes, no implicit `any`
- [x] `npm run generate:api-types` runs cleanly
