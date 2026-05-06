# EPIC: Revoke Coach Access (Epic J)

**Status:** ✅ COMPLETE (2026-05-06)  
**Start Date:** TBD  
**Owner:** Frontend team  
**Depends on:** `epics/GYM_OWNER_EPIC.md` — ✅ Complete  
**Next epic:** TBD

---

## Objective

Gym owners can invite coaches but currently have no way to remove or deactivate them. The backend already supports `PATCH /api/gyms/:gymId/configuration/coaches/:coachUserId` with `{ status: 'active' | 'inactive' }`. The Coaches screen shows status badges but has no action to change them. This epic wires up the deactivate/reactivate flow in the UI.

---

## Current State

- `PATCH /api/gyms/:gymId/configuration/coaches/:coachUserId` exists, `@Role('owner')`, sets status active/inactive
- `CoachListItemDto` already includes `userId` and `status`
- `frontend/app/coaches.tsx` renders coach rows with status badges but no action buttons
- No backend work needed

---

## Scope

### Included

- UX design: update the Coaches frame in `designs/gym-owner-screens.pen` to show Deactivate/Reactivate action per coach row
- Frontend: add Deactivate (for active coaches) / Reactivate (for inactive coaches) button to each row in `coaches.tsx`; confirm dialog before deactivating; PATCH on confirm; refresh list after

### Excluded

- Permanently deleting a coach record
- Reassigning classes when a coach is deactivated (separate concern)
- Revoking gym owner access (out of scope for MVP)

---

## API Surface (existing, no changes needed)

`PATCH /api/gyms/:gymId/configuration/coaches/:coachUserId`
- Body: `{ status: 'active' | 'inactive' }`
- Returns: `ChangeCoachStatusResponseDto`

---

## Tasks

### Task #1 — UX Design: Coaches screen with deactivate/reactivate actions

- Open `designs/gym-owner-screens.pen` and find the existing Coaches frame
- Add a new state variant `Coaches / With Actions` showing the coach list with action buttons per row:
  - Active coach row: "Deactivate" button (red outlined or destructive style)
  - Inactive coach row: "Reactivate" button (outlined, neutral)
- Do not modify the existing Coaches frame — add a new variant beside it
- Match existing row, badge, and button patterns

**Status:** ✅ Complete

---

### Task #2 — Frontend: Deactivate/Reactivate in Coaches screen

- Design reference: `designs/gym-owner-screens.pen`, frame `Coaches / With Actions` (from Task #1)
- In `frontend/app/coaches.tsx`:
  - Add a "Deactivate" button to active coach rows → `Alert.alert` confirm dialog → `PATCH` with `{ status: 'inactive' }` → refresh list
  - Add a "Reactivate" button to inactive coach rows → `PATCH` with `{ status: 'active' }` (no confirm needed) → refresh list
- Run `npm run generate:api-types` first
- Types from `@/types/api.gen.ts`
- TypeScript strict mode; `npx tsc --noEmit` must pass

**Status:** ✅ Complete

---

## Security Invariants

- Only owners can deactivate/reactivate coaches — already enforced by `@Role('owner')` on the backend
- `gymId` always from `GymContext`, never from user input

---

## Done When

- [x] Coaches frame variant in `gym-owner-screens.pen` shows action buttons
- [x] Deactivate button appears for active coaches, Reactivate for inactive coaches
- [x] Confirm dialog shown before deactivation
- [x] PATCH call succeeds and list refreshes
- [x] TypeScript compiles cleanly
