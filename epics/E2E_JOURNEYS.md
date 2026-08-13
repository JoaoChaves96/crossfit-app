# E2E Journeys (Playwright, web)

**Purpose:** browser-level tests that assert **use cases happened**, not that widgets rendered.

Derived from `docs/USER_JOURNEYS.md` and `docs/PRODUCT.md` § 5, filtered to what is actually
implemented. Agreed with the user 2026-08-12.

## The rule every journey obeys

A journey ends in an assertion that **observable state changed** — a value, a count, a state
label, or a deliberate absence. If a journey can pass without something having *happened*, it
does not belong here.

Corollaries, each of which is a lesson from the suite this replaces:

- **No conditional `test.skip()`.** The suite being replaced had ~20 skips gated on data being
  present, so "feature broken" and "data missing" both reported green. A missing precondition is
  a **failure**. The seed guarantees preconditions; the test never tolerates their absence.
- **No presence-only assertions.** "Save button is present" is a jest/RTL concern — cheaper and
  faster there. Playwright is spent only on what it alone can see.
- **Assert the negative too.** What an actor must *not* see (an ineligible class, a booking
  button after freeze) is as load-bearing as what they must.
- **Assert persistence** where a write is involved: reload and check it survived.
- **Per-journey seed, not one global fixture.** Global fixtures produce order-dependent suites
  and the skip cascade above. Each journey seeds its own data so it can run alone.
- **Do not re-test the API.** 15 backend supertest specs already cover authz and gym scoping.
  Playwright is for the frontend↔backend contract, state surviving navigation, auth/token races,
  and multi-role sequences where one actor acts and another sees the consequence.
- **Every absence needs an anchor.** `toHaveCount(0)` is satisfied by an empty DOM, so an
  absence is only meaningful next to a positive that proves the screen rendered.
  `expectClassNotVisibleToAthlete` takes that anchor as a required argument for this reason.

## Locators: when `visibleTestId()` is mandatory

On Expo Web a testID is routinely in the DOM more than once and the spare copies are **hidden,
not absent** — so `.first()` picks a node no user can see and Playwright waits it out to a
timeout instead of failing fast. The rule, by kind of control:

- **Shared chrome — always `visibleTestId()`.** Anything rendered by a navigator or a layout:
  `tab-*` (`<Tabs>` renders the bar twice on web), `nav-*`, the week-nav arrows (mobile and
  desktop toolbars), the notification bell and its badge. `tab()` already delegates.
- **Anything a pushed route shares with the tab screen underneath — always `visibleTestId()`.**
  A pushed detail route leaves the tabs screen MOUNTED but hidden, which is what hid journey 5's
  bell.
- **Controls that exist on exactly one screen — bare `getByTestId()` is correct**, and preferred:
  `book-btn`, `cancel-booking-btn`, `member-save-btn`. If it resolves to two nodes, that is a
  real duplicate-testID defect and strict mode should say so rather than being filtered away.

Never `.first()` on a testID to escape strict mode. Either the node is unique, or the right
answer is `visibleTestId()`.

---

## Scope

**Tier 1 and Tier 2 (journeys 1–11) are the agreed build.** Tier 3 (12–15) is parked but not
dropped — user's call, 2026-08-12.

---

## Tier 1 — the spine

### 1. Owner creates a class → athlete books it → owner sees the count rise — ✅ DONE (`ed21ff0`)

Owner fills the create form for a specific date → the card appears **on that weekday column** →
athlete logs in, sees the class **on the same date**, books it → owner reloads, booking count
goes `0 → 1`.

The "same date on both sides" assertion is the point: it is the one check that would have caught
the `@Column('date')` write seam fixed in `8829f75`, which stored classes a day early west of
UTC and which no unit test on either side could see.

### 2. Plan class-types gate visibility — ✅ DONE

Owner assigns the athlete a plan **excluding** "Strength" → the athlete's schedule shows
CrossFit and **not** Strength → owner switches them to a plan including it → the athlete now
sees it.

This is the Visibility Rule from `CLAUDE.md` — an athlete may see a class only if they belong to
the gym and their plan includes the class type. It is the most important invariant in the
product and has no browser-level coverage today.

### 3. Expired plan blocks booking — ✅ DONE

Member whose expiry is in the past → athlete opens an otherwise-eligible class → booking is
refused and the cutoff is stated.

Guards the accidental one-day grace period removed in `8829f75`. The fixture must lapse the
plan **earlier today** — past as an instant, current as a calendar day. Any longer lapse
reads as expired under both the correct and the regressed comparison, so it proves nothing;
see Status.

### 4. Extend a plan — ✅ DONE

Owner → members → member → `+1 cycle` → save → the panel **dismisses**, the row's expiry shows
the new date, and it survives a reload. A second press adds a second cycle.

Covers both fixes in `7fb4c79`. Absorbs the auto-renew toggle rather than giving it a journey.

### 5. Waitlist promotion — ✅ DONE

Capacity-1 class, athlete A booked, athlete B waitlisted → A cancels → B flips to confirmed
**and** B receives the notification.

The most complex state transition in the app, and to date only ever verified by hand.

---

## Tier 2 — lifecycle and role boundaries — ✅ COMPLETE

### 6. Cancel frees the spot — ✅ DONE

Athlete cancels → count decrements, class bookable again.

### 7. Lifecycle drives the athlete's view — ✅ DONE

The class is walked `published → booking_closed → in_progress → completed` and at each step the
athlete's own screens are checked, for both a booked athlete and a non-booked one.

**Driven by the coach, not the owner.** `ManuallyTransitionClassState` requires
`classEntity.coachUserId === command.userId`, so the assigned coach is the only actor who can
walk it — see Findings.

### 8. Coach programming reaches the athlete — ✅ DONE

Coach saves a multi-line WOD from their own class screen → the booked athlete reads every line
on `class-details` → the coach **edits** it → the athlete sees the new text and no longer the
old. The overwrite half is the load-bearing one.

### 9 + 10. Attendance gates result logging, and the result reaches history and the coach — ✅ DONE (merged)

Merged on the user's call: they are one chain over one expensive precondition (a `completed`
class with real attendance on it). A and B are identical except the single toggle the coach
flipped, so anything separating them separates on attendance alone.

Coach walks the class to `in_progress`, marks B absent (everyone starts present), submits →
`completed`. A logs `225` seconds → `03:45` in Training History; the coach's Results panel shows
A's name and `03:45 min`, and not B's. B is refused on save and has **no** history entry.
"Absence does not promote" is pinned in the database — at `completed` the UI cannot distinguish
a never-promoted waitlist row (see Findings).

### 11. Invites bring people in — ✅ DONE (as two tests)

The epic's wording — "coach opens the invite link and accepts" — describes a flow the product
does not have; the two real mechanisms are disjoint (see Findings). Each got the test the
journey was after:

- **The coach invite** — owner invites an existing account by email → active immediately → the
  class form's coach picker offers them → the class the owner assigns them shows up on **their
  own** Coach Classes screen and opens with the coach-only programming form.
- **The athlete invite link** — owner generates the invite; the token is taken from **the link
  the UI displayed**, not from the database, because that string travelling correctly is the seam
  under test. The invitee opens `/invite/<token>`, reads who invited them, joins, is a member on
  the owner's list — and the token is then spent (re-opening reports "already accepted").

---

## Findings from Tier 2

**Fixed while writing the journeys** (each now mutation-proved by the journey that found it):

- **`class-details` derived its actions from stale data after a cancel** — the screen updated the
  booking but re-derived nothing, so a cancelled booking still offered Cancel. Journey 6.
- **The lifecycle confirm was dead on web** — `Alert.alert` is a no-op in React Native Web, so
  the coach's transition button did nothing at all on the platform the app ships on. Now
  `showConfirm`. Journey 7.
- **Cancel was offered past `published`, on two screens** — `class-details` and, separately,
  `my-bookings` (which hid it only at `in_progress`). `CancelBooking` refuses every state past
  `published` permanently, so the button's only possible outcome was an error toast. Journeys 6
  and 7.

**Recorded, not fixed** — real gaps the journeys documented rather than invented around:

- **The transition control is assigned-coach-only, but the owner can see it.** The controller
  allows `['coach','owner']` while `manually-transition-class-state.handler` requires
  `coachUserId === userId`, so an owner pressing it gets a 403. And there is **no coach-side
  navigation to it at all** — journey 7 reaches `/class-management?classId=…` by URL because the
  coach's own screens offer no route to the control they are the only ones allowed to use.
- **Attendance never reaches the athlete.** No attendance flag exists on
  `UserBookingItemDto`, `ClassScheduleItemDto` or `TrainingHistoryItemDto`, so `my-bookings`
  derives "You attended" and the LOG RESULT button from `state === 'completed'` alone. An athlete
  marked absent is *offered* the action and refused only on submit.
- **…and the refusal does not say why.** `api-client` deliberately replaces server messages by
  status, so `LogResult`'s "Athlete was not marked present for this class" reaches the athlete as
  "You do not have permission to do that." Correct as a leak policy, useless as an explanation;
  the screen is the place to say it.
- **A waitlist row is invisible once the class is past `published`.** Nothing on any screen
  distinguishes "still waitlisted" from "promoted" at `completed`, which is why journey 9's
  "absence does not promote" assertion has to read the database.
- **The coach invite is not an invite.** `InviteCoachHandler` writes an active `gym_staff` row
  immediately — no token, no acceptance, and the email is a `TODO`. The token-in-URL flow
  (`InviteService`) creates a `gym_membership`, i.e. an athlete; **no coach-role invite token
  exists in the schema.** The epic's journey 11 assumed one.
- **An invited coach with no account cannot get in.** `InviteCoachHandler` creates a `pending`
  user with a random 32-byte password nobody holds, and there is no set-password or
  complete-profile path — so inviting a brand-new coach produces a staff row its owner can never
  log into. Journey 11 invites a pre-registered account for this reason.

**Harness lesson:** reaching the owner dashboard *through the sidebar* leaves the previous
instance of the screen mounted but hidden, so `create-class-btn` resolves twice and `.first()`
picks the dead one — the same trap as journey 5's bell. `createClassViaForm` now uses
`visibleTestId()`. The rule in *Locators* is not about shared chrome only: it is about any screen
that can be arrived at twice.

---

## Tier 3 — configuration and context — ⏭️ PARKED, not dropped

12. **Config → consequence** — owner adds a space and a class type → both become selectable in
    create-class, and the new space's capacity is enforced.
13. **Recurring series** — owner creates a weekly series → N classes on the **correct** N dates.
    The date seam landed exactly here.
14. **Suspend / resume a member** — owner suspends → the athlete's access reflects it → resume
    restores it.
15. **Login lands each role on its own home; logout clears the session** — one journey, three
    roles, plus the token-race guard.

---

## Parked, with reasons

- **Multi-gym switching** — real per `PRODUCT.md` § 5.1, but needs a two-gym seed. Add once the
  harness is proven.
- **Payments / invoices, announcements, notification preferences, platform admin** — no
  controllers exist (`docs/COMMAND_STATUS.md` Phase 4 is unstarted). Out of scope until they do.

---

## Harness constraints

**Its own database.** The suite being replaced ran `TRUNCATE` over 15 tables in
`crossfit_box_dev` from `globalSetup` — the same database holding hand-seeded manual-test
scenarios. E2E owns `crossfit_box_e2e` and is free to wipe it; it must never be able to reach
the dev database.

**The lifecycle scheduler must not run.** It ticks every minute and transitions classes out of
`published` underneath a running test — the reason the old seeder dated everything a week out.
Journeys 3, 7 and 9 depend on precise class states. The e2e backend runs with the scheduler
disabled and tests drive transitions explicitly; the scheduler is tested separately.

**Pin the browser timezone.** `playwright.config.ts` sets no `timezoneId`, so date assertions
are tautological on a UTC machine — exactly how the write-side date bug survived. Pin a
negative-offset zone so a UTC-vs-local defect is visible.

**One viewport, and it is desktop.** The suite runs a single 1280×832 chromium project, so only
the desktop layout is ever exercised: `DesktopTopNav` is real and the bottom tab bar is
`display: none`. Known consequence — journey 4 pins a fix (`7fb4c79`) whose second half was a
*mobile* symptom (the member sheet covering the row it had just changed), and it pins it as a
desktop panel. Accepted deliberately: a second project doubles both the run and every server
boot. Mobile layout stays a jest-with-pinned-register and live-screenshot concern.

**Seed failures must be loud.** The old `globalSetup` swallowed an unreachable database with a
`console.warn` and carried on, which is what fed the skip cascade.

---

## Status

**Harness: ✅ built and proven (`ed21ff0`).** `e2e/env.ts` (isolation + the `NODE_ENV`
reasoning), `e2e/global-setup.ts` (loud truncate), `e2e/fixtures.ts` (the API origin pin),
and `e2e/helpers/{dates,seed,auth,actions,assert}.ts`. Journey 1 passes in ~7s and was
mutation-proved. The helper layer is **frozen**: a journey that needs a new capability
reports it rather than adding one, so five journeys cannot grow five spellings of "log in".

**It earned its keep on the first run**, finding two owner-dashboard defects no unit test
could see (`7e605e4`): the dashboard never refetched after `create-class` returned via
`router.back()`, and it rendered classes a weekday early west of UTC — the frontend half of
the `8829f75` seam. Journey 1's failure named the seam explicitly, which is what the
assertion helpers exist for. Note that jest's positive-offset TZ pin (`414876c`) means the
existing day-column unit test passed both before and after that fix.

**Tier 1: ✅ COMPLETE.** All five journeys pass in ~37s total, and each was mutation-proved —
a deliberate defect reintroduced into production code, the journey confirmed red, the defect
reverted. Journey 2 by disabling the Visibility Rule filter; 3 by restoring the day-granular
lapse check; 4 by reverting `+1 cycle` to read the server value; 5 by skipping the promotion
on cancel.

**Mutation testing paid for itself on journey 3**, which passed with the grace period back in
place. Its fixture expired the plan by exactly 24 hours — and "yesterday, same time" reads as
expired under both an instant comparison and the day-granular one that regressed, so the
journey never sat on the boundary it claimed to guard. Fixed by lapsing the plan one second
after midnight today. The lesson generalises: a journey named after a boundary has to be run
against the defect, or it is only asserting that the feature works at all.

**Two harness lessons from journeys 2–5:**

- `helpers/auth.ts` now exports `visibleTestId()` (with `tab()` delegating to it). On Expo Web
  a testID is routinely in the DOM more than once and the spare copies are *hidden, not
  absent*, so `.first()` picks a node no user can see and Playwright waits on it until the
  test times out. A pushed detail route leaves the tabs screen underneath mounted, which is
  what hid journey 5's notification bell.
- `DesktopTopNav` now carries the same `tab-*` testIDs as the bottom bar. The two bars are one
  destination in two layouts, and only one is real at any viewport.

**Helper additions**, all consolidating something two journeys had hand-rolled:
`openOwnerSection()` and `openMemberPanel()` in `actions.ts`; `setPlanAutoRoll()` and
`readActivePlan()` in `seed.ts`. `setPlanAutoRoll` is load-bearing rather than convenient —
`effectiveExpiresAt` rolls a lapsed auto-roll plan forward, so `setPlanExpiry` alone cannot
make an athlete expired.

**Tier 2: ✅ COMPLETE.** Journeys 6, 7, 8, 9+10 (merged) and 11 (two tests) all pass; the whole
suite is **11 tests in ~3.2 minutes** serially. Every journey was mutation-proved, most against
more than one defect: journey 9 against removing the attendance gate in `LogResult`, against
`TrainingHistoryService` dropping the result, and against `MarkAttendance` promoting the waitlist
on an absence; journey 11 against a coach invited `inactive`, against a truncated token in the
generated link, and against an accept that leaves the invite `pending`.

**Helper additions in Tier 2:** `seedUser()` in `seed.ts` — a registered account belonging to no
gym, which `seedGym` cannot produce and the invite journeys require. New testIDs, all on
surfaces a journey had no way to address: `class-details-title`, `log-results-error`,
`booking-card-*` / `booking-cancel-btn-*` / `log-result-btn-*` on `my-bookings`, `results-panel`
(the coach's Results, which sits beside the Bookings roster on desktop and shares its names), and
`create-invite-btn` / `invite-email-input` / `invite-send-btn` / `invite-link-text` /
`invite-join-btn` on the invite flow.

**Next:** Tier 3 (12–15) is still parked. Now that Tier 2 is green serially, the open harness
question is whether to lift `workers: 1` — each journey seeds its own gym, so the blocker is
server capacity rather than data collisions.

The five existing specs (`e2e/{smoke,owner,coach,athlete,cross-role}.spec.ts`, ~1,450 lines,
~35 tests) are **discarded** — user's call, 2026-08-12: they assert presence rather than
outcome, skip themselves when data is missing, and may no longer represent the app after the
Impeccable restyle. `e2e/helpers/db-reset.ts` is kept as raw material: its trick of registering
users through the REST API so bcrypt hashing matches the real auth flow is worth preserving.
