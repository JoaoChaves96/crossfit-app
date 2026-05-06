# EPIC: Gym Profile Editing (Epic L)

**Status:** ✅ COMPLETE (2026-05-06)  
**Start Date:** TBD  
**Owner:** Backend + Frontend team  
**Depends on:** `epics/GYM_SETTINGS_EPIC.md` — ✅ Complete  
**Next epic:** TBD

---

## Objective

Gym owners registered their gym during onboarding but have no way to update the gym's name, description, or location after the fact. This epic adds a Gym Profile tab to the existing Gym Settings screen with a simple read/edit form.

---

## Current State

- `GymEntity` has `name`, `description` (nullable), `location`, `logoUrl` (nullable), `ownerUserId`, `status`
- No `GET /api/gyms/:gymId/profile` or `PATCH /api/gyms/:gymId/profile` endpoint exists
- `frontend/app/gym-settings.tsx` exists with Spaces, Class Types, and Booking Rules (placeholder) tabs
- `designs/gym-owner-screens.pen` has the Gym Settings frame but no Gym Profile tab content

---

## Decisions

- **Editable fields:** `name`, `description`, `location` — logo upload deferred (requires file storage)
- **Tab placement:** new "Profile" tab added to the existing Gym Settings screen (alongside Spaces, Class Types, Booking Rules)
- **Access:** owner only

---

## Scope

### Included

- `GET /api/gyms/:gymId/profile` — returns gym `id`, `name`, `description`, `location`, `status`, `createdAt`
- `PATCH /api/gyms/:gymId/profile` — updates `name?`, `description?`, `location?`; returns updated profile
- UX design: Gym Profile tab state in `designs/gym-owner-screens.pen`
- Frontend: Gym Profile tab added to `gym-settings.tsx`

### Excluded

- Logo/image upload (requires file storage infrastructure)
- Opening hours (no data model yet)
- Booking rules configuration (no backend yet)
- Gym status changes (platform admin concern)

---

## API Surface

**New endpoints:**

`GET /api/gyms/:gymId/profile`
- Guard: `@Role('owner')`
- Returns: `GymProfileDto { id, name, description, location, status, createdAt }`

`PATCH /api/gyms/:gymId/profile`
- Guard: `@Role('owner')`
- Body: `{ name?: string, description?: string, location?: string }` (all optional, at least one required)
- Returns: updated `GymProfileDto`

Both endpoints: `gymId` validated against `CurrentGym` JWT claim.

---

## Tasks

### Task #1 — Backend: GET + PATCH /api/gyms/:gymId/profile

- New DTO: `GymProfileDto { id, name, description, location, status, createdAt }` with `@ApiProperty` decorators
- New query service: `GetGymProfileService.getProfile(gymId)` — fetches `GymEntity` by `gymId`, maps to `GymProfileDto`; throw `NotFoundException` if not found
- New DTO: `UpdateGymProfileDto { name?, description?, location? }` with optional validators (`@IsString`, `@MinLength(1)` on name and location, `@IsOptional` on all)
- New command + handler: `UpdateGymProfileCommand` / `UpdateGymProfileHandler` — loads gym, applies partial updates, saves, returns `GymProfileDto`
- Wire both endpoints in `gym-configuration.controller.ts` with full Swagger decorators
- `gymId` always from `@CurrentGym()` — validate route param matches

**Status:** ✅ Complete

---

### Task #2 — UX Design: Gym Profile tab

- Open `designs/gym-owner-screens.pen` and find the existing Gym Settings frame
- Add a new state variant frame `Gym Settings / Profile` beside the existing ones
- Same sidebar + tab bar as existing Gym Settings frames, with a new "Profile" tab active
- Content:
  - Section header "Gym Profile" + "Save Changes" primary button (top-right, only active when form is dirty)
  - Form with three fields:
    - "Gym Name" — text input, pre-filled (e.g. "CrossFit Downtown")
    - "Description" — multiline text area (e.g. "A community-driven CrossFit box...")
    - "Location" — text input (e.g. "123 Main St, New York, NY")
  - Read-only info row: Status badge (e.g. green "Active") + "Member since" date
  - Logo placeholder: greyed-out area with "Logo upload coming soon" label
- Match card, input, and button patterns from existing Gym Settings frames

**Status:** ✅ Complete

---

### Task #3 — Frontend: Gym Profile tab in gym-settings.tsx

- Run `npm run generate:api-types` first
- Design reference: `designs/gym-owner-screens.pen`, frame `Gym Settings / Profile` (from Task #2)
- In `frontend/app/gym-settings.tsx`:
  - Add "Profile" as a 4th tab (after Spaces, Class Types, Booking Rules)
  - Fetch `GET /api/gyms/:gymId/profile` on tab focus
  - Form: Name (text input), Description (multiline), Location (text input)
  - "Save Changes" button enabled only when form is dirty → `PATCH /api/gyms/:gymId/profile` → refresh
  - Read-only: Status badge + created date
  - Logo placeholder: greyed box with "Logo upload coming soon"
- `gymId` always from `GymContext`
- Types from `@/types/api.gen.ts`
- TypeScript strict mode; `npx tsc --noEmit` must pass

**Status:** ✅ Complete

---

## Security Invariants

- Both endpoints enforce `@Role('owner')` — coaches and athletes cannot access or modify gym profile
- `gymId` from `@CurrentGym()` JWT claim — owners can only edit their own gym

---

## Done When

- [x] `GET /api/gyms/:gymId/profile` returns gym name, description, location, status
- [x] `PATCH /api/gyms/:gymId/profile` updates and returns updated profile
- [x] Swagger schema accurate
- [x] Gym Profile tab frame exists in `gym-owner-screens.pen`
- [x] Profile tab visible in Gym Settings with working read/edit form
- [x] Save button only enabled when form is dirty
- [x] TypeScript compiles cleanly across backend and frontend
