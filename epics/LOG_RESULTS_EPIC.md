# EPIC: Log Results & Training History (Epic D)

**Status:** 🔄 IN PROGRESS  
**Start Date:** 2026-05-04  
**Owner:** Backend + Frontend team  
**Depends on:** `epics/ATHLETE_SCREENS_EPIC.md` — ✅ Complete  
**Next epic:** TBD

---

## Objective

Complete the athlete post-class loop. After attending a completed class, athletes can log their workout result and view their full training history across all past attended classes.

When complete, the app will support:
- Athletes logging results for completed classes they attended (metric + optional notes)
- Athletes editing results until the class is archived
- Athletes viewing their training history (all attended classes with result status)
- My Bookings surfacing a "Log Result" CTA on completed class cards

---

## Current State

- Backend result endpoints exist: `POST` (log) and `PATCH` (edit) are implemented
- `GET /api/gyms/:gymId/classes/:classId/results` exists but is coach/owner-only
- No athlete-facing training history endpoint exists
- No Log Results or Training History screens exist in the frontend
- My Bookings shows completed class cards but has no path to result logging

---

## Scope

### Included

- **Training history endpoint** — athlete fetches their own past attended classes with result data
- **Log Results screen** — metric form driven by class type, submit/edit result
- **Training History screen** — list of attended classes with result badges, tap to log/view
- **My Bookings → Log Results** — CTA on completed class cards

### Excluded

- Personal records (separate tracking, Phase 2)
- Leaderboards or result comparisons
- Coach-facing result viewing changes (already implemented)
- Result deletion
- Result logging for archived classes (enforced by backend)

---

## Data Model

No new entities. All relevant entities are already defined in `docs/DATA_MODEL.md`:

**Result**
- `class_id`, `user_id`, `metric_type`, `value`, `unit`, `notes`, `logged_at`, `edited_at`
- `metric_type` and `unit` must align with the class type's `result_metrics`
- Only creatable/editable while class state = `completed`
- Athlete must have `present = true` in Attendance

**Relevant rules (from DATA_MODEL.md and DECISIONS.md):**
- Athlete can only log results for classes they attended (`present = true`)
- Athletes can edit results as many times as they want until the class is archived
- `result_metrics` on ClassType drives which fields appear in the form

---

## API Surface

### New (Task #1)

`GET /api/gyms/:gymId/athletes/me/history`
- Auth: athlete only
- Returns: list of attended classes (completed or archived) with class metadata + logged result if one exists
- Gym-scoped (gymId enforced)

### Existing (no changes needed)

- `POST /api/gyms/:gymId/classes/:classId/results` — log a result
- `PATCH /api/gyms/:gymId/classes/results/:resultId` — edit a result

---

## Tasks

### Task #1 — Backend: Training history endpoint

- [ ] New query: `GET /api/gyms/:gymId/athletes/me/history`
- Returns attended classes (completed or archived) for the authenticated athlete in this gym
- Each item includes: classId, class name, class type, scheduled date, result (if logged), class state
- Swagger decorators complete and accurate
- gymId isolation enforced

**Status:** ⏳ Not started

---

### Task #2 — UX Design

Add frames to `designs/athlete-screens.pen`:

- **Log Results** — shows class name + programming at top for reference; metric input fields (driven by `result_metrics`); optional notes field; Submit / Save button; edit state if result already exists
- **Training History** — list of attended classes with date, class name, result badge ("Logged" / "Not logged"); tap navigates to Log Results

**Status:** ⏳ Not started

---

### Task #3 — Frontend: Log Results screen

- Implement Log Results screen navigable from My Bookings and Training History
- Fields rendered based on class type's `result_metrics` (time, reps, weight, rounds, note)
- Calls `POST` to create; `PATCH` to edit if result already exists
- Shows programming content above the form if available
- Types from `src/types/api.gen.ts` (regenerate after Task #1)

**Status:** ⏳ Not started

---

### Task #4 — Frontend: Training History screen

- New tab in athlete navigation: "Training" (or "History")
- Fetches from `GET /api/gyms/:gymId/athletes/me/history`
- List of attended classes with date, class type, result badge
- Tap on a completed class → Log Results screen
- Tap on an archived class → read-only result view (no edit)
- Empty state when no attended classes yet

**Status:** ⏳ Not started

---

### Task #5 — Frontend: My Bookings → Log Results

- Completed class cards in My Bookings show a "Log Result" CTA (or "View Result" if already logged)
- Navigates to Log Results screen
- Past classes tab scoped to show this CTA only for `completed` state classes

**Status:** ⏳ Not started

---

## Security Invariants

- Athletes can only read and write their own results (userId from JWT, never from request body)
- gymId must be validated against the class — athletes cannot log results for classes in other gyms
- Attendance check enforced server-side before result creation (`present = true` required)
- Result edits blocked server-side once class transitions to `archived`

---

## Done When

- [ ] `GET /api/gyms/:gymId/athletes/me/history` returns correct data, gym-scoped
- [ ] Log Results screen renders fields matching class type, submits and edits successfully
- [ ] Training History screen lists attended classes with correct result status
- [ ] My Bookings completed cards link to Log Results
- [ ] TypeScript compiles cleanly, Expo dev server starts without errors
- [ ] Swagger schema updated and accurate
