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

**All three tiers (journeys 1–15) are built.** Tier 1 and Tier 2 (1–11) were the agreed build;
Tier 3 (12–15) was parked on 2026-08-12, taken up on 2026-08-13 in the order **13 → 15 → 12 → 14**
(highest value first, so stopping early would still have got the good ones), and all four were
kept.

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

### 11. Invites bring people in — ✅ DONE, rewritten as ONE journey 2026-08-13

Owner invites an email with **no account** → a Pending row appears and the roster still holds one
coach → the invitee opens `/invite/<token>` signed out, is sent to `/register` with the invited
address locked, registers, is returned to acceptance, accepts → lands on `/coach-classes` → the
owner's roster shows them as an active coach under the id the server assigned → the owner assigns
them a class → it appears on **their own** list and opens with the coach-only programming form →
the token is spent.

**No login step anywhere in the test.** That absence is the point: the account is created and used
in one pass. The token is taken from **the link the UI displayed**, not from the database, because
the owner copying that string is the whole delivery mechanism until an email service exists.

The two-test split this replaces existed because the epic's wording described a flow the product
did not have (coach invites went active with no token and no acceptance). That gap is closed — see
Findings — so the journey the epic originally asked for is now writable, and the athlete-invite
half is covered by the same code path with `role = 'athlete'`.

**It found a real defect on its first green attempt**, and it is the reason the chain is asserted
to the end rather than to the landing URL: see *Findings from the journey 11 rewrite*.

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

**Fixed after the epic closed** (2026-08-13 — all three coach-side gaps):

- ✅ **The coach invite is now an invite, and an account-less coach can get in.** Both of the
  invite gaps closed together, designed in
  `docs/superpowers/specs/2026-08-13-coach-invite-and-gym-context-design.md` and recorded as a
  Tier 1 ruling in `DECISIONS.md` → "Coach Invites Require Acceptance". `invites` rows carry a
  `role`, so a coach-role invite token now exists in the schema; `InviteCoachHandler` creates a
  **pending** invite instead of an active `gym_staff` row, and acceptance is what writes the
  staff row and re-signs the caller's JWT into their new gym and role. The random-password
  `pending` user is gone — an invitee with no account registers through the link and is returned
  to it. The owner sees, copies and revokes pending coach invites on `/coaches`.
  Journey 11 is now the single end-to-end journey the epic originally asked for.
- ✅ **The transition control had no coach route, and 403'd for the owner.** Both halves closed.
  `manually-transition-class-state.handler` now accepts the assigned coach *or* an active owner of
  the gym, recorded as a Tier 1 ruling in `DECISIONS.md` → "Owners May Transition Any Class"; and
  the coach's own class screen (`coach-class-details`) now renders the shared `StateBadge`, so the
  primary actor finally has a route to it. Journey 7 was rewritten to drive the coach UI
  (My Classes → the class → its chip) instead of reaching `/class-management?classId=…` by URL, and
  mutation-proved: removing the coach badge takes the journey red.

**Recorded, not fixed** — real gaps the journeys documented rather than invented around:

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
- **Invite emails are still not sent.** Closing the two coach-invite gaps did not close this one,
  and made it matter more: an invite that requires acceptance has to reach someone who may have no
  account. `InviteService.sendInviteEmail` logs in development and `console.warn`s in production,
  no provider is wired anywhere, and the owner copying the link is the whole delivery mechanism.
  Recorded as its own epic — see `epics/EMAIL_SERVICE_EPIC.md`.

**Harness lesson:** reaching the owner dashboard *through the sidebar* leaves the previous
instance of the screen mounted but hidden, so `create-class-btn` resolves twice and `.first()`
picks the dead one — the same trap as journey 5's bell. `createClassViaForm` now uses
`visibleTestId()`. The rule in *Locators* is not about shared chrome only: it is about any screen
that can be arrived at twice.

---

## Tier 3 — configuration and context — ✅ COMPLETE (2026-08-13)

Built in the order **13 → 15 → 12 → 14**, each mutation-proved before being called done. Both of
the "weaker pair" earned their place and were kept: 12 pins the space's capacity reaching a class
that never states one, and 14 pins the only lever in the MVP that revokes access to a gym the
athlete still belongs to. The suite was **15 tests, ~3.0 min** at the end of Tier 3, and is
**14 tests, ~2.8 min** since journey 11's two tests became one.

### 13. Recurring series — N classes on the *correct* N dates — ✅ DONE

Owner → create-class → **Recurring** → start `+3d`, end `+10d`, the two weekdays of `+3d` and
`+5d`, 09:00 → Create Series. Then **four** classes exist on the four expected calendar days
(read as `to_char` days), the dashboard renders a card on each of those `day-column-<day>`
columns **across the two weeks the series spans**, and the notice reports the count.

Both halves are load-bearing and neither is redundant: the stored days catch the write seam, the
rendered columns catch the read seam, and the week boundary is deliberate — a series that renders
correctly only in the current week proves little.

**As built, the count is asserted on a re-submission rather than on success.** The recurring notice
is rendered only when `created === 0`; a successful create calls `router.back()`, so the count is
never on screen in the happy path. The third claim became the case that matters more anyway:
submitting the **identical rule again** creates nothing, reports `4 skipped (already scheduled)`,
keeps the owner on the form, and leaves `readGymClassDays` unchanged — an owner who repeats a
series must not silently double every class.

### 15. Login lands each role on its own home; logout clears the session — ✅ DONE

Three logins in one spec: owner → `/schedule-dashboard`, coach → `/coach-classes`, athlete →
`/(tabs)/schedule`, each asserted by URL **and** a role-only anchor, because a URL alone passes on
a screen that rendered an error. Then logout — `nav-logout` in `OwnerSidebar` / `CoachSidebar`,
`profile-logout-btn` on the athlete's profile — lands on `/login`, and a **reload** still shows
login: that is what proves storage was cleared rather than only the route changed. The token-race
guard reloads a protected screen and asserts it does *not* bounce to `/login` while the token
rehydrates.

**The token-race half needed the navigation history, not a URL check.** With the `auth.isLoading`
guard in `app/_layout.tsx` deleted the journey stayed **green**: the root guard bounces the
apparently-signed-out visitor to `/login`, login's own already-authenticated guard bounces them
straight back, and `toHaveURL` retries into a pass. The race is self-healing at the URL level and
visible only as a login flash. `expectReloadKeepsSession` therefore records main-frame
`framenavigated` paths across the reload and asserts none of them is `/login`. Likewise
`expectSignedOut` runs after **every** logout: a token left in storage otherwise surfaces as
"could not type into the email field" on the *next* login, which reads as a hydration flake and
names nothing.

### 12. Config → consequence — ✅ DONE

Owner → gym-settings → Spaces → add **Annex** with capacity **1** → Class Types → add
**Gymnastics** → create-class offers both in its pickers. Then the enforcement half: a
**CrossFit** class in Annex created with the capacity field **left empty** → athlete A books it →
athlete B is **waitlisted**, not booked.

The empty capacity field is the whole point. `create-class.handler.ts` resolves
`command.capacity ?? space.baseCapacity`, so an omitted capacity is the only way the *space's*
capacity is under test rather than the form's. It is also why the new class type cannot carry the
enforcement half: a brand-new type belongs to no membership plan, so the Visibility Rule hides it
from every athlete. The type's claim stops at "selectable".

Each write is followed to where it is supposed to matter, and the space's row is asserted under the
id the **server** assigned it — proof the list refetched rather than replaying what was typed. The
pickers are opened and closed by pressing their own trigger: the desktop menu is an absolutely
positioned overlay with no Escape handler, so one left open swallows the next field's click.

### 14. Suspend / resume a member — ✅ DONE

Athlete sees a class → owner → members → panel → **Suspend membership** (`member-suspend-btn`) →
the athlete reloads and can no longer see it → owner resumes → the class is back and bookable.
The absence assertion carries a positive anchor on the same screen, per the rule above.

Note the mechanism before writing it: suspension sets `gym_memberships.status = 'inactive'`, and
both athlete read paths go through `getActiveGymMembershipByUserAndGym`, which filters
`status: 'active'` — so the schedule **403s** rather than returning an empty list. If the athlete
sees something indistinguishable from "no classes", that is a Finding to record, not a screen to
invent.

As built, the owner drives both directions through the panel while a **second browser context**
holds the athlete's own live session, so nothing is asserted from the seed. The reverse direction
is what makes it a journey: a suspension that also destroyed the membership, the plan, or the
eligibility that plan carries looks identical while suspended, so the third claim is a **booking**,
not a sighting.

---

## Findings from Tier 3

**Recorded, not fixed:**

- **A suspended athlete is told nothing about being suspended.** The read path 403s, and
  `api-client` maps every 403 to "You do not have permission to do that." — the same line an
  expired plan produces. The athlete cannot tell suspension from a lapsed plan from a bug, and the
  owner has no indication of what their member now sees. This is the gap the design flagged; the
  journey anchors its absence assertion on that copy rather than inventing a screen.
- **Access revocation is guarded in three places, and any one of them alone is enough.**
  `getActiveGymMembershipByUserAndGym`, `getActiveGymMembershipsByUser` and
  `hasActiveMembershipInGym` all filter `status: 'active'`; removing the filter from any single one
  leaves the journey green, because another still refuses. Not a defect — worth knowing before
  anyone assumes a single check is load-bearing, and the reason journey 14's mutation proof had to
  remove all three at once.

**Harness lesson (journey 12):** the sidebar's *dashboard* entry pushes a second copy of the
dashboard rather than returning to the one login landed on, so `day-column-<day>` is in the DOM
twice and `showWeekContaining`'s `toHaveCount(1)` can never settle. A `page.reload()` collapses the
stack. This is the same mounted-twice trap as the Tier 2 lesson, arriving through the grid instead
of a button.

**Mutation proof, for the record.** 13: the weekday encoding shifted, the duplicate-skip predicate
disabled, the notice suppressed. 15: logout not clearing storage, the athlete's home anchor
removed, the `auth.isLoading` guard deleted. 12: `capacity ?? space.baseCapacity` replaced with a
constant, the settings list not refetching after a save, the newest class type dropped before the
picker. 14: all three membership status gates removed, suspension also expiring the athlete's plan,
the suspend button sending `active`. One mutation attempt was discarded as invalid rather than
counted — an off-by-one in the booking capacity check, which changes nothing at capacity 8 and
belongs to journeys 1 and 5.

---

## Findings from the journey 11 rewrite (2026-08-13)

**Fixed because the journey found it:**

- **Invite acceptance re-signed the token and left the app with no gym.** `GymContext` is written
  from storage only, and its sole writers were `login.tsx`, `gym-setup.tsx` and `dev-bootstrap.tsx`
  — so an accepted coach held a perfectly good re-signed JWT while `currentGymId` stayed `null`, and
  `coach-classes.tsx`'s `if (!token || !currentGymId) return;` meant the screen **issued no request
  at all**. Not an error state: "No upcoming classes assigned", indistinguishable from an empty gym,
  until the coach logged out and back in. Fixed by writing `result.gym.id` into `GymContext` beside
  the `auth.login(result.token)` in `app/invite/[inviteToken].tsx`. The athlete branch had the same
  hole, and the old journey never saw it because it asserted the tab was visible rather than
  anything the tab had to load.

  This is why the journey follows the chain to a class on the coach's own screen instead of stopping
  at the landing URL: every assertion up to and including `toHaveURL(/coach-classes/)` passed with
  the defect in place.

**Recorded, not fixed:**

- **The re-signed token is not what makes an accepted coach work.** Deleting
  `await auth?.login(result.token)` from the acceptance screen leaves the journey **green**, so it
  was discarded as non-observable rather than counted as a proof. `RolesGuard` resolves the role
  from the `gym_staff` table, not from the JWT's `role` claim, and the coach routes
  (`/api/gyms/:gymId/coach/classes`, the class-scoped programming routes) carry no
  `GymOwnershipGuard` — so nothing on this path compares the token's `gymId`. The gym comes from the
  URL, which comes from `GymContext`. The re-sign still matters (owner-scoped routes do compare the
  claim, and Phase 2 switching is built on it), but the claim in the design that it is what buys
  "no re-login" is only half the story: the `setCurrentGymId` above is the load-bearing half.

**Mutation proof, for the record.** Coach acceptance writing a `gym_membership` instead of a
`gym_staff` row → red on `coach-view-<userId>`, the owner's roster never gaining the coach.
`setCurrentGymId` removed from acceptance → red on the coach's own class row. The token re-sign
removed → green, discarded with the reasoning above.

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

**Tier 3: ✅ COMPLETE (2026-08-13).** Journeys 12, 13, 14 and 15 all pass; the whole suite is
**14 tests in ~2.8 minutes** serially — 15 until journey 11's two tests became one. Every journey
was mutation-proved against three defects each — listed in *Findings from Tier 3*, along with the one attempt discarded as invalid because it
changed no observable behaviour. Two of the twelve reds were only reachable after the assertion was
strengthened: journey 15's token-race claim needed the navigation history rather than a URL (the
race is self-healing), and its logout claim needed `expectSignedOut` after every logout rather than
once at the end.

**Helper additions in Tier 3:** `weekdayNumber()` in `dates.ts` (the `0 = Sun` encoding shared by
`expandOccurrences` and the weekday chips, parsed as UTC for the same reason `weekdayShort` is);
`readGymClassDays()`, `readSpaceByName()` and `readClassTypeByName()` in `seed.ts`. The three
readers exist because the alternative was a banned text `.first()`: "on these days **and no
other**" needs the whole set, and a server-assigned id is the only way to assert a settings list
re-read what it wrote. No new testIDs were needed — Tier 3's surfaces were already addressable.

**`workers: 1` stays — settled 2026-08-13, by measurement.** Data was never the risk: each journey
seeds its own gym, so there are no rows to collide over. The shared stack is. At
`--workers=4 --fully-parallel --repeat-each=3` the suite took **13.7 min against 3.0 min serially,
and 14 of 45 tests failed** — journeys inflating from 20s to 1.6m, then hitting the 90s timeout and
taking their browser contexts down with them (`browserContext.close: Target page, context or
browser has been closed` on most of the failures). One Expo dev server bundling routes on demand
for four browsers is the bottleneck. Parallelism was slower *and* flaky, so there was no trade to
make; revisit only with a per-worker Expo server, never by raising the number alone. The reasoning
is recorded in `playwright.config.ts` beside the knob.

**Next:** every journey the epic scoped is built, and the harness question is closed. Parked
journeys (multi-gym switching, payments, announcements) still wait on a two-gym seed and on
controllers that do not exist.

The five existing specs (`e2e/{smoke,owner,coach,athlete,cross-role}.spec.ts`, ~1,450 lines,
~35 tests) are **discarded** — user's call, 2026-08-12: they assert presence rather than
outcome, skip themselves when data is missing, and may no longer represent the app after the
Impeccable restyle. `e2e/helpers/db-reset.ts` is kept as raw material: its trick of registering
users through the REST API so bcrypt hashing matches the real auth flow is worth preserving.
