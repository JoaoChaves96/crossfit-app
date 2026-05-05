# EPIC: Class Lifecycle & Duration (Epic G)

**Status:** ✅ COMPLETE (2026-05-05)  
**Start Date:** TBD  
**Owner:** Backend + Frontend team  
**Depends on:** `epics/GYM_SETTINGS_EPIC.md` — ✅ Complete  
**Next epic:** TBD

---

## Objective

Classes currently never advance state on their own — they stay `published` forever unless someone manually taps the transition button. This breaks the natural product loop: a class ends, athletes log results, training history fills up. This epic adds a `duration` field to classes and a backend scheduler that auto-transitions class state based on time.

---

## Current State

- `ClassEntity` has `scheduledDate` + `scheduledTime` but **no `duration` field**
- Manual state transitions exist via `POST /:classId/transition` (coach/owner only)
- No scheduled task or cron job exists in the backend
- Class Management screen shows "—" for Duration in the info card
- Create Class form has no duration input

---

## Decisions

- **Duration unit:** minutes (integer, e.g. 60)
- **Booking closes:** 30 minutes before scheduled start time
- **`archived` state:** remains manual — owner/coach deliberate action, not auto
- **Scheduler cadence:** every 1 minute (NestJS `@Cron` with `CronExpression.EVERY_MINUTE`)
- **Timezone:** all class times stored and compared in UTC; frontend displays local time (no change)

---

## State Machine (with triggers)

```
published
  → booking_closed   [auto: 30 min before scheduledStart]
  → in_progress      [auto: at scheduledStart]
  → completed        [auto: at scheduledStart + duration]
  → archived         [manual: owner/coach]
```

---

## Scope

### Included

- Add `duration` (integer, minutes) to `ClassEntity`, migration, all DTOs
- Add `duration` to Create Class command/handler and Swagger
- NestJS scheduler service: polls every minute, bulk-transitions eligible classes
- Frontend: `duration` field in create-class form
- Frontend: show duration in Class Management info card (replace "—")

### Excluded

- Push notifications on state change (separate epic)
- Athlete-facing "class starting soon" banners
- Configurable booking-close window per gym (hardcoded 30 min for MVP)
- `archived` auto-transition

---

## API Surface

**No new endpoints.** The scheduler writes directly to the database via existing repository methods — it is not triggered by HTTP.

`ClassEntity` gains one new column:

| Field | Type | Nullable | Default |
|---|---|---|---|
| `duration` | integer (minutes) | false | 60 |

All existing DTOs that include class data must add `duration`.

---

## Tasks

### Task #1 — Backend: Add `duration` field + migration

- Add `@Column('integer', { default: 60 }) duration: number` to `ClassEntity`
- Write TypeORM migration: `ALTER TABLE classes ADD COLUMN duration INTEGER NOT NULL DEFAULT 60`
- Add `duration` to `CreateClassCommand` + its handler (already validates/saves the entity)
- Add `duration` to all response DTOs that expose class fields: `ClassScheduleItemDto`, `CoachClassItemDto`, `ManuallyTransitionClassStateResponseDto`
- Update all `@ApiProperty` decorators; verify Swagger at `/api-docs`
- Run `npm run generate:api-types` in frontend after backend is working to regenerate `api.gen.ts`

**Status:** ✅ Complete

---

### Task #2 — Backend: Lifecycle scheduler service

- Install `@nestjs/schedule` if not already present (`npm install @nestjs/schedule`)
- Add `ScheduleModule.forRoot()` to `AppModule`
- Create `ClassLifecycleScheduler` as an `@Injectable()` with `@Cron(CronExpression.EVERY_MINUTE)`
- On each tick, the scheduler:
  1. Queries all classes where `state IN ('published', 'booking_closed', 'in_progress')` and `deletedAt IS NULL`
  2. Computes `scheduledStart` by combining `scheduledDate` + `scheduledTime` into a UTC `Date`
  3. Applies transitions:
     - `published` → `booking_closed` if `now >= scheduledStart - 30min`
     - `booking_closed` → `in_progress` if `now >= scheduledStart`
     - `in_progress` → `completed` if `now >= scheduledStart + duration minutes`
  4. Bulk-saves all changed entities in a single repository call
- No HTTP endpoint; no user context; no role check needed (scheduler is internal)
- Log a summary line per tick (e.g. `[ClassLifecycleScheduler] transitioned 3 classes`)

**Status:** ✅ Complete

---

### Task #3 — Frontend: Duration in Create Class + Class Management

- In `frontend/app/create-class.tsx`: add a "Duration (minutes)" numeric input field; include `duration` in the POST body
- In `frontend/app/class-management.tsx`: replace the hardcoded "—" in the Duration info card cell with the actual `duration` value from the fetched class (e.g. "60 min")
- Run `npm run generate:api-types` to pick up the new `duration` field in generated types before making changes
- TypeScript strict mode; `npx tsc --noEmit` must pass

**Status:** ✅ Complete

---

## Security Invariants

- Scheduler runs in process, no HTTP surface — no auth needed
- Scheduler must only transition classes where `deletedAt IS NULL`
- Cross-gym isolation maintained: scheduler operates on all gyms but each class is already gymId-scoped

---

## Done When

- [x] `duration` column exists in DB with default 60
- [x] All class DTOs expose `duration` in Swagger and generated frontend types
- [x] Create Class form includes duration input; creates classes with correct duration
- [x] Scheduler runs every minute and advances class state correctly
- [x] Class Management info card shows real duration (e.g. "60 min") instead of "—"
- [x] TypeScript compiles cleanly across backend and frontend
- [x] Manual transition still works for `archived` state
