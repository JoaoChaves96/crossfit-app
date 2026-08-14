# Product Decisions (MVP)

This document resolves ambiguities and blocking questions arising from:

- SCREENS.md
- MVP_SCREENS.md
- USER_JOURNEYS.md

All decisions in this file are authoritative for MVP.
If a conflict exists, this document overrides assumptions or open questions
in earlier artifacts.

## Class Recurrence

MVP supports single-session classes only.
There is no concept of recurring series or bulk edits.

## Waitlist Promotion

Waitlist promotion is automatic and immediate.
No confirmation or acceptance window is required.

## Absence Does Not Promote

Marking an athlete **absent does not promote** a waitlisted athlete. Promotion
happens only when a booking is **cancelled**.

Rationale: attendance can only be marked once the class is `in_progress` or
`completed`, so promoting on absence added an athlete to a session that was
already underway or finished. They were not at the gym, were never notified
(that path never emitted `waitlist.promoted`), and could not log a result
anyway — LogResult requires a `present = true` attendance record they did not
have. The promotion produced a booking for a class the athlete never attended
and gave them nothing in return.

Rules:

- `CancelBooking` remains the only promotion path, and is guarded on class
  state = `published` — the booking window, where a freed spot is still usable.
- `MarkAttendance` performs no booking mutations at all.
- No-show consequences (strikes, fees, flags) are **not** in MVP scope. Removing
  the promotion does not record a no-show; it only stops falsely filling the seat.
- The waitlist therefore resolves **only during the booking window**. `CancelBooking`
  is the sole promotion path and rejects any class past `published`, so once a class
  reaches `booking_closed` no seat can be freed and no promotion can occur — the
  waitlist is inert from that point on, including for the whole of `in_progress`.
  That dead window is the booking-close lead time, **5 minutes** (see "Booking Close
  Lead Time").
  This is accepted: a seat freed after booking has closed is one no athlete could
  plan around. A waitlisted athlete who is not promoted before the window shuts
  simply does not get in, and their booking stays `waitlisted`.
- Consequently, extending cancellation into `booking_closed` and expiring
  never-promoted `waitlisted` bookings are both **out of scope** here. The first is
  a late-cancellation policy question (it needs a cutoff MVP has not defined), the
  second is record hygiene with no user-visible effect.

## Booking Close Lead Time

Booking closes **5 minutes** before a class starts. `published → booking_closed` is
automatic, driven by the every-minute lifecycle scheduler.

Rationale: this lead time is exactly how long the waitlist is inert. Cancellation is
the only promotion path and it rejects any class past `published`, so a seat freed
inside this window can never be reassigned. It was previously 30 minutes, which meant
a booked athlete dropping out in the last half hour left their seat unusable while a
waitlisted athlete was available. Five minutes shrinks that dead window to the point
where a freed seat genuinely could not have been filled anyway.

Rules:

- The value is a single constant in `class-lifecycle.scheduler.ts`. It is **not**
  gym-configurable in MVP; every gym gets the same lead time. "Configured freeze
  time" in `USER_JOURNEYS.md` describes the mechanism, not a per-gym setting.
- It is unrelated to the class-reminder lead time (also 30 minutes, in
  `notification-reminder.scheduler.ts`), which stays as it is. The two constants
  coincided only by accident.

## Result Logging Window

Athletes can create and edit results for completed classes
until the class is archived.

## Programming Authorship

Gym owners may create and edit class programming, not only the assigned coach.

This resolves a conflict between two Tier 1 documents:

- `MVP_SCREENS.md` lists "Edit programming" among the Class Management actions,
  which is an owner screen.
- `DATA_MODEL.md` assigns programming to the Coach role ("Coaches decide whether
  to attach programming").

`MVP_SCREENS.md` is correct for MVP: the owner is accountable for the schedule and
must be able to fill a gap when no coach has programmed a class. `DATA_MODEL.md`
describes the expected division of labour, not an authorization boundary.

Rules:

- An owner may edit programming for any class in their own gym.
- A coach may edit programming only for a class they are assigned to (unchanged).
- The existing lifecycle lock still applies to both: programming is editable only
  while the class is `published` or `booking_closed`.

The owner's programming surface is the Class Management screen, per
`MVP_SCREENS.md`. Create/Edit Class remains scoped to class metadata and does not
carry programming fields.

## Owners May Transition Any Class

A manual class lifecycle transition may be performed by the **assigned coach or
any active owner of the gym** — not the assigned coach alone.

This extends "Programming Authorship" from programming to the lifecycle itself,
for the same reason: the owner is accountable for the schedule, and a class whose
coach never advanced it would otherwise be stuck out of the owner's reach. The
owner's Class Management screen already presents the lifecycle control, so the
alternative was to take a shipped affordance away.

Rules:

- An owner may transition any class in their own gym.
- A coach may transition only a class they are assigned to (unchanged), and must
  still hold an active `coach` staff row.
- The owner check is **not** gated on coach staffing: an owner holds an `owner`
  gym_staff row and never a `coach` one (see "Owners as Coaches").
- The state machine is unchanged and still unidirectional — this decision governs
  *who* may advance a class, never *where* it may advance to.

## Programming Content Shape

Programming is a single `content` text field. There is no separate structured
"notes" field in MVP; WOD, instructions and notes all live in `content`.

## Gym Registration Approval

New gyms are created with `status = 'active'`. Platform-admin approval is
deferred to Phase 2.

This resolves the first blocking question in `MVP_SCREENS.md` ("Gym Registration
Approval — manual or auto-approval?") and takes the auto-approval branch that
`COMMAND_MODEL.md` → RegisterGym already permits ("Implementation may
auto-approve for MVP simplicity").

Rationale: every gym-configuration command rejects a non-active gym, and no
approval endpoint or platform-admin surface exists. Creating gyms as
`pending_approval` therefore left them permanently unconfigurable — a new owner
could register a gym and then do nothing with it.

Rules:

- `POST /api/gyms` creates the gym `active` and its creator as `owner`.
- The `pending_approval` and `suspended` states remain in the model; nothing
  transitions into them in MVP.
- Approving/suspending gyms (`ApproveGymRegistration`) and the Pending Gym
  Registrations screen are Phase 2.

## Owner Gym Context After Creation

`POST /api/gyms` returns a re-signed `accessToken` alongside the new gym.

JWT claims (`gymId`, `role`) are resolved at sign time. A user who registers and
then creates a gym still holds a token claiming `gymId: null`, which
`GymOwnershipGuard` rejects — so the setup wizard could create a gym but not
configure it. Returning a refreshed token makes the transition atomic from the
client's point of view; it must store the new token in place of the old one.

There is deliberately no general `/api/auth/refresh` endpoint in MVP. If another
mid-session role change appears (e.g. accepting a coach invite), revisit this.

**Revisited 2026-08-13.** Accepting a coach invite is that second case. It is
handled the same way — the accept response carries a freshly signed token the
client stores in place of the old one — and gym context switching adds one
narrow re-signing endpoint (`POST /api/auth/gym-context`). There is still no
general refresh endpoint: both paths re-sign only for a gym the caller is
provably attached to.

## One Gym Per Owner

A user may own **at most one** gym. `POST /api/gyms` rejects a second attempt
with `409 Conflict` when the caller already has an active `owner` entry in
`gym_staff`.

Rationale: a JWT carries exactly one `gymId`, resolved from a single `gym_staff`
lookup. With two owned gyms, which gym the owner logs into is arbitrary, so a
second gym is unreachable rather than merely additional. `DATA_MODEL.md` grants
multi-gym staffing to **coaches** only; there has never been an owner equivalent.

Rules:

- The ownership check runs *before* the gym row is written, so a rejected attempt
  leaves no orphan gym.
- Only `role = 'owner'` and `status = 'active'` entries block creation. Coach
  staffing at other gyms, and inactive historical rows, do not.
- Gym-context resolution is explicitly ordered (oldest assignment first) so a
  coach staffing several gyms gets the same context on every login.
- Multi-gym ownership (gym groups/franchises) is out of MVP scope. Introducing it
  means changing how gym context is carried, not just relaxing this check.

## Minimum Gym Configuration

The gym setup wizard requires **at least one training space and at least one
class type** before the gym can be created. Neither step can be skipped.

Rationale: `CreateClass` requires a space, a class type *and* a coach. A gym with
none of the first two can never schedule a class, so allowing the wizard to skip
them produced a gym that looked configured and was not.

Rules:

- Steps 2 and 3 block until at least one valid entry exists.
- A new gym has no coach on staff, but the owner may coach their own classes
  (see "Owners as Coaches"), so the wizard's closing screen offers "Create Your
  First Class" — it is submittable with the owner as the assigned coach.
  Inviting a coach is offered as an alternative, not a prerequisite.
- Membership plans remain optional at setup time; they gate athlete visibility,
  not class creation.

## Owners as Coaches

Every gym owner is treated as a coach for the purpose of **class assignment**.
An active `owner` gym_staff row satisfies the coach-assignment precondition on
CreateClass, EditClass, and CreateRecurringClasses.

Rationale: `CreateClass` requires a coach, and a brand-new gym has none, so a
solo box owner could never schedule their first class — the wizard completed
into a dead end. Small boxes are commonly owner-coached, so requiring an invite
to a second person modelled staffing that many gyms do not have.

Rules:

- This changes **who can be named on a class**, not what the owner may do.
  Owners already hold coach-side permissions independently: attendance and
  result endpoints are `@Role(['coach', 'owner'])`.
- **One `gym_staff` row per user per gym still holds.** Owners are not given a
  second `role = 'coach'` row, and `role` gains no compound value. Ambiguity in
  the unfiltered `findOne({ userId, gymId })` lookups, and in the single `role`
  claim baked into the JWT by `resolveGymContext`, is thereby avoided.
- The `status` check is unchanged: an **inactive** owner row is still rejected.
- `GET /configuration/coaches` keeps returning only `role = 'coach'` rows —
  that list drives *staff management*, which can deactivate a row, and an owner
  must never deactivate their own ownership. The class coach **picker** passes
  `?assignable=true`, which additionally returns the active owner.
- Owners are therefore selectable as a class coach but do not appear in the
  Coaches management screen, and `ChangeCoachStatus` still filters
  `role = 'coach'`.

Supersedes the rule that an owner had to invite a coach before the first class
could be scheduled.

## Impeccable Is the Design Source of Truth (Pencil Retired)

**The binding design contract is `frontend/DESIGN.md`** — direction **"Clean Ink"** —
together with its sidecar `frontend/.impeccable/design.json` and the token layer
`frontend/constants/design.ts`. All frontend design work goes through the **`impeccable`
skill**.

**Pencil is retired.** The `.pen` files in `/designs/` are historical reference only.

Rationale: the `.pen` files were a *parallel* description of the UI, so they drifted from
the app the moment code moved — the Phase 2 audit logged dozens of design-vs-app
discrepancies that were really design-file staleness. `DESIGN.md` is derived from the
shipped artifact, so it cannot drift the same way, and its tokens are imported by the
code rather than transcribed into it.

Rules:

- Claude MUST NOT treat a `.pen` file as a specification, and MUST NOT gate work on a
  `.pen` frame existing. **The "Design Pre-Check" rule is withdrawn.**
- The `ux-designer` agent is **retired** (`.claude/agents/ux-designer.md.retired`) and
  MUST NOT be dispatched.
- `docs/PENCIL_DESIGN_CODE.md` is superseded and kept only as a historical record.
- Every color, space, type and elevation value comes from `constants/design.ts`. Raw hex
  and the legacy `theme.ts` / `AppColors` / `Spacing` are debt, not patterns.
- Screens are composed from `frontend/components/cleanink/` primitives, following an
  already-migrated screen as the exemplar.
- The named DESIGN.md rules are binding: **One Accent**, **Two Reds**, **Named-Face**,
  **Hairline-First**, **Same-Hue Chip**; `Status.open` is reserved for open/available;
  **there is no success role** (confirm with quiet meta text, never a green banner).

Supersedes the Pencil design-to-code workflow and the mandatory Design Pre-Check in
`CLAUDE.md` and `docs/FRONTEND_WORKFLOW.md`.

## Membership Plan Expiry

A class past the athlete's plan expiry is **hidden, not merely unbookable**, and a
class **on** the expiry date **is covered**.

Rationale: expiry is a date the owner sets, so it reads as a date. `expiresAt` carries
whatever time of day the plan happened to be assigned, and comparing raw instants would
cut the member's final day off at that arbitrary hour — a paying member losing an
evening class because the owner clicked at 09:00 is the failure mode that generates
support tickets. Hiding rather than disabling follows the existing Visibility Rule:
athletes are never shown classes they cannot book.

Rules:

- Classes scheduled after `expiresAt` do not appear in the athlete schedule at all.
  The expiry filter **composes with** the class-type filter; it does not replace it.
- A class on the expiry date is covered. Coverage is **day-granular**.
- The whole schedule is refused (403) once the plan itself has lapsed. That check is
  **instant-granular**, and the strictest of the two governs: once the expiry
  time-of-day passes, the schedule 403s regardless of day-granular coverage.
- Both checks compare against `expiresAt`, **never** the plan row's `status`. The
  renewal sweep is hourly, so a row can legitimately still read `'active'` with a past
  expiry between ticks.
- `expiresAt = null` is unlimited: no cutoff, nothing hidden, `planExpiresAt` is null.
- The day comparison runs on the **server-local calendar**, matching the seam already
  documented in `membership-renewal.scheduler.ts` (cycle arithmetic on the UTC
  calendar, expiry-vs-now comparison server-local). `expiresAt` is `timestamp without
  time zone`, so local getters reproduce the stored day with no shift.
- **Existing bookings are never touched.** Expiry changes what can be seen and booked;
  it does not cancel or hide bookings a member already holds.
- Owners and coaches are never blocked by plan expiry.

Two membership statuses are distinct and must not be conflated: the **persisted** plan
`status` is only `'active' | 'expired'`, while the four-value `membershipStatus`
(`active | expiring | expired | inactive`) is **derived** for the owner-side members
list, where suspension outranks plan health.

## Membership Renewal Is Per-Member Auto-Roll (Opt-Out)

An `AthleteMembershipPlan` carries its own `autoRoll` flag (default `true`) and an
`autoRollCount`. An hourly scheduler (`MembershipRenewalScheduler`) finds every
`active` plan row whose `expiresAt` has passed and either rolls it forward by its
plan's `billingCycle` (when `autoRoll` is true) or marks it `expired` (when it is
false). Renewal is therefore **opt-out per member**, not a property of the plan.

Rationale: owners manage a small roster and need per-person control — a member on
holiday should stop renewing without the owner having to move everyone off the plan.
Putting the flag on the plan would force a plan-per-policy explosion.

Rules:

- Turning auto-renew back ON resets `autoRollCount` to 0; turning it OFF leaves the
  count intact as a record of how many cycles were served.
- A roll that is overdue by several cycles advances to the first **future** cycle in
  one pass (bounded by `MAX_CATCH_UP_CYCLES = 240`) rather than one cycle per tick.
- The scheduler is a **convenience, not the enforcement boundary.** Both the athlete
  schedule read model and the booking command re-evaluate coverage at request time, so
  a row left stale between hourly ticks can never leak a bookable class. What they
  evaluate is the *derived* expiry, not the stored one — see "An Auto-Roll Plan Is
  Judged By Its Derived Expiry" below.
- `expiresAt === null` means unlimited: no expiry, nothing to roll.
- Owners get four actions per member: extend expiry, change plan, toggle auto-renew,
  and suspend/resume the gym membership.
- Athlete-side plan purchase and payment are **out of scope**; a plan is assigned by
  the owner. The athlete only sees a quiet note explaining where their coverage ends.

Supersedes the `DATA_MODEL.md` implication that expiry is a one-way transition to
`expired`.

## Class Visibility Is Bounded by Plan Expiry

A class is visible and bookable to an athlete only if it is scheduled **on or before**
the day their `AthleteMembershipPlan` expires. An athlete whose plan expires mid-week
sees the schedule stop at that day rather than seeing classes they cannot attend.

Rationale: showing a bookable class the athlete's plan does not cover is a promise the
system cannot keep; discovering it at the booking button is worse than not seeing it.

This adds a fifth condition to the Class Visibility invariant in `DATA_MODEL.md`.

## An Auto-Roll Plan Is Judged By Its Derived Expiry

`MembershipRenewalScheduler` only rolls hourly, so a plan with `autoRoll = true` sits on
a stale past `expiresAt` for up to an hour once per billing cycle. Every surface that
judges coverage therefore evaluates a **derived** expiry: when `autoRoll` is true and the
stored expiry has passed, coverage is judged against the first future cycle, computed with
the same clamped UTC arithmetic the scheduler itself uses.

Rationale: judging against the stored value hard-403s a fully-paid, auto-renewing member
off the entire schedule until the next tick — a paying member locked out once per cycle,
surfaced as an error screen rather than as a coverage message. The derived value is
exactly what the scheduler would persist at the next tick, so it grants nothing the
scheduler would not grant within the hour.

Rules:

- The derivation is **read-only**. No read path writes the rolled date back; a lazy
  persisted roll was considered and rejected because it makes a read mutate data and can
  race the scheduler.
- `autoRoll === false` is judged against the stored expiry unchanged: expired is expired.
- `expiresAt === null` (unlimited) derives nothing.
- A plan overdue beyond `MAX_CATCH_UP_CYCLES` reads as expired, matching what the
  scheduler does with it.
- All three surfaces derive identically — the athlete's schedule, the booking command, and
  the owner's member list. The owner must not be shown "expired" for a member who is
  booking classes normally.

## Membership Expiry Dates Render In UTC

Membership expiry dates render in **UTC**, so the displayed day matches the stored day and
is identical for every viewer regardless of their timezone.

Rationale: the owner sees back the date they set; a "last covered day" that shifts with the
viewer is worse than one that is fixed.

This is display-side only — the backend's coverage comparison remains server-local, per
the rules above.

## An Owner May Assign A Plan To A Suspended Member

Assigning a membership plan does not require the member's `GymMembership` to be active. An
owner can line up a plan for someone returning from suspension.

Rationale: the assignment grants nothing while the member is suspended — both access paths
(schedule visibility and booking) independently require an active `GymMembership` — so
refusing it would block a useful workflow to prevent an effect that cannot occur.

## Coach Invites Require Acceptance

An owner cannot make someone staff unilaterally. `POST /api/gyms/:gymId/configuration/coaches`
creates a **pending coach-role invite**; a `gym_staff` row exists only once the
invitee accepts it.

Rationale: the previous handler wrote an active `gym_staff` row immediately and,
for an unknown email, a `pending` user with a random 32-byte password nobody
held — so an invited coach who had no account could never log in, and a
registered user could be made staff without consenting.

Rules:

- Coach invites live in the same `invites` table as athlete invites, separated by
  `role`. Same 7-day expiry, same revocation, same public acceptance screen.
- Creating a coach invite is **owner-only**. The generic
  `POST /api/gyms/:gymId/invites` route stays owner-or-coach and always creates
  an **athlete** invite: a coach cannot create a coach.
- An invitee with no account registers through the link and is returned to it;
  there is no separate set-password path.
- Any existing `gym_staff` row at that gym blocks a new invite, in any status —
  a deactivated coach is reactivated, not re-invited.
- A live pending coach invite for the same gym and email blocks a second one.
  An expired one does not.
- Acceptance re-signs the JWT (see *Gym Context Is Switchable*).

## Gym Context Is Switchable

A user attached to more than one gym may switch which one their session acts in:
`POST /api/auth/gym-context` returns a token re-signed for the named gym, and
`GET /api/me/gyms` lists what they may switch to.

Rationale: `DATA_MODEL.md:105` grants coaches multi-gym staffing and `gym_staff`
stores it, but the JWT carries exactly one `gymId` and `GymOwnershipGuard`
compares it to the route — so every gym but the oldest was unreachable in every
session. Making coach invites work turned that from unreachable into a one-click
path an owner would find immediately.

Rules:

- The caller must have an **active** `gym_staff` row or an **active**
  `gym_membership` at the target gym. Anything else is `403` — never a silent
  fallback to another gym.
- Staff attachment beats membership at the same gym, matching login's own
  `resolveGymContext`.
- This is **not** a general refresh endpoint: it re-signs only for a gym the
  caller is provably attached to. See *Owner Gym Context After Creation*.
- Multi-gym **ownership** remains out of scope (*One Gym Per Owner*). An owner
  who also coaches elsewhere does get the switcher; that is coach staffing.
  Today it is mounted only on the coach and athlete surfaces, so such an owner
  changes context from `/coach-classes` — `/schedule-dashboard` carries no
  switcher.
- The default context on login is still the oldest active attachment. The
  switcher's choice persists client-side in `currentGymId`, not server-side.

**Deviations from `COMMAND_MODEL.md:193` *SelectActiveGym*,** both deliberate and
both narrowing that command's preconditions:

- It requires an active `AthleteMembershipPlan`. Not enforced — it would turn
  "joined but has not bought a plan yet" into "cannot see the gym you just
  joined", and class visibility and booking already gate on the plan downstream.
- It requires `Gym status = active`. Not enforced, by either endpoint. The two
  agree with each other, which is the property that matters most: a list that
  hid a gym the token endpoint would still grant is a worse bug than both
  ignoring status. No Tier 1 document says suspending a gym revokes its staff's
  access, and `SelectActiveGym` is scoped to athletes, so extending its
  precondition to staff would be an invention rather than a reading. Treated as
  known debt: gym suspension wants one pass covering both endpoints *and* the
  guards, not a condition bolted onto the switcher alone.
- That command is also **Athlete**-only. This endpoint serves staff and athletes
  alike, because the multi-gym case that actually exists in the data is a coach's.
