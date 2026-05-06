# EPIC: Members List (Epic H)

**Status:** ✅ COMPLETE (2026-05-06)  
**Start Date:** TBD  
**Owner:** Backend + Frontend team  
**Depends on:** `epics/GYM_SETTINGS_EPIC.md` — ✅ Complete  
**Next epic:** TBD

---

## Objective

Gym owners can invite athletes and those athletes join the gym, but there is currently no screen to see who is actually a member. This epic adds a Members screen to the gym owner sidebar — a simple read-only roster showing all active members with their name, email, and join date.

---

## Current State

- `GymMembershipEntity` exists with `userId`, `gymId`, `status`, `joinedAt` and a `user` relation (name, email)
- `GymMembershipRepository.getGymMembershipsByGym(gymId)` exists but does not eager-load the `user` relation
- No `GET /api/gyms/:gymId/members` endpoint exists
- No Members screen exists in the frontend
- The sidebar likely has a disabled "Members" nav item — needs enabling and wiring

---

## Scope

### Included

- `GET /api/gyms/:gymId/members` endpoint — owner only, returns active members with name + email + joinedAt
- UX design: Members screen frame in `designs/gym-owner-screens.pen`
- Frontend: `members.tsx` screen — roster table with name, email, join date
- Frontend: enable and wire "Members" sidebar nav item in `schedule-dashboard.tsx` and `class-management.tsx`

### Excluded

- Removing / deactivating members (separate action, no design yet)
- Membership plan details per member (separate screen)
- Pagination (MVP roster is small)
- Search / filter

---

## API Surface

**New endpoint:**

`GET /api/gyms/:gymId/members`
- Guard: `@Role('owner')`
- Response: `{ members: GymMemberItemDto[] }`

```
GymMemberItemDto {
  id: string          // gymMembership id
  userId: string
  name: string        // from user relation
  email: string       // from user relation
  status: 'active' | 'inactive'
  joinedAt: Date
}
```

Returns only `status: 'active'` members, sorted by `joinedAt` descending.

---

## Tasks

### Task #1 — Backend: GET /api/gyms/:gymId/members

- New query service: `GetGymMembersService.getMembersByGym(gymId)` — queries active memberships with `user` relation eager-loaded, sorted by `joinedAt DESC`
- New response DTOs: `GymMemberItemDto`, `GetGymMembersResponseDto`
- New endpoint in `gym-configuration.controller.ts` (or a new `members.controller.ts`): `GET /api/gyms/:gymId/members`, `@Role('owner')`, full Swagger decorators
- Verify at `/api-docs`

**Status:** ✅ Complete

---

### Task #2 — UX Design: Members screen

- Add a new frame `Members` to `designs/gym-owner-screens.pen`
- Layout: sidebar (Members nav item active) + main content area
- Content: page header "Members" + member count; table with columns: Name | Email | Joined | Status badge (active = green)
- 3–4 example rows with realistic data
- Empty state: icon + "No members yet" description
- Match existing gym owner screen patterns (same sidebar, card, table row style as Gym Settings)

**Status:** ✅ Complete

---

### Task #3 — Frontend: Members screen + sidebar wiring

- Run `npm run generate:api-types` first
- New file: `frontend/app/members.tsx`
- Register in `_layout.tsx` stack with `headerShown: false`
- Implement from Pencil design (Task #2 frame): sidebar with Members active, members table, empty state
- Fetch `GET /api/gyms/:gymId/members` on mount; `gymId` from `GymContext`
- In `schedule-dashboard.tsx` and `class-management.tsx`: find the Members sidebar nav item, change `enabled: false` → `true`, wire `router.push('/members')` when `key === 'members'`
- Types from `@/types/api.gen.ts`
- TypeScript strict mode; `npx tsc --noEmit` must pass

**Status:** ✅ Complete

---

## Security Invariants

- Endpoint enforces `@Role('owner')` — coaches and athletes cannot access the roster
- `gymId` scoped: only members of the requesting owner's gym are returned
- `gymId` always comes from JWT claims (`CurrentGym`), never from user input

---

## Done When

- [x] `GET /api/gyms/:gymId/members` returns active members with name + email + joinedAt
- [x] Swagger schema updated and accurate
- [x] Members frame exists in `gym-owner-screens.pen`
- [x] `members.tsx` renders roster matching design (table + empty state)
- [x] Members nav item enabled and navigates correctly from both sidebar screens
- [x] TypeScript compiles cleanly across backend and frontend
