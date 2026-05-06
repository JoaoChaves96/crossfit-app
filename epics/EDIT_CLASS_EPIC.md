# EPIC: Edit & Delete Class (Epic I)

**Status:** ✅ COMPLETE (2026-05-06)  
**Start Date:** TBD  
**Owner:** Backend + Frontend team  
**Depends on:** `epics/CLASS_MANAGEMENT_EPIC.md` — ✅ Complete  
**Next epic:** TBD

---

## Objective

Gym owners can create classes but cannot fix mistakes — wrong coach, wrong time, wrong space. The "Edit" button in Class Management is wired to nothing. This epic adds a full edit flow and soft-delete for classes, restricted to `published` state to avoid the complexity of notifying booked athletes about changes.

---

## Current State

- `PATCH /:classId/structure` exists but only updates `capacity` and `spaceId` — not a full edit
- No `DELETE` endpoint exists for classes
- Class Management "Edit" button is rendered but does nothing
- No edit form frame exists in `designs/gym-owner-screens.pen`

---

## Decisions

- **Editable states:** `published` only — editing a class with existing bookings raises notification and fairness concerns deferred to a later epic
- **Delete:** soft-delete (`deletedAt = now`), `published` state only — avoids needing to cancel bookings
- **Edit fields:** classTypeId, coachUserId, spaceId, scheduledDate, scheduledTime, capacity, duration (all optional, same shape as create)
- **Owner only:** both edit and delete are `@Role('owner')`

---

## Scope

### Included

- `PATCH /api/gyms/:gymId/classes/:classId` — full class edit, owner only, published state only
- `DELETE /api/gyms/:gymId/classes/:classId` — soft-delete, owner only, published state only
- UX design: Edit class form frame in `designs/gym-owner-screens.pen`
- Frontend: wire "Edit" button in `class-management.tsx` → edit form pre-filled with current values
- Frontend: wire "Delete" action in `class-management.tsx` (or Schedule Dashboard) → confirm dialog → DELETE

### Excluded

- Editing classes in `booking_closed`, `in_progress`, or `completed` states
- Notifying booked athletes of edits
- Hard delete
- Bulk delete

---

## API Surface

**New endpoints:**

`PATCH /api/gyms/:gymId/classes/:classId`
- Guard: `@Role('owner')`
- Body: `{ classTypeId?, coachUserId?, spaceId?, scheduledDate?, scheduledTime?, capacity?, duration? }` (all optional)
- Precondition: class must be in `published` state — return `400` if not
- Returns: updated `ClassScheduleItemDto`

`DELETE /api/gyms/:gymId/classes/:classId`
- Guard: `@Role('owner')`
- Precondition: class must be in `published` state — return `400` if not
- Soft-delete: sets `deletedAt = now`
- Returns: `{ id, deletedAt }`

---

## Tasks

### Task #1 — Backend: PATCH + DELETE endpoints

- New command + handler: `EditClassCommand` / `EditClassHandler` — loads class, validates state = `published`, applies partial updates, saves
- New command + handler: `DeleteClassCommand` / `DeleteClassHandler` — loads class, validates state = `published`, sets `deletedAt`, saves
- New DTOs: `EditClassDto` (all fields optional, same validators as `CreateClassDto`), `EditClassResponseDto`, `DeleteClassResponseDto { id, deletedAt }`
- Wire both in `class.controller.ts` with full Swagger decorators
- Verify at `/api-docs`

**Status:** ✅ Complete

---

### Task #2 — UX Design: Edit class form

- Add a new frame `Edit Class` to `designs/gym-owner-screens.pen`
- Reuse the Create Class form pattern from the same file — same fields: Class Type picker, Coach picker, Space picker, Date, Time, Capacity, Duration
- Pre-filled state: all fields populated with current class values
- Header: "Edit Class" title + Save (primary) + Cancel (outlined) + Delete (red text link or destructive button)
- Match card, input, button tokens from existing owner screens

**Status:** ✅ Complete

---

### Task #3 — Frontend: Edit + Delete in Class Management

- Run `npm run generate:api-types` first
- In `frontend/app/class-management.tsx`:
  - Wire "Edit" button → navigate to `/edit-class?classId=<id>` (or show inline form — agent's call based on design)
- New file: `frontend/app/edit-class.tsx` — pre-filled form matching Pencil design
  - Fetch current class data on mount (`GET /:classId`)
  - Fetch pickers on mount: class types, coaches, spaces (same as create-class.tsx)
  - Submit → `PATCH /:classId` → navigate back to class management
  - "Delete" action → `Alert.alert` confirm → `DELETE /:classId` → navigate back to schedule dashboard
- Register `edit-class` in `_layout.tsx` with `headerShown: false`
- Types from `@/types/api.gen.ts`
- TypeScript strict mode; `npx tsc --noEmit` must pass

**Status:** ✅ Complete

---

## Security Invariants

- `gymId` always from JWT claims (`CurrentGym`), never from user input
- Both endpoints validate the class belongs to the gym before applying changes
- State guard (`published` only) enforced in handler, not just controller

---


## Done When

- [x] `PATCH /api/gyms/:gymId/classes/:classId` updates published classes correctly
- [x] `DELETE /api/gyms/:gymId/classes/:classId` soft-deletes published classes correctly
- [x] Both return `400` for non-published classes
- [x] Swagger schema accurate for both endpoints
- [x] Edit Class frame exists in `gym-owner-screens.pen`
- [x] `edit-class.tsx` pre-fills and submits correctly
- [x] Delete confirm dialog works and navigates back on success
- [x] TypeScript compiles cleanly across backend and frontend
