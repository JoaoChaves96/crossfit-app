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
