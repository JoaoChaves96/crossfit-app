# EPIC: Coach MVP

**Status:** 🔄 IN PROGRESS  
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
**Status:** ❌ Not started — BLOCKS all frontend tasks

No `.pen` files exist for coach screens. Run the `ux-designer` agent with:
- Epic: `context/COACH_MVP_EPIC.md`
- Screens: My Assigned Classes, Class Details & Programming, Mark Attendance
- Style reference: `designs/staff-management.pen` (closest existing gym-owner screen)
- Output: `/designs/`

---

## Backend Tasks

### Task #1: GET /api/gyms/:gymId/coach/classes — Assigned Classes
**Status:** ❌ Missing

No endpoint exists for a coach to fetch their own assigned classes. The existing `GET /api/gyms/:gymId/schedule` is owner-only (returns all classes).

Needs to return: class list filtered by `coach_id = requesting user`, with date, time, space, class type, capacity, and booking count.

### Task #2: Verify existing endpoints are coach-accessible

Verify that the following endpoints already work for a coach role (correct gymId scoping, no owner-only guard):
- `POST /api/classes/:classId/programming` — add WOD
- `POST /api/classes/:classId/attendance` — mark attendees
- `POST /api/classes/:classId/transition` — lifecycle transition
- `GET /api/classes/:classId/results` — view results

---

## Frontend Tasks

### Task #3: My Assigned Classes screen
Coach home screen. Lists the coach's upcoming assigned classes, grouped or sorted by date. Uses `GET /api/gyms/:gymId/coach/classes`.

Same sidebar navigation pattern as the gym owner Schedule Dashboard.

### Task #4: Class Details & Programming screen
Displays class info (type, time, space, capacity) and current WOD programming. Allows coach to add/edit programming via `POST /api/classes/:classId/programming`.

### Task #5: Mark Attendance screen
Lists booked athletes for the class. Coach can toggle each athlete as present/absent. Submits via `POST /api/classes/:classId/attendance`.

### Task #6: Coach navigation & routing
Wire up coach-specific navigation (sidebar or tab): My Classes → Class Details → Mark Attendance.

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

- [ ] Coach can see only their own assigned classes (not other coaches')
- [ ] Coach can view class details and existing WOD programming
- [ ] Coach can add WOD programming to a class
- [ ] Coach can mark athletes as present or absent
- [ ] Navigation between screens works correctly
- [ ] All screens use generated API types (no manual type definitions)
- [ ] Manual flow verified end-to-end in browser

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
