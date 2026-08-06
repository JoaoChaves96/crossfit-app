# EPIC: Recurring Class Series (B1 — Create Only)

**Status:** ✅ DONE (B1 delivered 2026-08-06)
**Start Date:** 2026-08-06
**Owner:** Backend + Frontend
**Depends on:** `epics/CLASS_MANAGEMENT_EPIC.md` — ✅ (single-class create/edit exists)
**Next epic:** TBD (B2 — Series Management: edit/cancel "this & following")

---

## Objective

Gym owners create classes one at a time. In practice a box's weekly schedule
repeats — the same classes at the same times every week. This epic lets an owner
define a **recurring series** (e.g. "CrossFit, every Mon/Wed/Fri, 08:00, 60 min,
until Dec 31") that expands into concrete `Class` rows in one action, instead of
creating each class by hand.

This is **B1**: create-only. It generates the classes and records the series that
produced them, so a future **B2** can add series management (edit/cancel forward)
without a data migration. B1 does not build any management UI or cascade behavior.

---

## Current State

- `ClassEntity` is a single concrete row (`gymId`, `classTypeId`, `coachUserId`,
  `spaceId`, `scheduledDate`, `scheduledTime`, `capacity`, `duration`, `state`).
- Created one at a time via `POST /api/gyms/:gymId/classes` (owner-only), with a
  precondition that scheduled date/time is in the future.
- No concept of a series, template, or recurrence exists.
- Frontend `create-class.tsx` is a single-class form.

---

## Decisions

- **Recurrence shape (option B):** one series spans **multiple weekdays at one shared
  time/duration/coach/space/class-type/capacity**. Per-day-varying times are out of
  scope (achieved by creating multiple series).
- **Boundary:** **end-date only** (no "N occurrences" option).
- **Safety cap:** reject a rule that would generate occurrences **more than 6 months
  past `startDate`**.
- **Past occurrences:** **skip and report** (don't block the batch).
- **Duplicates:** skip **only exact duplicates** (same classType + coach + space +
  date + time already exists) and report. This makes re-running a series idempotent.
- **Not a collision:** two *different* classes sharing the same space and time is
  **allowed** (e.g. Open Box + CrossFit in one space at once). No space/time
  collision check.
- **Series row stores the full rule** (weekdays, time, duration, capacity, dates,
  refs, creator) — the cheap breadcrumb B2 needs. Nothing reads it in B1.
- **Generated classes** start in `state: published`, identical to single-create.

---

## Scope

### Included — all delivered ✅

- ✅ New `ClassSeries` entity (gym-scoped, stores the full recurrence rule).
- ✅ New nullable `seriesId` FK column on `ClassEntity` (null for single classes).
- ✅ `POST /api/gyms/:gymId/classes/recurring` (owner-only) — validates, expands,
  skips past + exact-duplicate occurrences, bulk-creates the remainder, persists
  the series, returns a summary `{ seriesId, created, skippedPast, skippedDuplicate }`.
- ✅ Swagger decorators for the new endpoint + DTOs; frontend types regenerated.
- ✅ Frontend: `create-class.tsx` gains a **Single | Recurring** mode toggle. Recurring
  mode adds a weekday selector + start/end date, and shows the creation summary.
- ✅ Built with Impeccable directly on `frontend/` code, matching the current
  owner-screen styling (existing create-class screen is the reference).

### Excluded (deferred to B2 or later)

- Edit-series, cancel-series, "this & following" cascade — **all series management.**
- Occurrence-count option (end-date only).
- Per-day-varying times in a single series (option C).
- Any change to booking, class lifecycle, or athlete visibility.
- Notifying athletes/coaches when a series is created.

---

## Verification

- Backend unit tests: rule expansion (weekday math, DST-safe date stepping),
  6-month cap rejection, past-skip, exact-duplicate skip, allowed same-space/time,
  owner-only guard, shared-entity preconditions, summary correctness.
- Swagger schema accurate at `/api-docs`; `npm run generate:api-types` produces the
  new DTOs.
- Frontend: single mode unchanged; recurring mode creates a series and renders the
  summary. Live-verified against the running app (Impeccable finish review).

---

## Documentation Sync

On completion, update `docs/DATA_MODEL.md` (new `ClassSeries` entity + `seriesId`
field on Class) and `context/PROJECT_STATE.md`. `DATA_MODEL.md` is Tier 1 — the new
entity is a scope addition, so this update is warranted.
