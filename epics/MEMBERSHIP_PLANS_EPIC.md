# EPIC: Membership Plans

**Status:** ✅ COMPLETE (2026-08-12)
**Start Date:** 2026-08-11
**Owner:** Backend + Frontend team
**Depends on:** `epics/GYM_SETTINGS_EPIC.md` (✅), `epics/MEMBERS_EPIC.md` (✅)
**Next epic:** TBD

---

## Objective

Owners can define membership plans, assign them to members, control renewal per
member, and the platform enforces plan expiry on class visibility and booking.

---

## Current State (before this epic)

Plan CRUD commands existed with no read endpoint and no UI; `activeMembershipPlan`
was never surfaced on the members list; nothing enforced `expiresAt`.

---

## Scope

### Included

- The plans read endpoint (owner list with subscriber counts)
- The enriched members read model (plan, expiry, derived status)
- The four owner commands: extend expiry, change plan, toggle auto-renew,
  suspend/resume the gym membership
- The hourly renewal scheduler (`MembershipRenewalScheduler`)
- Expiry enforcement in the athlete schedule read model and the booking command
- The Plans settings tab
- The enriched members list (plan, expiry, real status, search)
- The member details panel (the four owner actions)
- The athlete cutoff note on the schedule screen

### Excluded (Future Work)

- Athlete-side plan purchase and payment (spec's Future Work B)
- Class-count-limited plans ("10 classes/month" — the entity has `billing_cycle`
  but no usage counter)
- Proration
- Plan change history
- Email/push notification on renewal or expiry

---

## API Surface

- `GET /api/gyms/:gymId/configuration/membership-plans` — `@Role('owner')` —
  lists the gym's membership plans with active-subscriber counts.
- `PATCH /api/gyms/:gymId/members/:membershipId/membership/expiry` —
  `@Role('owner')` — extends a member's plan expiry to a new future date.
- `PUT /api/gyms/:gymId/members/:membershipId/membership/plan` — `@Role('owner')`
  — assigns a (possibly different) membership plan to a member, expiring any
  existing active row and creating a fresh one.
- `PATCH /api/gyms/:gymId/members/:membershipId/membership/auto-roll` —
  `@Role('owner')` — turns a member's per-row `autoRoll` on or off; turning it
  back on resets `autoRollCount` to 0.
- `PATCH /api/gyms/:gymId/members/:membershipId/status` — `@Role('owner')` —
  suspends or resumes the member's `GymMembership`.

---

## Tasks

1. Add per-member auto-roll columns to `AthleteMembershipPlan` — `d23bf50`
2. Hourly renewal scheduler (roll or expire) — `2fe9a00`, `d73a8af`
3. Owner membership-plans read endpoint (subscriber counts) — `e3e5472`
4. Enriched members read model (plan, expiry, derived status) — `6117c35`
5. Owner command: extend a member's plan expiry — `c1dc957`
6. Owner command: assign a membership plan to a member — `a34b724`,
   `6d613db`, `1bc4d1d`, `ed661e5` (relation fix: a membership must hold many
   plan rows over time; see below)
7. Owner commands: suspend/resume a member, toggle auto-renew — `ac06c13`
8. Expiry enforcement in the athlete schedule read model and the booking
   command — `6967f8d`, `4aeb374`, `60c3ad2`
9. Regenerate frontend API types — `87d8c84`
10. Frontend: Plans settings tab — `b97d4ee`, `2e6bc58`
11. Frontend: members list — plan, expiry, real status, search — `33604e9`,
    `a6d967d`, `2d70ef9`
12. Frontend: member details panel — the four owner actions — `31edfbf`,
    `d83978b`, `4f350e9`
13. Frontend: athlete schedule cutoff note — `9044d34`, `e79d9e0`
14. Documentation synchronization (this task)

**Relation fix, task 6:** Task 6's implementation (`a34b724`) surfaced a
pre-existing schema defect — `AthleteMembershipPlanEntity` → `GymMembershipEntity`
was a `@OneToOne`, so a member could never hold two plan rows, not even one
active plus one expired, which made the epic's atomic expire-then-create pattern
500 for any member who already had a plan row. Fixed as a dedicated remediation
before Task 7: the relation became `@ManyToOne`/`@OneToMany` (a membership now
holds a `membershipPlans` history collection, read through
`AthleteMembershipPlanRepository.getActivePlanByGymMembership`), backed by a
partial unique index enforcing "at most one active row per membership" at the
DB level, plus a migration and a 409 mapping for the resulting Postgres 23505.

---

## Verification

Expiry enforcement was live-proved end to end, not just unit-tested: an
athlete's plan was extended to expire at `2026-08-14T23:00:00.000Z`
(`planExpiresAt = '2026-08-15'`); the athlete's live schedule dropped from 13
visible classes to 8, every class from 2026-08-17 onward disappeared, a booking
attempt on a hidden class past the cutoff returned `403 Forbidden`, and a
booking attempt on a class within coverage (2026-08-14) succeeded with `201`.
A separate live check with the plan row lapsed (`expiresAt` in the past,
row still reading `status='active'`, the stale-row state the hourly scheduler
can leave between ticks) refused the whole schedule and any booking with `403`.
All touched dev-DB rows were restored to their pre-check state; the hand-seeded
waitlist-promotion scenario was untouched.

---

## Post-review fixes (2026-08-12)

The whole-branch review raised one merge blocker and two month-end arithmetic
defects. All three are fixed, plus the duplication that caused them.

**Auto-roll members between renewal ticks.** The renewal scheduler runs hourly,
but the request-time guards judged coverage against the stored `expiresAt`
alone — so a fully-paid auto-renewing member was refused the whole schedule and
every booking for up to an hour, once per billing cycle. Coverage is now judged
against an **effective** expiry: for an `autoRoll` row whose expiry has passed,
the guards derive the first future cycle using the same clamped arithmetic the
scheduler uses, and the athlete's cutoff note shows that derived date. The
derivation is pure — a read path never writes, so nothing races the scheduler.
`autoRoll` off still means expired is expired, an unlimited plan is still
unlimited, and a row past the catch-up cap still reads as expired.

**Month-end clamping (RULING B) is now universal.** Adding a cycle to a
month-end date clamps to the last day of the shorter month; unclamped copies
advanced Jan 31 to Mar 3, skipping February and permanently moving the billing
day. The arithmetic existed in four places — the scheduler's correct clamped
copy plus a private duplicate in each of the assign, purchase and
manually-add-member handlers, two of which also used the local rather than the
UTC calendar. All three duplicates are deleted; every backend caller now uses
one shared module,
`backend/src/domain/athlete-membership-plan/billing-cycle.ts`, which is the
authority for cycle arithmetic and for the effective-expiry derivation. The
same clamp is mirrored (necessarily by hand — the frontend cannot import from
the backend) in the owner's "+1 cycle" expiry suggestion.

Both time bases documented by this epic are unchanged: cycle arithmetic is
UTC-calendar, coverage comparisons are instant-to-instant.

**Owner list aligned with the athlete guards.** The derivation above initially
landed in the two athlete-facing guards only, which left the owner's member list
reading the stored expiry — so for up to an hour once per billing cycle it could
report a member as `expired` while that same member was booking classes
normally. `GymMembersQueryService` now derives both `expiresAt` and
`membershipStatus` through the same shared function, so all three surfaces
agree. The DTO contract is unchanged: `expiresAt` is documented as "when the
current plan lapses", which is exactly what the derived value is.

**An owner may assign a plan to a suspended member** — decided, not incidental.
The assignment grants nothing while the member is suspended, because both access
paths independently require an active `GymMembership`, so refusing it would
block a useful workflow (lining up a plan for someone returning) to prevent an
effect that cannot occur. Recorded in `DECISIONS.md`.

Remaining known items are recorded in
`epics/MEMBERSHIP_PLANS_FOLLOWUPS.md`, not here: the `@Column('date')` parse
seam behind the athlete-cutoff/owner-list divergence, the members endpoint's
missing e2e coverage, the loose rolled-row e2e assertions, the absence of a
timezone pin for the frontend jest suite (which can render a UTC-vs-local test
tautological on a UTC CI runner), and the two parked design questions.
