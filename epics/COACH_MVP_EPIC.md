# EPIC: Coach MVP

**Status:** ✅ COMPLETE (2026-05-03)  
**Start Date:** 2026-04-29  
**Owner:** Backend + Frontend team

---

## Objective

Enable coaches to view their assigned classes, manage programming (WODs), and mark athlete attendance.

This unblocks the full athlete booking loop (athletes can only log results if coaches mark attendance) and enables the gym owner to see their coaches actively working.

---

## Scope

### Included (MVP)
- View assigned classes (coach's own schedule)
- View class details + programming
- Add/edit WOD programming for a class
- Mark athlete attendance

### Deferred
- Result logging by athletes (downstream of attendance)
- Coach profile editing
- Direct messaging to athletes
- Programming templates / library

---

## Design Tasks

### Task #0: Create screen designs (ux-designer agent)
**Status:** ✅ Done — frames added to `designs/coach-screens.pen`

Frames created:
- `My Assigned Classes`
- `Class Details & Programming`
- `Mark Attendance`

---

## Backend Tasks

### Task #1: GET /api/gyms/:gymId/coach/classes — Assigned Classes
**Status:** ✅ Done

### Task #2: Verify existing endpoints are coach-accessible
**Status:** ✅ Done — CRITICAL cross-tenant bugs found and fixed. All 3 command handlers now enforce gymId scoping. Additional endpoints added:
- `GET /api/gyms/:gymId/classes/:classId/programming` — fetch existing WOD
- `GET /api/gyms/:gymId/classes/:classId/results` — fetch class results
- `GET /api/gyms/:gymId/classes/:classId/bookings` — fetch booked athletes

---

## Frontend Tasks

### Task #3: My Assigned Classes screen
**Status:** ✅ Done — `frontend/app/coach-classes.tsx`

### Task #4: Class Details & Programming screen
**Status:** ✅ Done — `frontend/app/coach-class-details.tsx`

### Task #5: Mark Attendance screen
**Status:** ✅ Done — `frontend/app/coach-mark-attendance.tsx`

### Task #6: Coach navigation & routing
**Status:** ✅ Done — routes registered in `_layout.tsx`, View and Mark Attendance buttons wired

---

## Dependencies

```
Task #0 (designs) ──────────────────────────────────────────────┐
Task #1 (GET assigned classes) ─────────────────────────────────┼→ Task #3 ┐
Task #2 (verify programming/attendance endpoints) ──────────────┼→ Task #4 ┤→ Task #6
                                                                └→ Task #5 ┘
```

---

## Acceptance Criteria

- [x] Coach can see only their own assigned classes (not other coaches')
- [x] Coach can view class details and existing WOD programming
- [x] Coach can add WOD programming to a class
- [x] Coach can mark athletes as present or absent
- [x] Navigation between screens works correctly
- [x] All screens use generated API types (no manual type definitions)
- [x] Manual flow verified end-to-end in browser (2026-05-03)

---

## Timeline

**Phase 1: Backend** (1–2 days)
- Task #1: GET assigned classes endpoint + E2E tests
- Task #2: Verify existing endpoints are coach-accessible

**Phase 2: Frontend** (3–5 days)
- Task #3: My Assigned Classes screen
- Task #4: Class Details & Programming screen
- Task #5: Mark Attendance screen
- Task #6: Navigation & routing

**Phase 3: Verification** (1 day)
- Manual browser testing of full coach flow
- Bug fixes

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Existing endpoints have owner-only guards | Blocker for frontend | Verify in Task #2 before frontend starts |
| Attendance UI complex (large roster) | Complexity | Start with simple list, no pagination for MVP |
| Coach auth stub returns wrong userId | Silent bugs | Test with real coach user from dev-bootstrap |

---

## References

- **User Journeys:** `docs/USER_JOURNEYS.md` — Coach flows
- **Data Model:** `docs/DATA_MODEL.md` — GymStaff, Class, Booking entities
- **Designs:** `/designs/` folder
- **Generated types:** `frontend/types/api.gen.ts`
- **Gym Owner Epic (reference pattern):** `context/GYM_OWNER_EPIC.md`
