# Design Spec — Recurring Class Series (B1, Create-Only)

**Date:** 2026-08-06
**Epic:** `epics/RECURRING_CLASSES_EPIC.md`
**Status:** Approved for planning

---

## Problem

Owners create classes one at a time, but a box's weekly schedule repeats. They need
to define a recurring pattern once and have the system generate all the concrete
classes. B1 delivers create-only generation and records the series that produced the
classes so a future B2 can manage series without a data migration.

---

## Approach

Persist a `ClassSeries` row capturing the full recurrence rule, generate concrete
`Class` rows from it, and stamp each with `seriesId`. Generated classes are ordinary
classes — booking, lifecycle, and athlete visibility are unchanged and read nothing
from `seriesId`. This is the deliberate B1/B2 split: B1 writes the breadcrumb, B2
(future) reads it to offer management.

---

## Data Model

### New entity: `ClassSeries`

Gym-scoped. Stores the complete rule so B2 can display and re-apply it.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `gymId` | uuid | tenant scope |
| `classTypeId` | uuid | |
| `coachUserId` | uuid | |
| `spaceId` | uuid | |
| `weekdays` | int[] | ISO-ish 0=Sun … 6=Sat; ≥1 entry |
| `scheduledTime` | time (HH:mm) | shared across all occurrences |
| `duration` | int (minutes) | |
| `capacity` | int nullable | null → space base capacity at generation |
| `startDate` | date | inclusive |
| `endDate` | date | inclusive |
| `createdByUserId` | uuid | the owner |
| `createdAt` | timestamp | |

### `ClassEntity` change

- Add nullable `seriesId: uuid | null` (FK → `ClassSeries.id`). Null for
  single-created classes. Index later if B2 needs series lookups.

`synchronize: true` applies both changes; no manual migration. No change to any
existing class field, index, or relationship.

---

## Backend: Generation Endpoint

`POST /api/gyms/:gymId/classes/recurring` — owner-only, same guard stack as
single-class create (`JwtAuthGuard, GymOwnershipGuard, RolesGuard` + `@Role('owner')`).

### Request DTO (`CreateRecurringClassesDto`)

```
classTypeId: string (uuid)
coachUserId: string (uuid)
spaceId:     string (uuid)
weekdays:    number[]      // ≥1, each 0–6, unique
scheduledTime: string      // HH:mm
duration?:   number        // ≥1, default 60
capacity?:   number        // ≥1, default → space base capacity
startDate:   string        // YYYY-MM-DD
endDate:     string        // YYYY-MM-DD, ≥ startDate
```

### Handler flow (`CreateRecurringClassesHandler`)

1. **Validate rule:** ≥1 weekday (unique, 0–6), valid time, `endDate ≥ startDate`.
2. **Cap check:** reject if `endDate` is more than **6 months after `startDate`**
   (`invalidState`). Bounds volume before any expansion.
3. **Shared-entity preconditions** (once, reuse create-class logic): owner verified;
   gym active; classType exists & belongs to gym; coach is active gym-staff coach;
   space exists & belongs to gym; resolved capacity > 0.
4. **Expand** `{weekdays, startDate..endDate, scheduledTime}` → ordered occurrence
   dates. Step day-by-day; keep dates whose weekday ∈ `weekdays`. Combine each date
   with `scheduledTime` for the concrete datetime.
5. **Per-occurrence filter:**
   - **Skip past:** datetime ≤ now → count `skippedPast`.
   - **Skip exact duplicate:** a non-deleted class with the same
     `classTypeId + coachUserId + spaceId + scheduledDate + scheduledTime` already
     exists → count `skippedDuplicate`. (Idempotent re-runs.)
   - Two *different* classes sharing space+time is allowed — **no collision check.**
6. **Persist:** save the `ClassSeries` row, then bulk-insert the surviving `Class`
   rows (`state: 'published'`, `seriesId` set, capacity/duration resolved).
   - If **zero** classes survive (all past/duplicate), still return a summary with
     `created: 0`; do **not** persist an empty series (avoid orphan rule rows).
7. **Return** `CreateRecurringClassesResponseDto`:
   `{ seriesId: string | null, created: number, skippedPast: number, skippedDuplicate: number }`
   (`seriesId` null when `created === 0`).

### Swagger / types

Full `@ApiOperation/@ApiResponse/@ApiBody` on the endpoint and `@ApiProperty` on both
DTOs. Verify at `/api-docs`, then `npm run generate:api-types`; frontend imports the
generated `CreateRecurringClassesDto` / response type.

---

## Frontend

Extend `frontend/app/create-class.tsx` with a **Single | Recurring** mode toggle at
the top of the form.

- **Single mode:** the existing form, submitting to `POST .../classes`. Unchanged.
- **Recurring mode:** same fields (class type, coach, space, capacity, duration,
  time) **plus**:
  - **Weekday selector** — seven Mon–Sun toggle chips; ≥1 required.
  - **Start date** and **End date** pickers (reuse the existing `DateTimeField`).
  - No single "Date" field in this mode.
  - Submits to `POST .../classes/recurring`.
- **Result:** on success show the summary before returning to schedule, e.g.
  *"Created 24 classes · 2 skipped (past) · 1 skipped (already scheduled)."* If
  `created === 0`, show an explanatory message rather than a silent success.
- **Validation** mirrors backend: ≥1 weekday, valid time, end ≥ start, and surface the
  6-month cap error from the API response.

Built with Impeccable directly on the real code, matching current owner-screen
styling (existing create-class form is the visual reference). No `.pen` mock.

---

## Out of Scope (B2 / later)

- All series management: edit, cancel, "this & following" cascade.
- Occurrence-count boundary (end-date only).
- Per-day-varying times in one series.
- Booking / lifecycle / athlete-visibility changes.
- Notifying athletes or coaches on series creation.

---

## Testing

- **Unit (backend):** weekday expansion correctness; DST-safe day stepping; 6-month
  cap rejection; past-skip counting; exact-duplicate skip; allowed same-space/time;
  zero-survivor case returns `created:0` with null seriesId and no persisted series;
  owner-only guard; each shared-entity precondition; summary counts.
- **Contract:** `/api-docs` shows the endpoint + DTOs; `generate:api-types` succeeds.
- **Frontend:** single mode regression-clean; recurring mode builds a series and
  renders the summary; validation errors display. Live-verified via Impeccable finish
  review against the running app.
