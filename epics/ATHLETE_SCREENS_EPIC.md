# EPIC: Athlete Screens Redesign (Epic C.1)

**Status:** ✅ COMPLETE  
**Start Date:** 2026-05-03  
**End Date:** 2026-05-03  
**Owner:** Frontend team  
**Depends on:** `epics/AUTH_FLOWS_EPIC.md` — ✅ Complete  
**Next epic:** `epics/INVITE_EPIC.md` (Epic C.2 — Invite & Onboarding)

---

## Objective

Redesign the athlete-facing screens (Schedule, Class Details, My Bookings) to match the visual designs in `designs/athlete-screens.pen`.

Currently, the athlete screens were built without design reference and use ad-hoc styling. This epic brings them into alignment with the design system.

When complete, all athlete screens will have consistent visual hierarchy, typography, spacing, and component usage per the Pencil designs.

---

## Current State

- Schedule screen (`/(tabs)/schedule.tsx`) — shows class list, no design alignment
- Class Details screen (`/class-details.tsx`) — shows booking UI, no design alignment
- My Bookings screen (`/(tabs)/my-bookings.tsx`) — shows athlete's bookings, no design alignment
- Design frames exist in `designs/athlete-screens.pen` but are not yet implemented

---

## Scope

### Included
- Redesign Schedule screen per `designs/athlete-screens.pen` — frame: "Schedule"
- Redesign Class Details screen per `designs/athlete-screens.pen` — frame: "Class Details"
- Redesign My Bookings screen per `designs/athlete-screens.pen` — frame: "My Bookings"
- Extract and apply design tokens (colors, typography, spacing)
- Ensure responsive layout and touch targets
- All screens must pass TypeScript strict mode
- No functional changes — only visual/structural alignment

### Excluded
- Adding new functionality (e.g., filters, sorting)
- Changing backend contracts
- Adding new screens or flows

---

## Tasks

### Task #1: Design Extraction — Schedule Screen
**Agent:** frontend-developer | **Type:** FEATURE

DESIGN REFERENCE: `designs/athlete-screens.pen` — frame: "Schedule"

Extract visual specs from the Schedule frame:
- Layout structure (grid/list, gaps, padding)
- Design tokens (colors, typography, spacing)
- Component hierarchy (header, filters, class cards)
- Loading/empty states

Then implement `/(tabs)/schedule.tsx` matching the extracted specs exactly.

The screen displays a list or grid of upcoming classes. Users can tap a class to navigate to Class Details.

### Task #2: Design Extraction — Class Details Screen
**Agent:** frontend-developer | **Type:** FEATURE

DESIGN REFERENCE: `designs/athlete-screens.pen` — frame: "Class Details"

Extract visual specs and implement `/class-details.tsx`.

The screen shows details for a single class: name, time, coach, capacity, description, and a Book/Cancel button based on booking status.

### Task #3: Design Extraction — My Bookings Screen
**Agent:** frontend-developer | **Type:** FEATURE

DESIGN REFERENCE: `designs/athlete-screens.pen` — frame: "My Bookings"

Extract visual specs and implement `/(tabs)/my-bookings.tsx`.

The screen shows the athlete's upcoming and past bookings in a list or timeline view. Users can cancel future bookings.

---

## Dependencies

All three tasks can run in parallel (no inter-task dependencies).

```
Task #1 (Schedule) ───┐
Task #2 (Class Details) ├─→ All complete
Task #3 (My Bookings) ──┘
```

---

## Acceptance Criteria

- [x] Schedule screen renders per design specs
- [x] Class Details screen renders per design specs
- [x] My Bookings screen renders per design specs
- [x] All design tokens (colors, fonts, spacing) extracted and applied
- [x] All screens pass TypeScript strict mode
- [x] Functional behavior (API calls, navigation) unchanged
- [x] Responsive layout works on mobile and web
- [x] No console errors or warnings
- [x] GymContext gymId persists after login (bug fix: athletes now see their gym's classes)

---

## References

- **Design file:** `designs/athlete-screens.pen`
- **Current Schedule:** `frontend/app/(tabs)/schedule.tsx`
- **Current Class Details:** `frontend/app/class-details.tsx`
- **Current My Bookings:** `frontend/app/(tabs)/my-bookings.tsx`
- **Next epic:** `epics/INVITE_EPIC.md` (Invite & Onboarding)
