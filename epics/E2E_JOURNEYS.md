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

### 2. Plan class-types gate visibility

Owner assigns the athlete a plan **excluding** "Strength" → the athlete's schedule shows
CrossFit and **not** Strength → owner switches them to a plan including it → the athlete now
sees it.

This is the Visibility Rule from `CLAUDE.md` — an athlete may see a class only if they belong to
the gym and their plan includes the class type. It is the most important invariant in the
product and has no browser-level coverage today.

### 3. Expired plan blocks booking

Member whose expiry is in the past → athlete opens an otherwise-eligible class → booking is
refused and the cutoff is stated.

Guards the accidental one-day grace period removed in `8829f75`. Deferred only to keep the
first harness change small; it is next, not optional.

### 4. Extend a plan

Owner → members → member → `+1 cycle` → save → the panel **dismisses**, the row's expiry shows
the new date, and it survives a reload. A second press adds a second cycle.

Covers both fixes in `7fb4c79`. Absorbs the auto-renew toggle rather than giving it a journey.

### 5. Waitlist promotion

Capacity-1 class, athlete A booked, athlete B waitlisted → A cancels → B flips to confirmed
**and** B receives the notification.

The most complex state transition in the app, and to date only ever verified by hand.

---

## Tier 2 — lifecycle and role boundaries

6. **Cancel frees the spot** — athlete cancels → count decrements, class bookable again.
7. **Lifecycle drives the athlete's view** — owner walks `published → booking_closed →
   in_progress → completed`; at each step, assert what the athlete can and cannot do.
8. **Coach programming reaches the athlete** — coach saves a WOD → the booked athlete sees that
   text on the class.
9. **Attendance gates result logging** — coach marks A present, B absent → A can log a result, B
   **cannot**. Also pins "absence does not promote".
10. **Result lands in training history** — athlete logs → appears in history → coach sees it.
11. **Invite a coach end-to-end** — owner invites → coach opens the invite link and accepts →
    appears active → is assignable as coach on a new class. A token-in-URL flow no unit test can
    reach.

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

**Tier 1 remaining:** journeys 2–5, in progress. **Tier 2 (6–11):** after a shape review of
Tier 1.

The five existing specs (`e2e/{smoke,owner,coach,athlete,cross-role}.spec.ts`, ~1,450 lines,
~35 tests) are **discarded** — user's call, 2026-08-12: they assert presence rather than
outcome, skip themselves when data is missing, and may no longer represent the app after the
Impeccable restyle. `e2e/helpers/db-reset.ts` is kept as raw material: its trick of registering
users through the REST API so bcrypt hashing matches the real auth flow is worth preserving.
