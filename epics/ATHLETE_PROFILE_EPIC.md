# EPIC: Athlete Profile (Epic K)

**Status:** ✅ COMPLETE (2026-05-06)  
**Start Date:** TBD  
**Owner:** Backend + Frontend team  
**Depends on:** `epics/AUTH_JWT_EPIC.md` — ✅ Complete  
**Next epic:** TBD

---

## Objective

Athletes have no way to view or edit their own profile. There is no profile screen and no endpoint to read or update the current user's details. This epic adds a basic profile screen accessible from the athlete tab bar — showing name and email, with the ability to edit the name.

---

## Current State

- `UserEntity` has `name`, `email`, `status`, `createdAt`
- `GET /api/me/bookings` exists but no `GET /api/me` or `PATCH /api/me` endpoint
- No profile screen exists in the frontend
- Athlete tab bar has an `explore` tab that is unused — profile can replace or sit alongside it

---

## Decisions

- **Editable fields:** `name` only for MVP — email changes require verification flow (deferred)
- **Endpoint scope:** user-scoped (`/api/me`), not gym-scoped — profile is cross-gym
- **Tab placement:** replace the unused `explore` tab in the athlete bottom nav with `profile`

---

## Scope

### Included

- `GET /api/me` — returns current user's `id`, `name`, `email`, `createdAt`
- `PATCH /api/me` — updates `name`; returns updated user
- UX design: Profile screen frame in `designs/athlete-screens.pen`
- Frontend: `profile.tsx` tab screen replacing the `explore` tab

### Excluded

- Email change (requires verification flow)
- Password change
- Avatar / photo upload
- Unit preference (kg/lb) — deferred
- Notification preferences — deferred
- Account deletion

---

## API Surface

**New endpoints:**

`GET /api/me`
- Guard: any authenticated role (`athlete`, `owner`, `coach`)
- Returns: `UserProfileDto { id, name, email, createdAt }`

`PATCH /api/me`
- Guard: any authenticated role
- Body: `{ name: string }`
- Returns: updated `UserProfileDto`

Both endpoints are user-scoped — `userId` always from JWT `CurrentUser`, never from params or body.

---

## Tasks

### Task #1 — Backend: GET + PATCH /api/me

- New query: `GetUserProfileService.getProfile(userId)` — fetches `UserEntity` by `userId`, maps to `UserProfileDto`
- New DTO: `UserProfileDto { id, name, email, createdAt }` with `@ApiProperty` decorators
- New command + handler: `UpdateUserProfileCommand` / `UpdateUserProfileHandler` — loads user, updates `name`, saves
- New DTO: `UpdateUserProfileDto { name: string }` with `@IsString`, `@MinLength(1)` validators
- Add both endpoints to `user.controller.ts` (already exists at `/api/me`)
- Full Swagger decorators on both
- Verify at `/api-docs`

**Status:** ✅ Done

---

### Task #2 — UX Design: Profile screen

- Add a new frame `Profile` to `designs/athlete-screens.pen`
- Layout: standard athlete screen (bottom tab bar with Profile tab active)
- Content:
  - Avatar circle (64×64, initials-based, `#F0F0F0` background)
  - Name (editable, shown as text with an Edit icon or inline field)
  - Email (read-only, shown as muted text — not editable in MVP)
  - Member since date
  - "Save" button (only visible when name has been changed)
  - Joined gyms count or gym name (read-only, informational)
- Match existing athlete screen design tokens (colors, typography, card patterns from `athlete-screens.pen`)

**Status:** ✅ Complete

---

### Task #3 — Frontend: Profile tab screen

- Run `npm run generate:api-types` first
- New file: `frontend/app/(tabs)/profile.tsx`
- In `frontend/app/(tabs)/_layout.tsx`: replace the `explore` tab with `profile` (icon: `person.fill` or similar)
- Design reference: `designs/athlete-screens.pen`, frame `Profile` (from Task #2)
- On mount: fetch `GET /api/me`; display name, email, member since
- Inline name edit: tap name or edit icon → text becomes editable input → "Save" button appears → `PATCH /api/me` with `{ name }` → refresh display
- Email shown as read-only with a muted label "Email cannot be changed"
- Types from `@/types/api.gen.ts`
- TypeScript strict mode; `npx tsc --noEmit` must pass

**Status:** ✅ Complete

---

## Security Invariants

- `userId` always from JWT `CurrentUser` decorator — user can only read/edit their own profile
- No gymId scoping needed — profile is cross-gym
- Name cannot be empty (`@MinLength(1)` enforced in DTO)

---

## Done When

- [x] `GET /api/me` returns current user's name, email, createdAt
- [x] `PATCH /api/me` updates name and returns updated profile
- [x] Swagger schema accurate for both endpoints
- [x] Profile frame exists in `athlete-screens.pen`
- [x] Profile tab replaces `explore` in athlete bottom nav
- [x] Name edit + save works end-to-end
- [x] Email displayed as read-only
- [x] TypeScript compiles cleanly across backend and frontend
