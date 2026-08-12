# Membership Plans — open follow-ups

**Source:** the whole-branch review of the Membership Plans epic (2026-08-12). Lifted out of
that epic's SDD workspace before it was deleted, because the workspace is git-ignored scratch
and these items outlive it.

Everything the epic **closed** is recorded in `epics/MEMBERSHIP_PLANS_EPIC.md`. This file is
only what is still open. Line numbers were accurate at commit `5b1c78e` and will drift.

---

## 1. The `@Column('date')` parse seam (F1 + F3) — ✅ DONE 2026-08-12 (uncommitted)

Fixed by routing every calendar-date read through `backend/src/domain/shared/calendar-day.ts`
(`toCalendarDay`): a bare `YYYY-MM-DD` is returned verbatim and never re-parsed as an instant,
while real `Date`/ISO/ms values are still truncated on the server-local calendar. Both `KNOWN
SEAM` tests flipped, the athlete/owner/class-detail render paths gained coverage, and the
accidental one-day grace period after expiry is gone (accepted: expired is expired).

**The WRITE side had the same seam and was worse — found after the read fix and fixed too.**
The original write-up below only diagnosed reads. `class-scheduling.controller.ts` was calling
`new Date(dto.scheduledDate)` before the command was even built, and TypeORM's
`preparePersistentValue` → `mixedDateToDateString` reads *local* getters, so west of UTC an
owner creating a Friday class **stored Thursday** — corrupt data no read fix could recover.
Three write sites: `create-class.handler.ts`, `edit-class.handler.ts`, and
`create-recurring-classes.handler.ts` (a whole generated series plus
`ClassSeriesEntity.startDate`/`endDate`, all shifted). `CreateClassCommand`/`EditClassCommand`
now type `scheduledDate` as `string`, and every `@Column('date')` assignment goes through the
new `toPersistedCalendarDay(day)`, which is the single documented place the "declared `Date`,
string at runtime" lie is told. `parseScheduledDateTime` also had a related defect: `setHours`
on a UTC-midnight `Date` evaluated the must-be-in-the-future check against the previous day.

423/423 backend tests pass under the `America/New_York` pin; `tsc --noEmit` clean. Guards assert
on the value that reaches `save` via `mixedDateToDateString`, not on a subsequent read — reads
are now correct and would mask a wrong stored day. Six mutations verified, each restored.

**Still open from F3:** the owner's member list ships `expiresAt: Date | null`
(`queries/gym-configuration/dto/gym-member-item.dto.ts`) — a raw instant the client renders in
UTC. The athlete's cutoff note is now a local calendar day, so the two surfaces can still name
days one apart. Closing that is a DTO-contract change and was deliberately left out of the
parse fix.

Original write-up below.

**Confirmed a live bug on any west-of-UTC deployment**, and pre-existing — it predates the
epic, but the epic layered new enforcement on top of it and shipped two tests asserting the
wrong behaviour.

`scheduledDate` is a **string** at runtime: `pg`'s OID-1082 parser returns a Date at local
midnight, and TypeORM then overwrites it with a string via `PostgresDriver.prepareHydratedValue`'s
`date` branch (`DateUtils.mixedDateToDateString`, local getters). The stored value is correct.
The defect is application code that re-parses that string with `new Date()` — which yields UTC
midnight — and then reads **local** getters, producing a day one early.

- Parse sites: `backend/src/queries/class/class-schedule.service.ts` (`formatDate`, consumed by
  the athlete, owner, coach and class-detail paths), `book-class.handler.ts`, `edit-class.handler.ts`
- **Fix the parse, not the comparison.** In the coverage comparison the two errors partially
  cancel, so "correcting" the comparison alone would break a case that currently works.
- Two tests pin the current seam and must flip, both marked `KNOWN SEAM` in-file:
  `class-schedule.service.spec.ts` and `book-class.handler.spec.ts`. Find them by content, not
  by line — they have already moved once.
- Delete the dead `instanceof Date` branches (5 of them) that assume the pg Date survives.
- Re-run the whole backend suite under a west-of-UTC `TZ` via `backend/test/jest-tz.setup.ts`.

F3 is the same root cause surfacing as a **UI self-contradiction**: the athlete's cutoff note is
built with local getters while the owner's list ships a raw instant rendered in UTC, so the two
screens can name days one apart for the same expiry. Fixing the parse fixes both.

Training history is **not** affected — `String(x).slice(0, 10)` is exact on the string path.

## 2. Frontend jest has no timezone pin — ✅ DONE 2026-08-12 (uncommitted)

Pinned to `Asia/Kolkata` (+05:30, no DST, half-hour offset) via `frontend/jest-tz.setup.ts` +
`globalSetup` in `jest.config.ts`, guarded by `frontend/__tests__/jest-tz.test.ts`, which
asserts the **offset** (`-330`), not just the zone name. Proven load-bearing rather than
assumed: unpinned + a local-getter rewrite of `nextCycleDate` + `TZ=UTC` passed 24/24
(tautological); pinned + the same rewrite failed 1; pinned + correct passed 24/24. Whole
frontend suite green (28 suites / 352 tests).

Original write-up below.

`backend/test/jest-tz.setup.ts` pins the backend via `globalSetup`. There is **no frontend
equivalent**, so a UTC-vs-local assertion is tautological on a UTC CI runner. Pin it with a
**positive-offset** zone (a negative offset would make the existing suite's assumptions pass for
the wrong reason).

Setting `process.env.TZ` inside a spec silently no-ops — V8 caches the zone. It must be
`globalSetup`, and the spec should assert the offset it expects.

## 3. `GET /api/gyms/:gymId/members` has zero e2e coverage

The strongest of the accepted items. It is now the epic's most owner-visible endpoint and has no
black-box test over the guard chain or gym-scoping. Both were verified **by reading** during the
review, never executed. Recommended as the first follow-up.

## 4. Smaller confirmed defects

- **F6** — extending expiry to *tomorrow's local date* returns 400 during the evening on a
  west-of-UTC server: `gym-members.controller.ts` parses the bare `YYYY-MM-DD` with `new Date()`
  (UTC midnight) and `extend-membership.handler.ts` guards `getTime() <= Date.now()`. The
  rejection window is one offset-length per day. Over-strict, never permissive.
- **F7** — `membership-renewal.scheduler.ts` increments `rolled`/`expired` *before* `await save`
  inside the same `try`, so a failed save lands the row in both a success bucket and `failed`, and
  the tick summary can exceed `due.length`. Log accuracy only.
- **F8** — the owner loses the **plan name** once the scheduler flips a row to `status='expired'`:
  `loadActivePlans` filters `status:'active'`, so `planId`/`planName`/`expiresAt` all go null and
  the member shows "expired" with `—` where the plan was. Correct per the DTO contract, but the
  owner cannot see *which* plan lapsed. Product question, not a defect.
- **Deferred #7** — the rolled-row assertions in `test/membership-renewal.e2e-spec.ts` are loose
  (`> a date`, `autoRollCount > 0`), so a wrong cycle count or cycle length would pass. Tightening
  needs the dev DB, which must not be reset or mutated.
- **Deferred #18** — `GET /api/gyms/:gymId/classes` routes athlete, owner and coach into
  `getClassScheduleForAthlete`, so a staff member who *also* holds an athlete membership with a
  lapsed plan now 403s on that shared route. Same shape as the F2 defect the epic fixed, but not
  fixed by it. Low impact: owners and coaches have their own routes.
- **Deferred #5** — `billingCycle ?? 'monthly'` in the scheduler is a silent wrong-answer default.
  Unreachable today (the finder passes the relation, the type is a two-value union) and **not**
  widened by the dedup — the shared functions require a `billingCycle`, so it still has exactly one
  call site. Throwing would be safer.

## 5. Bulk membership operations — DEFERRED past first real customers

**Ruling (user, 2026-08-12): do not build this yet.** It waits until the app has been tested by
real customers and their feedback says whether they want it — and, if they do, what they expect a
bulk plan change to do to each member's paid-up date. Guessing that now is how the wrong shape
gets built. Do not re-propose it before then; the notes below are for when it comes back.

Raised 2026-08-12 while testing a 40-member roster on a device. There is **no ruling either
way** on the design: the only "no bulk edits" line in Tier 1 (`docs/DECISIONS.md:16`) sits under
`## Class Recurrence` and is about classes, and the epic's `Excluded (Future Work)` list does
not mention member operations. So this is open, not declined.

The real owner tasks it serves: "price rise — move everyone off Basic onto Basic v2", and
"turn auto-renew off for these five who stopped paying". Both are one-at-a-time today.

- **Frontend** — selection state on the members list (checkbox column desktop / long-press
  mobile), a selection action bar, and a confirm step naming the exact row count. The action
  bar's primary is the view's one accent; per-row controls stay `quiet`.
- **Backend** — the loop is the easy half. Each of `plan` / `expiry` / `auto-roll` validates and
  writes a single membership. Bulk needs a **decided failure policy**: all-or-nothing in a
  transaction, or per-row isolation with a report of which rows failed and why. The
  recurring-classes epic set a precedent for the second shape ("skip past occurrences and
  report"), and expiry has a genuine per-row failure mode in the must-be-in-the-future guard.
- **Scope trap, and the reason this needs a product decision first** — assigning a plan resets
  the expiry from the billing cycle, so a naive bulk plan change silently rewrites every
  selected member's paid-up date. Whether bulk plan change preserves expiry is a product call.

Sized as its own small epic rather than an addition to the closed Membership Plans one.

## 6. Parked design questions — ✅ CLOSED 2026-08-12

Both reviewed live by the user, who accepted the shipped design as-is. **Neither is open.**

- **No amber token** — declined. `expiring` / `expired` / `inactive` stay `StatusChip
  tone="neutral"`, distinguished by label. Recorded in `frontend/DESIGN.md` → Status Roles so it
  is not re-raised.
- **Five segmented tabs in Gym Settings** — accepted at 390px, no reflow needed.


## 7. Four class DTOs declare `scheduledDate: Date` — contract cleanup

Surfaced by the parse-seam fix (§ 1) and deliberately **not** changed by it: narrowing a
response type is a Swagger change plus a frontend `npm run generate:api-types` regen, which is
not a bug fix.

Three of the four declarations are simply **wrong today** — they say `Date` while shipping the
hydrated `'YYYY-MM-DD'` string: `manually-transition-class-state-response.dto.ts`,
`update-class-structure-response.dto.ts`, `toggle-loggable-status-response.dto.ts`.

`create-class-response.dto.ts` is the odd one out in two directions: it is the only one whose
runtime value **matches** its declaration (the handler re-inflates the stored day to a
UTC-midnight instant precisely to keep the response byte-identical), and therefore the only one
**inconsistent with every other class endpoint**, all of which ship a bare day.

Cheapest coherent end state: all four typed `string` with `example: '2026-08-21'`, and the
re-inflation in `create-class.handler.ts`'s `mapToResponseDto` deleted. Risk is any frontend
consumer doing `new Date(res.scheduledDate)` on the create response — though note that parse is
*already* wrong for the athlete/owner/coach payloads, which have always shipped bare days.

Sibling debt, same shape: the `expiresAt: Date | null` remnant in § 1, and the standing rule
that a `T | null` `@ApiProperty` always needs an explicit `type:`.

## 8. Duplicate `create-class.handler.spec.ts`

`src/commands/class/create-class.handler.spec.ts` is a stale near-duplicate of the canonical
`src/commands/class/handlers/create-class.handler.spec.ts`. Both match jest's `testRegex`, so
both run, and any change to the handler must be mirrored into both to keep `tsc` clean — which
the § 1 fix had to do. Delete the non-`handlers/` copy after confirming it asserts nothing the
canonical one does not.
