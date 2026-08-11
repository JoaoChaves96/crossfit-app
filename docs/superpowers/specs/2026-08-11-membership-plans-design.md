# Membership Plans — Owner Management & Expiry Enforcement

**Date:** 2026-08-11
**Status:** Approved design, pending implementation plan
**Closes:** the 5 remaining 🐞 cards in Trello 📋 Backlog (board `6a6cdb9ea1d2c49c647b9567`)

---

## Problem

The membership plan concept is half-built, and the half that is missing is load-bearing.

**Backend write side exists.** `CreateMembershipPlan`, `UpdateMembershipPlan`,
`ArchiveMembershipPlan` and `PurchaseMembershipPlan` all have handlers and endpoints on
`gym-configuration.controller.ts`; `MembershipPlanEntity` and
`AthleteMembershipPlanEntity` both exist with repositories.

**The read side does not.** There is no `GET` for membership plans at all, and
`queries/gym-configuration/gym-members.service.ts` selects only
`id / userId / name / email / status / joinedAt` — no plan join. That single gap is why
the Members screen has no Plan column, no expiry date, and no plan filter.

**The frontend has nothing.** No plans route, no component.

**Nothing acts on `expires_at` at all.** `DATA_MODEL.md:446` states an
`AthleteMembershipPlan` transitions to `expired` automatically when `expires_at` passes.
**No scheduler does this** — schedulers exist only for notifications and class
lifecycle. Meanwhile
`class-schedule.service.ts` and `book-class.handler.ts` both gate on
`status: 'active'`, and **no code anywhere compares `expires_at` to anything**
(verified: `grep expiresAt` across `commands/class/` and `queries/class/` returns
nothing). Consequences:

1. A plan that lapsed a year ago still grants full class visibility and booking.
2. The Members list would always read "Active", because nothing ever writes `expired`.

So the owner has no way to see or manage memberships, and the athlete gating that the
docs describe does not exist.

---

## Scope

**In scope**

- Owner: membership plan CRUD surface (the read side, plus the UI for the existing writes)
- Owner: a membership management section — see expiry dates, **extend** a membership when
  an athlete pays for another period, change plan, suspend/resume
- Athlete: enforce plan expiry on class **visibility** and **booking**
- The automatic per-cycle transition: **renew** (`autoRoll = true`, the default) or
  **expire** (`autoRoll = false`)

**Out of scope**

- **Payments/billing.** The owner records that a membership was extended; no money moves
  through the app. Consistent with `PROJECT_STATE.md` → Known Non-Goals.
- **Athlete-facing plan browse / purchase screens** (`MVP_SCREENS.md:54-55`). Deferred to
  a follow-up epic. `PurchaseMembershipPlan` already exists and is untouched here.
- No-show consequences, plan duplication, plan-level capacity.
- **Richer plan shapes** and **in-app billing** — both deliberately deferred; see
  Future Work below.

---

## Decisions

All resolved with the user on 2026-08-11.

| # | Decision |
|---|---|
| 1 | Scope is owner-side + expiry enforcement. Athlete purchase screens deferred. |
| 2 | Booking is refused when the plan is expired **and** when the class's `scheduledDate` is after `expires_at`. |
| 3 | A class dated after `expires_at` is **not shown at all** — hidden, not merely unbookable. |
| 4 | Bookings that already exist when a plan lapses are **left alone** (per `DATA_MODEL.md:498-503`). No auto-cancel, no waitlist cascade. |
| 5 | Expiry uses a **scheduler + read-time guard**: a cron flips due rows, and readers also treat a past `expires_at` as expired so a missed tick cannot grant access. |
| 6 | "Expiring" = active with `expires_at` within **7 days**. Derived for display only; not a stored status. |
| 7 | The owner Plans screen is a **new tab inside Gym Settings**, not a standalone route. |
| 8 | **Suspend** flips `GymMembership.status` to `inactive`, reversibly. The enum already has exactly these two values. |
| 9 | **Change plan** is a new owner-only `AssignMembershipPlan` command; `PurchaseMembershipPlan` stays athlete-only and untouched. |
| 10 | Archiving a plan with subscribers stays **allowed** (per `DATA_MODEL.md:154`); the UI warns with the subscriber count. |
| 11 | The athlete schedule shows a quiet note at the visibility cutoff explaining why later classes are absent. |
| 12 | **Per-member auto-roll, defaulted ON.** Each `AthleteMembershipPlan` carries an `autoRoll` boolean. When the renewal scheduler finds a due row: `autoRoll = true` → push `expires_at` forward one billing cycle and increment `autoRollCount`; `autoRoll = false` → expire it as decision 5 describes. |
| 13 | The Members list **surfaces auto-rolled memberships** (`autoRollCount` since the owner last confirmed) so a forgotten leaver is visible rather than silent. |

`expires_at = null` means an unlimited plan: no date ceiling, no expiry. This holds
everywhere below.

### Why auto-roll is the default (decision 12)

Money never passes through the app — nobody in this market pays in-app — so `expires_at`
was never evidence of payment in either model. It is the owner's assertion that the
membership relationship continues. Two ways to point the default:

- **Whitelist** (the original spec): everyone lapses; the owner extends each member as
  payment arrives. Admin scales with **member count**, forever. Failure mode = a **paying
  member who cannot see or book classes** because the owner was late doing admin.
- **Blacklist / auto-roll** (chosen): the membership continues until the owner says
  otherwise. Admin scales with **problem count** — near zero most months. Failure mode =
  a **leaver who keeps access**, costing the owner a little money and blocking nobody.

Blacklist wins on three grounds: a booking app should fail toward letting people train,
not toward locking out paying members; a design whose correctness depends on someone
performing a monthly chore forever is not correct; and auto-roll states honestly what the
owner actually means, where whitelist dresses the same assertion up as a verified date.

It is **per-member** because owners think about individuals, not policies: default on,
switch it off for anyone the owner wants to confirm each cycle. Decision 13 is the
safety net that keeps the forgotten-leaver failure visible instead of silent.

**Consequence to keep in mind:** with auto-roll on, decisions 2 and 3 (refuse and hide
classes past `expires_at`) rarely fire — there is usually no near expiry date. They are
still correct behavior for genuinely stopped memberships and for `autoRoll = false`
members, but they are no longer the load-bearing part of this epic.

---

## Architecture

### Backend — read side (new)

**`GET /api/gyms/:gymId/configuration/membership-plans`** — `@Role('owner')`.
New `MembershipPlansQueryService` in `src/queries/gym-configuration/`, following
`spaces.service.ts`. Returns each plan's `id`, `name`, `pricing`, `billingCycle`,
`classTypes`, `status`, plus **`subscriberCount`** (count of `active`
`AthleteMembershipPlan` rows referencing it) so the archive confirmation can state the
impact.

**`gym-members.service.ts` extended** to left-join the member's active
`AthleteMembershipPlan` and its plan, adding to `GymMemberItemDto`:

- `planId`, `planName` — nullable; a member may have no plan
- `expiresAt` — nullable
- `membershipStatus` — derived: `active | expiring | expired | inactive`
- `autoRoll` — boolean
- `autoRollCount` — integer; drives the decision-13 "unconfirmed renewals" surface

Derivation order: `GymMembership.status === 'inactive'` → `inactive`; else no plan or
(plan expired or `expires_at` past) → `expired`; else `expires_at` within 7 days →
`expiring`; else `active`.

> **⚠️ Behavior change:** this query currently filters `where: { status: 'active' }`.
> That filter **must be dropped**, or a suspended member disappears from the list and
> can never be resumed. Current behavior is pinned by a test before the change.

### Backend — write side (new)

All three are `@Role('owner')`, gym-scoped, and verify the target `GymMembership`
belongs to the route's gym before mutating.

**`ExtendMembershipCommand`** — the everyday renewal action.

- Extends by one billing cycle by default, or to an explicit date if supplied.
- Extends from **`max(expires_at, now)`** — renewing a plan that lapsed three weeks ago
  gives a full cycle from today, not a date already in the past.
- Sets `status` back to `active` if it had expired (revival).
- Rejects an explicit target date in the past (400).
- Requires an existing `AthleteMembershipPlan`; a member with no plan needs
  `AssignMembershipPlan` first (404).

**`AssignMembershipPlanCommand`** — owner sets a member's plan. Reuses the atomic
expire-old-then-create-new transaction already proven in
`purchase-membership-plan.handler.ts`, preserving the one-active-plan-per-membership
invariant. Rejects an archived plan and a plan from another gym.

**`SetGymMembershipStatusCommand`** — flips `GymMembership.status` between `active` and
`inactive`. Suspension blocks booking through the existing precondition in
`book-class.handler.ts`; no new gate needed.

**`SetMembershipAutoRollCommand`** — owner toggles a member's `autoRoll`. Turning it off
is how the owner marks someone who has stopped paying, so this is the everyday
"blacklist" action; turning it on resets `autoRollCount` to `0` (an explicit confirmation).

### Backend — enforcement

**Schema — `AthleteMembershipPlanEntity` gains two columns** (new migration):

- `autoRoll` — boolean, **default `true`** (decision 12)
- `autoRollCount` — integer, default `0`; cycles auto-rolled since the owner last
  confirmed. Reset to `0` by `ExtendMembership` and `AssignMembershipPlan` — an explicit
  owner action *is* the confirmation.

**`MembershipRenewalScheduler`** — new, in `src/domain/athlete-membership-plan/`,
mirroring `class-lifecycle.scheduler.ts`. `@Cron` **hourly** (expiry has day granularity;
per-minute would be pointless load). Finds `status = 'active'` rows with `expires_at`
non-null and past, then per row:

- `autoRoll = true` → push `expires_at` forward one billing cycle (from the old
  `expires_at`, **not** from now — successive cycles must not drift) and
  `autoRollCount += 1`. Status stays `active`.
- `autoRoll = false` → write `status = 'expired'`.

A row whose `expires_at` is many cycles past — the box was closed, the app unused — must
land on a **future** date in one pass, not one cycle per hourly tick. Logs both counts.

> Named "renewal" rather than "expiry" because expiring is now the minority branch.

**`class-schedule.service.ts`** — Step 5's filter gains, alongside the existing
class-type and archived checks:

- treat the plan as expired if `status === 'expired'` **or** `expires_at` is past
  (the read-time guard), and
- exclude any class whose `scheduledDate` is after `expires_at`.

The response gains `planExpiresAt` so the frontend can render the cutoff note.

**`book-class.handler.ts`** — the same two checks as a server-side backstop, since a
hidden class must remain unbookable if the endpoint is called directly. Two distinct
403 messages: plan lapsed, vs class falls after the plan's expiry.

### Frontend

**`app/gym-settings/PlansTab.tsx`** + `.styles.ts`, registered in
`gym-settings/index.tsx`, `SettingsTabBar` and `SettingsSidebar` beside Profile /
Spaces / Class Types. Exemplar: `SpacesTab.tsx`.

- Hairline card list: name, price (cents → currency), billing cycle, class-type chips,
  subscriber count
- Create/edit in the form shape `SpacesTab` already uses
- Class-type selection is multi-select — built from the existing `FilterChips` primitive
  in a form context, **not** a new control
- Archive is a `quiet` per-row action; confirmation names the subscriber count
- Only the Create CTA is crimson (One Accent Rule)

**`app/members.tsx`** — plan name, expiry date, four-state `StatusChip`, plus the
missing mobile search bar and Add button.

> **⚠️ Open item for live review:** Clean Ink has **no amber token**. Rather than invent
> a hue (a design decision not to be made unilaterally), "Expiring" renders as `neutral`
> with the date carrying the urgency. Flag at live review; if it reads too quietly, adding
> an amber status token is a follow-up design decision.

Chip tones: active → `open`, expiring → `neutral` (see above), expired → `neutral`,
inactive → `neutral`.

**Member Details panel** — desktop side panel, mobile bottom sheet, matching the
responsive split `SelectField` already implements.

- **Extend membership** — primary; one-cycle default or pick a date. Also resets
  `autoRollCount`, since extending is an explicit confirmation
- **Change plan** — secondary
- **Auto-renew** toggle — with the unconfirmed-renewal count beside it when non-zero
  ("renewed 4× since you last confirmed"). Turning it off is the everyday
  stopped-paying action
- **Suspend** (`danger`) / **Resume** (`quiet`)

**Athlete schedule** — a quiet meta line where the list stops:
"Your plan ends <date> — renew to book later classes." Quiet text, not a banner
(Clean Ink has no success/info banner role).

All API types via `npm run generate:api-types` after the backend lands. Every new
nullable DTO field (`planId`, `planName`, `expiresAt`, `planExpiresAt`) needs an explicit
`type:` in its `@ApiProperty` — a `T | null` union without it makes Nest emit an empty
object, which surfaces as `Record<string, never> | null`.

---

## Data flow

**Renewal:** athlete pays offline → owner opens Members → Member Details → Extend →
`ExtendMembershipCommand` pushes `expires_at` from `max(expires_at, now)` and revives
`status` if needed → the athlete's schedule query now returns classes up to the new date
→ later classes become visible and bookable.

**Cycle rollover (the normal case, `autoRoll = true`):** `expires_at` passes → the hourly
scheduler pushes it forward a cycle and increments `autoRollCount` → the athlete notices
nothing, and the Members list shows the owner an unconfirmed-renewal count.

**Stopping a member:** the owner turns **auto-renew off** → at the next cycle boundary the
scheduler writes `status = 'expired'` → schedule and booking both refuse. To cut access
immediately rather than at the boundary, the owner **suspends** instead.

**Lapse (`autoRoll = false`):** `expires_at` passes → `status = 'expired'` → schedule and
booking refuse. Between the expiry instant and the next tick the read-time guard already
refuses, so there is no window. Existing bookings are untouched
(`DATA_MODEL.md:498-503`).

---

## Error handling

| Case | Result |
|---|---|
| Extend a membership with no plan | 404 — assign a plan first |
| Extend to a date in the past | 400 |
| Assign an archived plan | 400 |
| Assign/extend across gyms | 403 (per the tenant-mismatch invariant: 403 = authenticated but wrong tenant) |
| Booking with a lapsed plan | 403, "plan expired" |
| Booking a class after `expires_at` | 403, "class falls after your plan's expiry" |
| Athlete with no plan at all | Existing 403 from the schedule query, unchanged |

---

## Testing

**Backend unit**

- `ExtendMembershipHandler`: extends from `max(expires_at, now)`; revives an expired
  plan; rejects a past target date; rejects a missing plan; rejects cross-gym
- `AssignMembershipPlanHandler`: expires the old plan atomically; one-active-plan
  invariant holds; rejects archived and cross-gym plans
- `SetGymMembershipStatusHandler`: round-trips active ↔ inactive
- `SetMembershipAutoRollHandler`: toggles `autoRoll`; turning it on resets
  `autoRollCount`; rejects cross-gym
- `ExtendMembershipHandler` and `AssignMembershipPlanHandler` both reset `autoRollCount`
- `MembershipRenewalScheduler`:
  - `autoRoll = true` → pushes `expires_at` one cycle from the **old** `expires_at`
    (no drift across successive renewals), increments `autoRollCount`, status stays
    `active`
  - a row **many cycles** overdue lands on a future date in **one** pass
  - `autoRoll = false` → writes `status = 'expired'`
  - leaves `expires_at = null` alone; idempotent across runs

**Backend gating (the tests that matter most)**

- A class dated after `expires_at` is **absent** from the schedule response
- Booking that class returns 403
- A plan whose `expires_at` has passed but whose `status` is still `active` is refused
  (proves the read-time guard independently of the cron)
- `expires_at = null` is unaffected

**Backend regression**

- Pin the current `gym-members.service.ts` behavior **before** dropping the
  `status: 'active'` filter, then assert suspended members appear with
  `membershipStatus: 'inactive'`

**Frontend**

- `PlansTab`: list renders, create/edit/archive flows, subscriber count in the confirm
- `members`: all four status states; the Extend flow; the auto-renew toggle and the
  unconfirmed-renewal count
- **Pin the desktop register in every new suite** — jsdom is 750px, so an unpinned suite
  tests the mobile layout only
- Preserve every existing `testID` (the `e2e/` specs locate by them)

**Live verification** at desktop 1280×832 and mobile 390×844.

---

## Documentation updates

- `docs/DECISIONS.md` — new entries for (a) the visibility/booking rule (decisions 2, 3,
  6) and that extension is recorded by the owner with no payment flow, and (b)
  **per-member auto-roll as the default** (decisions 12, 13) with the reasoning above,
  since it inverts what `DATA_MODEL.md` currently implies about expiry
- `docs/DATA_MODEL.md` — document `autoRoll`/`autoRollCount` on `AthleteMembershipPlan`,
  the renewal-vs-expiry branch that owns the transition, and the
  `scheduledDate <= expires_at` visibility clause. Line 446's "automatic transition to
  `expired` when `expires_at` passes" is now only the `autoRoll = false` branch and must
  say so. **Also fix line 493**, which still
  says a booked athlete "cancels or is marked absent" promotes from the waitlist —
  stale since `cba33b1` and contradicted by line 321 in the same file
- `context/PROJECT_STATE.md` + a new `epics/MEMBERSHIP_PLANS_EPIC.md` per the mandatory
  documentation-synchronization rule
- Swagger decorators on every new endpoint and DTO (authoritative API contract)

---

## Future Work (deliberately deferred, recorded 2026-08-11)

Neither of these is in this epic. Both are recorded so the shape built here doesn't
foreclose them.

### A. Richer plan shapes — allowance-based plans

Today a `MembershipPlan` expresses access as **which class types** it grants
(`classTypes: string[]`). Real boxes also sell plans by **quantity**:

| Shape | Needs |
|---|---|
| **N classes per week/month** ("3×/week") | A period allowance, plus counting bookings or attendances against it and refusing the N+1th |
| **Class packs / punch cards** (10 sessions, valid 3 months) | A decrementing balance, decremented on attendance rather than per period |
| Drop-in / single class | A one-shot pack |
| Full access (unlimited) | ✅ already what we have |

"3×/week" is the common one and we cannot express it at all. It is a **different
feature**, not a variation of this epic: it needs allowance tracking wired to bookings
and attendance, its own reset/rollover rules, and athlete-facing "2 of 3 classes left
this week" UI. Class-type access and quantity allowance are orthogonal — a plan would
carry both — so adding it later does not disturb what is built here.

Also unmodelled: a **freeze/hold that pushes the expiry date out** by the suspended
duration (how gyms handle injury and holiday). As specified, Suspend blocks access and
burns the paid time; a real hold needs a `suspendedAt` timestamp so Resume can add the
elapsed days onto `expires_at`. Left out deliberately, flagged here rather than lost.

### B. In-app billing — the premium tier

The intended monetisation: a **paid tier for box owners** that adds real payment
collection, while the free tier stays as designed (owner records membership, money is
handled outside the app). This matches the Portuguese market this is built for, where
most boxes settle in cash or transfer and would not adopt a product that required
processing payments.

**The shape built here is deliberately compatible.** `expires_at` is the same field
billing would treat as `next_billing_date`, and the renewal scheduler already runs the
per-cycle sweep — billing replaces "push the date forward" with "attempt a charge, then
push the date forward." So the premium tier is an **addition** to this design, not a
migration away from it.

Two things to expect when it lands:

1. **Real subscription states** appear — `past due` (charge declined) and `frozen` — which
   the current `active | expired` enum does not cover. Industry practice pairs `past due`
   with a **grace period** rather than an immediate block, precisely to avoid front-desk
   arguments; that is a softer stance than decisions 2 and 3 take here, and it should be
   revisited for billed gyms rather than assumed.
2. **The tiers genuinely diverge in behavior**, not just in features: the free tier
   auto-rolls on the owner's word (decision 12), the billed tier renews on a successful
   charge. That divergence is fine — arguably it is the clearest possible statement of
   what the paid tier buys — but it means auto-roll is a free-tier concept, not a global
   one.

**A payment ledger is explicitly rejected for the free tier.** Deriving expiry from
logged payments would be better software in the abstract, but a dated, itemised,
per-member record of cash received is exactly the artefact these owners do not want to
keep, and it would be a reason not to adopt the app. "Covered until `<date>`" carries far
less information and is much easier to live with. If a ledger ever arrives, it belongs to
the billed tier, where a processor is already producing that record.

---

## Risks

1. **Dropping the members-query `status` filter changes an existing screen.** Pinned by
   a test first.
2. **Enforcement can lock athletes out.** The gate is new, so an athlete with
   `autoRoll = false` whose plan has lapsed — or who never had a plan at all — loses
   schedule visibility the moment it ships. Auto-roll defaulting to `true` blunts this
   sharply (existing rows get `true` from the migration default), but a member with **no
   plan** is still blocked and no auto-roll can help them. Seed/assign plans for the test
   athletes as part of verification.
3. **No amber token** for "Expiring" — see the open item above.
4. **`simple-array` `classTypes`.** `MembershipPlanEntity.classTypes` is a
   comma-joined string column, so it cannot be joined or filtered in SQL. Class-type
   filtering stays in application code, as `class-schedule.service.ts` already does.
5. **Auto-roll grants access on the owner's word alone.** By design (see decision 12),
   but it means a leaver the owner forgets to mark keeps booking indefinitely. Decision
   13's unconfirmed-renewal count is the mitigation and should not be dropped as "just a
   nice-to-have" — without it the failure is silent.
6. **A migration adding a defaulted boolean to `athlete_membership_plans`.** Small table,
   low risk, but it is the first schema change in this epic — verify it runs on the dev
   database before the frontend work starts.
