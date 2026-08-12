# Membership Plans — open follow-ups

**Source:** the whole-branch review of the Membership Plans epic (2026-08-12). Lifted out of
that epic's SDD workspace before it was deleted, because the workspace is git-ignored scratch
and these items outlive it.

Everything the epic **closed** is recorded in `epics/MEMBERSHIP_PLANS_EPIC.md`. This file is
only what is still open. Line numbers were accurate at commit `5b1c78e` and will drift.

---

## 1. The `@Column('date')` parse seam (F1 + F3) — one task

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

## 2. Frontend jest has no timezone pin

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

## 5. Bulk membership operations — not decided, never scoped

Raised 2026-08-12 while testing a 40-member roster on a device. There is **no ruling either
way**: the only "no bulk edits" line in Tier 1 (`docs/DECISIONS.md:16`) sits under
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
