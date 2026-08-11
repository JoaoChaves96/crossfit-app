# EPIC: Impeccable Full-App Restyle — "Clean Ink"

**Status:** 🟢 Phase 1 (athlete) COMPLETE · Phase 2 (gym owner) **CLOSED** 2026-08-07
· Phase 3 (coach) **CLOSED** 2026-08-07 — keyboard fix device-verified 2026-08-11
· Phase 4 (`gym-setup` adapt) **CLOSED** 2026-08-11 — committed, pushed, device-verified
**Start Date:** 2026-08-07 (Phase 0 pilot built)
**Owner:** Frontend + Impeccable design system
**Depends on:** none (visual layer only; no API/contract changes)
**Tool:** Impeccable (Pencil is parked — see `context/PROJECT_STATE.md`)
**Image gen:** Higgsfield CLI (`higgsfield-generate` skill), free plan = 10 cr.
NOTE: GPT Image 2 (the quality UI model) requires a paid plan — blocked on free
tier. Z Image (0.15 cr) works but is too low-fidelity to convey a clean/smooth
premium look; comp sketches misled the direction once already. This look is
proven **in code** on the real pilot screen via screenshots, not via sketches.

---

## Objective

The shipped app inherits React-Native-Web defaults and looks like a POC: raw
native `dd/mm/yyyy` date/time inputs with duplicate 📅/🕐 emoji, gray-square
placeholder icons, literal lowercase `v` dropdown chevrons, flat gray-on-white,
emoji as UI icons (👥 📍 👤 📅), a serif/utilitarian clash, and no personality.

**Root cause:** there is **no design system**. `constants/theme.ts` is a sprawl
of 100+ ad-hoc grays/blues/greens with no roles, so every screen re-inherits
platform defaults. This epic establishes one real, committed visual system —
captured as `DESIGN.md` — and rolls it across the app, **one role at a time**,
starting with a proven pilot screen.

This is a **replace-the-world redesign**, not a refinement. Product truth,
copy, function, native affordances, and multi-tenant/lifecycle behavior are
preserved exactly; only the visual world is replaced.

---

## Committed Direction — "Clean Ink"

A clean, smooth, monochrome **black/white base** carried by a single **restrained
muted-crimson accent (~#E23B4E)**. The accent is not scattered — it appears only
on the primary action, active/selected states, and the occasional key number.
Neutrals do ~95% of the work; the surface reads calm, modern, and premium.

This replaces the earlier **"The Box Floor"** direction (concept-roll seed
`25c0e8df`), which was rejected after a rough Z-Image sketch round: the
industrial/stencil/lane-line look read as harsh and spreadsheet-like, not the
smooth premium feel wanted. The sketch round did its job — it made the wrong
idea concrete cheaply.

- **THESIS:** A booking app that feels calm and effortless, not a POC. Restraint
  is the point: monochrome discipline + one confident accent, generous
  whitespace, smooth rounded surfaces, no visual noise.
- **OWN-WORLD:** White / near-white ground (`#FFFFFF`, `#F5F5F5` sections),
  near-black ink (`#1A1A1A`), a disciplined neutral gray ramp for secondary text
  and hairline dividers (`#666`, `#999`, `#E8E8E8`), and **one** accent —
  muted crimson `~#E23B4E` — reserved for primary CTAs, active toggles/chips,
  and selection. Smooth cards with soft radius and restrained elevation. Real
  styled Date/Time picker and Select components (native `dd/mm/yyyy` chrome,
  duplicate 📅/🕐 emoji, and the `v` chevron are killed). A real drawn icon set
  replaces emoji UI (👥 📍 👤 📅) and gray-square placeholders. Clean,
  workhorse grotesk type; no serif/utilitarian clash.
- **ACCENT DISCIPLINE:** crimson is a Restrained strategy, not a full field.
  Destructive/urgent states (cancel, full/waitlist) may use a deeper red tone;
  success/info stay neutral or a single muted green — decided at build against
  the live screen so the accent never competes with itself.
- **STORY:** Athlete opens to a clean schedule, scans classes by time and a quiet
  spots indicator, and books with one confident crimson primary action.
- **FIRST VIEWPORT (athlete schedule):** a calm white surface — compact header,
  a smooth Week/Day segmented toggle and class-type chips (active = crimson),
  day separators as quiet labels, and a vertical list of smooth class cards:
  time + class type, quiet coach/space/spots metadata, a status chip, and one
  crimson primary action. Whitespace and hierarchy carry it, not decoration.
- **MODE:** Operate — scanability, consistency, and native task affordances
  outrank expression; brand lives in precise details (the one accent, the type
  ramp, the spacing rhythm, the real picker/select components).

**Base palette source:** the "Clean · Black & white" values from the
`crossfit-app-ux` exploration (`#FFF`, `#1A1A1A`, `#F5F5F5`, `#E8E8E8`, grays
`#666`/`#999`). **Accent source:** a muted/desaturated take on that project's
Voltage red ramp (`#FF4D2E`→`#EF2A3D`→`#D11228`), pulled back to `~#E23B4E`.

Rejected: **The Box Floor** (industrial/stencil — too harsh, see above),
full-saturation **Voltage purple/red** (too aggressive), and the flat **Clean
B&W baseline** with no accent (the bland Pencil-1:1 look, no POV). A muted
**violet (~#6D5AE6)** was considered as the accent and set aside in favor of
crimson.

---

## Approach (Impeccable new-work → rollout)

### Phase 0 — System + Pilot (prove the world) — ✅ BUILT (2026-08-07)

**Done:**
- ✅ Token role layer `frontend/constants/design.ts` (Ink/Ground/Line/Accent/
  Status/Type/Radius/Space/Elevation) — additive, supersedes `theme.ts` sprawl
  without renaming it (unmigrated screens still use theme.ts).
- ✅ Self-hosted grotesk loaded in `app/_layout.tsx` — Hanken Grotesk
  400/500/600/700 via `@expo-google-fonts/hanken-grotesk`, gated on `useFonts`.
- ✅ Shared primitives in `components/cleanink/` — Text, Icon (Ionicons behind
  semantic names, zero emoji), StatusChip, Button (primary/danger/quiet) +
  ButtonRow, SegmentedToggle, FilterChips, barrel index.
- ✅ Pilot rebuilt: `app/(tabs)/schedule.tsx` + `.styles.ts` (mobile list +
  desktop 3-col grid), all behavior/copy/testIDs/lifecycle gating preserved;
  19/19 schedule tests pass.
- ✅ Batched desktop+mobile screenshot inspection; finish-review agent run
  against the contract → 2 material fixes applied (WAITLISTED chip retoned
  accent-crimson distinct from FULL-danger; StatusChip accent tone switched from
  raw hex to `Accent.wash`/`Accent.pressed` tokens).
- ✅ `frontend/DESIGN.md` + `frontend/.impeccable/design.json` written from the
  built world by the documenter (ground-truth, not intentions).
- ⏳ **Carried debt:** `GymMenu.tsx` migrated its type off the unloaded `'Inter'`
  serif fallback to `Type.family.*`, but still draws colors/spacing/shadow from
  legacy `theme.ts` — converge it onto `design.ts` during Phase 1.

**Next:** live-review gate (below) before Phase 1 rollout.

#### Original plan (for reference)


1. **Build the pilot directly.** No image comp round — sketches proved
   misleading for a clean/smooth look and GPT Image 2 is paywalled. The pilot
   screen itself, screenshotted, is the comp we iterate on.
2. **Build the pilot for real.** Rebuild the athlete **schedule** screen
   (`app/(tabs)/schedule.tsx` + `.styles.ts`) in the Clean Ink world — mobile
   list and desktop grid — with the new shared primitives created as needed:
   - a token layer replacing the `theme.ts` sprawl with **roles** (ground, ink,
     line, accent, status states) — additive at first, not a big-bang rename;
   - real `DateTimePicker` and `Select` components (kill native chrome + `v`);
   - a drawn icon set (replace 👥 📍 👤 📅 and gray-square icons);
   - smooth class card, quiet spots indicator, status chip, hairline divider,
     and the segmented Week/Day toggle + class-type chips (active = crimson).
3. **Inspect + finish.** Batched desktop/mobile screenshot round, finish-review
   agent against the contract, fix, and **write `DESIGN.md`** from the built
   world (the documenter records ground-truth, not intentions).
4. **Verify live** in the running app; move the Trello card to To Verify.

**Gate:** Phase 0 output (DESIGN.md + shared components + one polished screen)
is reviewed live before any rollout. This is the "prove it before rollout"
checkpoint you asked for.

### Phase 1 — Athlete role rollout (one role at a time)

Roll the committed system across the rest of the **athlete** flow, reusing the
Phase-0 primitives (no new world decisions):

**Done (2026-08-07):**
- ✅ Core batch (committed `dbea8d3`): `(tabs)/my-bookings`, `class-details`,
  `log-results` — off theme.ts, pilot-matching chip tones + Button variants,
  finish-review fixes applied (class-details booked line → ink; log-results
  desktop action bar → flush, no orphaned band). 16/16 class-details tests pass.
- ✅ Lighter four (UNCOMMITTED, verified): `(tabs)/profile`, `(tabs)/training-history`,
  `notifications`, `no-gym` — off theme.ts, emoji killed, pilot empty-state/card
  language. Finish-review fixes applied (profile Switch teal→crimson track+white
  thumb via activeThumbColor; no-gym Log Out accent→danger for Two Reds + parity
  with profile). 25/25 tests pass (notifications), full tsc clean.

**Remaining in Phase 1:**
- shared: `(tabs)/_layout` tab bar (active label still legacy blue),
  `SafeScreen`, `NotificationBell`, `GymMenu` (carried theme.ts debt)
- auth surfaces used by athletes: `login`, `register`, `invite/*`

**Gate:** athlete flow verified live end-to-end before starting another role.

### Phase 2 — Gym Owner rollout — ✅ CLOSED (2026-08-07)

**Signed off by the user 2026-08-07.** Two passes: the restyle first pass
(`b877713..f7a06a0`, 7 commits), then a round of follow-ups from a live iPhone review
(`f7a06a0..1e2e0bc`, 8 commits) plus the final `edit-class` Save-gating item. The
owner's last outstanding remark was the edit-class button behaviour; with that done
the phase is closed.

Owner screens are data-dense — the Clean Ink system holds via a quiet table/list
variant (hairline rows, ink + one accent), no new world decisions.

- ✅ **Nav shell** — `OwnerSidebar` + styles, `ClassManagementSidebar`,
  `SettingsSidebar` on Clean Ink; NEW `components/OwnerNavDrawer.tsx` slide-in
  drawer replaces the old fade Modal on all owner screens; back buttons added;
  Icon set extended with owner nav glyphs + `menu`/`add`/`chevronForward`.
- ✅ **`schedule-dashboard`** (the owner exemplar) — dropped the rainbow
  class-type palette (violated One Accent) → monochrome white cards on hairlines;
  class time = ink Lead number; full-capacity = Status.danger; Week/List =
  SegmentedToggle; accent only on Create CTA + active day pill.
- ✅ **`members`**, **`coaches`** — list/table + detail-panel variant; status →
  StatusChip (active=open/inactive=neutral); actions → Button (danger/quiet);
  Invite CTA = the one crimson primary.
- ✅ **`create-class` + `edit-class`** — form screens; 📅🕐→Icon calendar/time,
  `v`→chevronDown; Save/Create=primary, Cancel=quiet, Delete=danger; weekday
  selected chip earns the accent; inline mode/weekday toggles kept for testID/a11y.
- ✅ **`invites`** (owner list) — status→StatusChip (accepted=open, pending=
  neutral, expired/revoked=danger); Send=primary, Revoke=danger (spinner retained).
- ✅ **`class-management/*`** (index/ClassHeader/BookingsPanel/ResultsPanel) —
  lifecycle state→StatusChip (Published=open, else neutral, never accent);
  attendance/booking→StatusChip; Mark Attendance=primary, Cancel/Archive=danger.
- ✅ **`gym-settings/*`** (index + ProfileTab/ClassTypesTab/SpacesTab) +
  **`gym-setup`** — local hex consts removed; SettingsTabBar→SegmentedToggle
  (testIDs preserved); Save/Add=primary, Delete=danger; loggable/active→StatusChip;
  wizard step indicator reads through ink+weight, not accent.
- **Gate:** `tsc` clean (only 2 known pre-existing `__tests__` errors); jest
  204/207 (the 3 `schedule-dashboard.test` failures PRE-EXIST on clean `b877713`,
  verified via `git stash` — capacity `5/20 spots` + day-column "No classes").
- ✅ **Title Case verdict:** button labels ALL-CAPS→Title Case CONFIRMED by the user
  as the intended copy (uppercase stays reserved for micro-labels: table column
  headers, field labels). Two stragglers fixed after the fact — `gym-setup`'s
  `+ Add Space`/`+ Add Class Type` lost the literal `+` in favour of a new optional
  `icon` prop on the Button primitive, and `Create your first class` → Title Case.

#### Round 2 — live device review follow-ups (2026-08-07)

Six issues reported from iPhone testing. Two are behaviour/product changes, not
restyle, and required backend work + a Tier 1 decision.

- ✅ **Owner programming** — `Add Programming` on a class pushed `/coach-class-details`
  (a COACH screen) with only `classId`+`gymId` while the coach entry point passes 8
  params, so owners saw `—` for date/time/space and `0 / 0` capacity, a disabled coach
  sidebar and a duplicate Mark Attendance. Resolved per `docs/DECISIONS.md`
  → "Programming Authorship": programming is now a **section of Class Management**
  (a 4th mobile tab + a full-width desktop panel), the `Add Programming` button and
  that navigation are gone, and class CTAs are back to 2 (Mark Attendance + Edit).
  New `ProgrammingPanel.tsx` + `useClassProgramming.ts`, lifecycle-locked read-only
  outside `published`/`booking_closed`.
- ✅ **BACKEND: owner may write programming** — `POST /:classId/programming` and
  `/:classId/toggle-loggable` widened to `@Role(['coach','owner'])` behind a new
  shared `class-content-access.service.ts` (owner → any class in own gym; coach →
  only a class they're assigned to, unchanged). Swagger updated. Recorded in
  `docs/DECISIONS.md`, which also resolves the `MVP_SCREENS` ↔ `DATA_MODEL` conflict
  over who authors programming.
- ✅ **WOD/notes marker hack removed** — the two-input WOD+Notes UI was faked by
  joining with a literal `'\n\nNotes:\n'` and re-splitting on read; typing "Notes:"
  in a WOD corrupted the round-trip. Backend has ONE `content` field, so both the
  owner panel and the coach screen now use a single Programming input.
  `docs/DECISIONS.md` → "Programming Content Shape".
- ✅ **BACKEND: waitlist position exposed** — `ClassBookingItemDto` gained
  `waitlistPosition: number | null` (1-based, authoritative promotion order, null for
  `booked`). The list endpoint now returns booked first then waitlisted in
  `bookedPosition ASC` order — previously it ordered by `createdAt`, which is NOT the
  order promotion follows, so any UI numbering would have been misleading.
- ✅ **Waitlist formatting** — `waitSection` had a hard `width: 280` with no mobile
  override (rendered narrow under a full-width Attendance card), an unwrapped header
  `Text` misaligned against its rows, rows missing the `tableRowName` wrapper, and a
  no-op `tableRowWait`. Fixed, plus a `#` position column.
- ✅ **CTA layouts** — class-management's `actionRow` had `flexWrap` + `minWidth: 160`
  per button and no mobile variant (3×160px needs ~496px; a phone gives ~343px → a
  ragged stack of stubby unequal boxes). Both it and the `edit-class` footer now use
  the chosen arrangement: primary full-width on its own row, secondaries paired 50/50.
- ✅ **Stray notification bell** — removed from `invites.tsx`; it was the only owner
  screen rendering `NotificationBell`, which is an athlete-surface affordance.
- ✅ **Results table → mobile accordion** — `ResultsPanel` rendered one four-column
  table at every width. `resColMetric` 90 + `resColValue` 90 + `resColNotes` 100 +
  gaps ≈ 305pt of FIXED width, so on a ~343pt phone the `flex: 1` athlete column got
  ~14pt: the header wrapped to `ATH/LET/E` and the name overlapped the metric. Desktop
  keeps the table; mobile is now one expandable row per athlete (collapsed = athlete +
  value + chevron, expansion = metric + the full untruncated note), single-open,
  `accessibilityState.expanded` exposed. 13 new tests; mutation-verified (forcing the
  table onto mobile fails 8 of them).
- ✅ **BACKEND: nullable DTO fields typed opaquely** — `ClassResultItemDto.notes` and
  `.editedAt` used `@ApiProperty({ nullable: true })` with no `type`, which Nest cannot
  infer from a `string | null` / `Date | null` union, so Swagger emitted an empty object
  and the generated frontend type was `Record<string, never> | null`. The old UI hid
  this behind an `as unknown` cast. Added explicit `type:`; regenerated types now read
  `string | null`, and the cast is gone.
  ⚠️ **Known remaining debt:** the same pattern still affects 9 other generated fields
  (`bookedPosition`, `cancelledAt`, `lastModifiedByUserId`, `deletedAt`, `expiresAt`,
  `description`, `data`, `acceptedAt`, `AcceptInviteRequestDto`). Not fixed here to
  avoid scope creep — worth a dedicated sweep.
- ✅ **`edit-class` Save gating + lifecycle lock** — the screen offered Save on a
  pristine form (a no-op PATCH) and offered Save/Delete on classes the backend
  refuses to touch. Backend truth: `edit-class.handler` AND `delete-class.handler`
  both reject anything other than `published`. Now (a) Save is `disabled` until the
  form differs from the loaded class, re-disabling if the owner reverts by hand —
  the same `isDirty` shape `ProgrammingPanel` already uses; (b) past `published` the
  screen renders a read-only summary (title "Class Details", a notice naming the
  state, the 7 field values as text, one Back action) instead of the form — disabled
  inputs would imply a temporary lock, but the backend refuses outright. The stale
  `DELETE_CAPTION` ("Only available for published classes") is gone: it documented a
  rule the UI never enforced, which the read-only branch now enforces for real.
  Tests 16 → 28; mutation-verified (Save always enabled → 3 fail, lock removed → 7 fail).
- ✅ **Coach screen bug fixes** (bugs only, restyle deferred to Phase 3) —
  `coach-class-details` had NO safe-area handling at all (the `← Back` pill collided
  with the notch), no `KeyboardAvoidingView` (keyboard covered the input), and inputs
  pinned at `height: 80` with no auto-grow.

### Phase 3 — Coach rollout — ✅ COMMITTED (2026-08-07)

All three screens migrated, gates re-run independently (`tsc` clean apart from the two
known pre-existing `__tests__` errors; e2e `tsc` clean; zero legacy tokens, zero raw hex,
zero orphaned style keys), and reviewed live at desktop 1280×832 and mobile 390×844.

✅ The keyboard-follow fix (round 3 below) was **re-tested on a physical device
2026-08-11 and confirmed working**. No verification debt remains on this phase.


`coach-classes`, `coach-class-details`, `coach-mark-attendance`.

Note: `coach-class-details` has had its safe-area / keyboard / auto-grow bugs fixed
already (Phase 2 round 2) but is deliberately still on the old `AppColors`/`Spacing`
tokens — its Clean Ink migration belongs here. Those fixes must survive the restyle.

**Design authority:** `DESIGN.md` (Clean Ink), as in Phases 1–2. Pencil is parked,
so no `ux-designer` pre-check run applies to this phase.

**Shared surface built first (to avoid parallel-agent collision):**
`components/CoachSidebar.tsx` — the canonical coach nav shell, replacing the three
duplicated dark-surface `Sidebar` copies the coach screens each carried. Reuses
`OwnerSidebar.styles.ts` and mirrors `OwnerSidebar`'s props, tone-based active
state, and foot-pinned Log Out. Nav set is My Classes + Profile (Profile deferred),
matching `designs/coach-screens.pen` frame `eT7ZY`. Mobile gains a nav drawer on
`coach-classes` via the existing `OwnerNavDrawer` — that screen previously had no
mobile nav and no sign-out path at all.

**Per-screen migration, one agent each:**
- `coach-classes` — legacy sidebar → `CoachSidebar` + mobile drawer; rainbow
  lifecycle badges → `StatusChip` on the authoritative `STATE_CHIP_TONE` map;
  Upcoming/Past buttons → `SegmentedToggle`; zebra rows → hairlines; per-row
  action → `Button` variant `quiet` (N crimson buttons in a list would violate
  the One Accent Rule).
- `coach-class-details` — hand-rolled toggle knob → real `Switch` styled as in
  `ProgrammingPanel`; `Save Programming` is the one primary action so
  `Mark Attendance` drops to `quiet`; green success banner → the quiet
  `Saved` / `Updated …` meta precedent (Clean Ink has no success role).
- `coach-mark-attendance` — three blue/green/red stat cards → monochrome ink
  numerals; gray-square avatar placeholders → `Icon` glyph or dropped; local
  `STATUS_LABEL` duplicate → shared `STATE_LABEL` + `StatusChip`.

Every existing `testID` is preserved — `e2e/coach.spec.ts` depends on them, and its
header documents the testIDs that were added specifically to unblock its coverage.

**Follow-ups found during diff + live review (all fixed):**
- `STATE_CHIP_TONE` promoted into `app/class-management/classStates.ts` as the single
  source of truth. All four call sites (`ClassHeader`, and the three coach screens)
  import it, so lifecycle chip tone can no longer drift per screen.
- `SegmentedToggle` gained an optional per-segment `testID`. The `{prefix}-{value}`
  default would have renamed `filter-upcoming-btn` / `filter-past-btn`, silently
  breaking `coach.spec.ts`.
- **`e2e/coach.spec.ts` asserted a string the restyle deleted.** It still expected the
  green banner's `Programming saved successfully.`, which is now the quiet `Saved`
  meta line — that test would have failed. Spec rewritten onto the new testIDs, the
  fragile `getByText('View').first()` / `getByText('Absent')` selectors replaced with
  testID-prefix locators, and all stale MISSING-TESTID blocks removed.
- **Pre-existing crash fixed, not a restyle regression:** `coach-class-details` threw
  `Maximum update depth exceeded`. `onContentSizeChange` added padding to the measured
  height and fed the result back into `contentSize`, looping forever. Proven pre-existing
  by reproducing it at HEAD on the legacy `Spacing.base` version. Now tracks the measured
  height verbatim with a 1px deadband.
- **Pre-existing desktop layout gap fixed:** the `coach-classes` table used six fixed
  columns (850px) inside a ~1550px card, leaving ~700px dead space with View buttons
  floating mid-table. `colSpace` now flexes and `colAction` right-aligns, matching the
  already-migrated owner `coaches.styles.ts`.
- Mobile `coach-mark-attendance` drew a leading hairline above its first athlete row,
  doubling the card's own top border. First row now suppresses it.

**Round-3 fixes from live device review (2026-08-07):**
- **`measureLayout` warning + programming input still under the keyboard.** The
  keyboard-follow scroll passed `scrollRef.current.getInnerViewNode()` (a numeric node
  handle) as `measureLayout`'s relative node. Under the New Architecture Fabric's
  `ReactNativeElement.measureLayout` does an `instanceof ReactNativeElement` check on
  that argument and bails with *"must be called with a ref to a native component"* —
  so the scroll never ran at all. Now uses `measureInWindow`, which needs no relative
  node. Two further causes of hidden lines: the scroll was a one-shot on focus (the
  caret sank back under the keyboard as the input auto-grew — `onContentSizeChange`
  now re-runs it), and it targeted the input's *top* edge (now scrolls by the overflow
  of the *bottom* edge past the keyboard's measured `endCoordinates.screenY`).
  Also: `automaticallyAdjustKeyboardInsets` is iOS-only, so Android had no room to
  scroll into — now gated to iOS with the keyboard height applied as real
  `paddingBottom` on Android. ✅ **Device-verified 2026-08-11** (web takes the
  `Platform.OS === 'web'` early return, so only a device exercises this path).
- **Save Programming offered on past classes.** `isProgrammingEditable()` promoted into
  `classStates.ts` — the owner `ProgrammingPanel` already had this predicate defined
  privately, so this removes the second copy. It mirrors `add-or-edit-programming.handler`,
  which accepts only `published` / `booking_closed`. Gating on state rather than on a
  date comparison is deliberate: the lifecycle scheduler advances past classes into one
  of the rejected states anyway, so state matches the server exactly. Past that point
  `coach-class-details` renders a locked notice instead of the form, and the Loggable
  switch becomes a read-only chip (with no Save there was nothing to persist a toggle
  with). Follows the `9f97c2a` precedent: remove the control, don't disable it — a
  disabled button implies a temporary lock, the backend refuses permanently.

**Flagged, deliberately not fixed (app-wide, pre-existing, outside Phase 3 scope):**
- The browser-default blue focus ring (`rgb(0, 95, 204)`) on multiline inputs is a
  foreign hue in Clean Ink. The owner `progInput` has the identical default; there is
  no global CSS reset. Wants one app-wide fix, not a coach-only patch.
- ~~**3 failing tests in `__tests__/schedule-dashboard.test.tsx`.**~~ ✅ **FIXED
  2026-08-11** — see "Test debt cleared" below. They were stale assertions, not
  regressions: the suite had drifted into the mobile register.
- No unit tests cover `coach-class-details` lifecycle gating; the owner equivalent has
  them in `edit-class.test.tsx`. The new `isProgrammingEditable` gate is live-verified
  across all five states but not test-locked.
- API errors surface as raw JSON (`{"message":"…","statusCode":400}`) because
  `ApiError` carries `response.text()` verbatim. Visible when submitting attendance on
  a `published` class — the backend correctly refuses (lifecycle invariant: attendance
  requires `in_progress` or `completed`), but the message is unreadable. `api-client.ts`
  is untouched by this phase and every screen shares the behaviour.

---

### Phase 4 — Owner onboarding follow-up: `gym-setup` — ✅ CLOSED (2026-08-11)

The first owner screen touched since Phase 2 closed. It was restyled to Clean Ink in
Phase 2 but never adapted, so it was the **only owner screen without
`useResponsiveLayout`**. Impeccable command: `adapt`, mode Operate, REFINEMENT —
Clean Ink and `frontend/DESIGN.md` preserved.

**Scope:** `app/gym-setup.tsx`, `app/gym-setup.styles.ts`, one line of `app/_layout.tsx`.

**Structural (the reason `adapt` and not `polish`):**
- Adopted `useResponsiveLayout`; one measure-capped, centred column (`maxWidth: 640`)
  so fields stop stretching a 1280px window edge to edge.
- Mobile register: actions restack full-width `column-reverse` (primary on top,
  matching `no-gym` and `login`); the space name/capacity pair stacks; `Add …`
  stretches.
- The 4-step rail survives 320pt by dropping its labels to numbered circles only.
- Header and form content now share one left edge — padding then measure cap, in the
  same order the ScrollView applies below.

**DESIGN.md violation fixed:** completed step circles and connectors used
`Status.open` green — the only green in the owner surface. DESIGN.md scopes that hue
to status-chip text on its wash. Progress now reads through ink + weight, with an
`Ink.inverse` check on ink marking done steps.

**Also:** collapsed the triple title (header + rail label + step heading all said
"Create Your Gym"); step headings dropped `screen` → `lead` so the surface header
outranks them; empty states adopted the icon-circle-on-`Ground.sunken` treatment from
`no-gym`; error banners swapped a heavy 4px side stripe for a full 1px hairline;
`Accent.base` focus borders wired to the focus state the keyboard-follow already
tracked; `Remove` given a real 44pt target plus `accessibilityRole`/label.

**Bug fixed (`_layout.tsx`):** the route was registered `headerShown: true` with no
back target, so Expo Router's arrow fell back to the parent group and sent a
**deep-linked owner into `/my-bookings` — the athlete surface**, while in-screen
Cancel correctly went to `/no-gym`. The wizard now draws its own header
(`headerShown: false`) and both affordances agree. Reproduces only via deep link.

**Gates:** `tsc` clean but for the 2 known pre-existing `__tests__` errors; FE jest
266/269 at the time (the 3 reds were `schedule-dashboard.test.tsx`, untouched then and
cleared since — see "Test debt cleared"); **`__tests__/gym-setup.test.tsx` 16/16**, every testID preserved.
Verified in one batched round at 1280 / 390 / 320 (device emulation — the Chrome
window has a 500px floor, so `resize_page` alone silently lies about mobile widths).
Console clean. Reviewed by `impeccable-finish-reviewer`; all material findings applied.

**Not verified live:** the success state. Reaching it consumes `owner@newgym.test`,
the fresh-owner fixture that must stay gym-less; it is covered by jest instead.
✅ Keyboard behaviour **device-verified 2026-08-11**.

---

### Test debt cleared — `schedule-dashboard` — ✅ DONE (2026-08-11)

The 3 reds that had stood since Phase 1 are fixed. **The frontend suite is now fully
green: 272/272 across 23 suites** (was 266/269), so jest is a real gate again.

**They were never product bugs, and never regressions.** All 3 asserted against the
**desktop** register — `5/20 spots`, `20/20 spots`, and 6 day columns each reading
"No classes" — but the suite renders under jsdom, whose default window is narrower
than the 768px mobile breakpoint. So `useResponsiveLayout` reported mobile, the screen
drew `MobileDayStrip` + `MobileClassCard`, and those texts do not exist there: the
mobile card renders bare `5/20` (the restyle dropped the "spots" suffix), and the
mobile register shows **one** day at a time, so there are no seven columns to be empty.

**Fix:** pin the register with the `jest.mock('@/hooks/useResponsiveLayout')` +
`let mockIsMobile` pattern already established in `ResultsPanel.test.tsx` /
`BookingsPanel.test.tsx`, reset to desktop in `beforeEach`. No production code changed
(`git diff` on `schedule-dashboard.tsx` is empty) — which is the proof these were
assertion drift, not behaviour.

**Coverage added:** the mobile register had **none**, and the switch made it nearly
free. 3 new tests — day-pill selection swaps which day's classes are on screen; the
per-day empty state; and the capacity string differing from desktop. Suite 11 → 14.
Mutation-verified: forcing the day filter to index 0 → 2 fail; adding a `spots` suffix
to the mobile card → 1 fails; removing the mobile empty state → 2 fail.

**Lesson worth keeping:** a responsive screen's tests silently pick a register from
jsdom's default window. Pin it explicitly, or an assertion can go stale against a
branch the test never renders — and read as a product bug for four months.

**Follow-up — desktop-register sweep — ✅ DONE (2026-08-11).** jsdom's default window is
**750px wide → `isMobile: true`** (probed directly), so before this sweep only 4 suites
pinned the register (`schedule-dashboard`, `notification-preferences`, `ResultsPanel`,
`BookingsPanel`) and every other responsive screen was tested in the **mobile branch
only**. All five gaps are now closed with the pin-the-register pattern:

| Suite | Tests | Desktop coverage added |
|---|---|---|
| `(tabs)/schedule` | 19 → 23 | top nav destinations; the 3-column `DesktopGrid` round-robin partitions every class without dup or truncation; per-card booking status; filtered-empty message |
| `class-details` | 16 → 20 | "Back to Schedule" instead of the mobile header; both columns present (info + `Programming`/`Recent Results`); book action wired; cancel action when booked |
| `edit-class` | 28 → 31 | form pre-fill; **footer order** `Cancel → Save → Delete` (mobile leads with a full-width Save) — the only observable register difference on this screen; dirty-gate on Save |
| `create-class` | 9 → 12 | `OwnerSidebar` mounted (genuinely desktop-only here, so it had zero coverage); mobile-only back button absent; breadth over all 7 controls + both footer actions |
| `gym-setup` | 16 → 19 | step-rail text labels (dropped on mobile); minimum-config gate; full walk to Review |

**Suite total 272 → 289, 23/23 suites green.** One global fix was needed to make any of
it possible: `usePathname` was missing from `jest-setup.ts`, and `DesktopTopNav` calls
it, so *no* suite could render a desktop-register screen without throwing.

Each block was mutation-verified, then **discrimination-checked** by forcing the desktop
`describe` to render mobile — which caught `edit-class`'s first draft passing in both
registers (it asserted only shared behaviour). Rewritten around footer document order,
it now fails when forced to mobile. Zero production lines changed by the sweep.

---

## Carried Debt (outlives this epic)

### ✅ Nullable DTO fields generate as opaque `Record<string, never>` — CLEARED 2026-08-11

**Resolved** by its own sweep on 2026-08-11, as the debt entry asked for.

A DTO property declared `T | null` and annotated `@ApiProperty({ nullable: true })`
with **no explicit `type:`** gives Nest nothing to infer from: the union defeats
`reflect-metadata`, Swagger emits an empty object schema, and `openapi-typescript`
generates `Record<string, never> | null`. Any real value assigned to it is then a
type error at the call site, so the field is unusable without a cast.

The fix was to add the explicit `type:` (`type: String` / `type: Number` /
`type: Date`) alongside `nullable: true`, then regenerate `frontend/types/api.gen.ts`.

**All 18 affected properties across 14 DTOs now emit real types**, `bookedPosition`
first as prioritised:

- `bookedPosition`, `cancelledAt` — `BookClassResponseDto`, `CancelBookingResponseDto`
- `notes`, `editedAt` — `LogResultResponseDto`, `EditResultResponseDto`,
  `AttendanceRecordResponseDto`
- `deletedAt` — `CreateSpaceResponseDto`, `UpdateSpaceResponseDto`,
  `ConfigureClassTypesResponseDto`
- `description` — `CreateGymResponseDto`, `GymProfileDto`
- `expiresAt` — `PurchaseMembershipPlanResponseDto`
- `lastModifiedByUserId` — `AddOrEditProgrammingResponseDto`
- `acceptedAt` — `InviteListItemDto` (also corrected `@ApiPropertyOptional` →
  `@ApiProperty`; the service always returns the key, `null` when unaccepted, so it
  is required-and-nullable, not optional)
- `data` — `NotificationItemDto`, a distinct cause: `type: Object` erases the value
  type, so it now declares `type: 'object'` with
  `additionalProperties: { type: 'string' }`

`AcceptInviteRequestDto` was on the original nine but needed **no change** — it is a
genuinely empty request body, so `Record<string, never>` is the correct generated
type. The only remaining occurrences in `api.gen.ts` are it, `webhooks`, and `$defs`,
all legitimately empty.

- **Beware casts as cover.** The old `ResultsPanel` carried an `as unknown` cast that
  hid the broken schema entirely; the bug only surfaced once the cast was removed.
  Treat an existing cast around a generated type as a symptom to investigate.
- **Guard for future DTOs:** any new `T | null` property must pass an explicit `type:`.
  A `Record<string, never>` in `api.gen.ts` outside the three known-empty schemas is
  the signal that one was missed.

**Verification:** backend `tsc` and 258/258 unit tests green; frontend `tsc` clean
(bar the two long-standing `useClassTransition` / `useRefreshOnAppActive` test-file
errors) and 289/289 tests across 23 suites green. The one red e2e case
(`PATCH /api/me` empty body → 400 in `invite-lifecycle-and-profile.e2e-spec.ts`) was
confirmed pre-existing by stashing the change.

---

## Scope

### Included

- One committed visual system, recorded as `DESIGN.md` + sidecar.
- A role-based token layer that supersedes the `theme.ts` color sprawl.
- Reusable styled primitives: DateTimePicker, Select, icon set, station card,
  spots-meter, status chip, floor-line divider, signage toggle/chips, buttons,
  inputs, empty/error/loading states.
- Full restyle of every athlete, then owner, then coach screen.

### Excluded

- **No** API, DTO, Swagger, or generated-type changes — visual layer only.
- **No** new product behavior, copy claims, or features (ask before changing
  factual copy).
- **No** change to multi-tenant scoping, class lifecycle, or role access.
- **No** dark mode in this epic (light "concrete" register is the world);
  revisit later if wanted.

---

## Invariants (must hold)

- TypeScript strict passes; existing tests stay green (update snapshot/DOM
  assertions only where the restyle legitimately changes markup).
- Behavior, accessibility, and responsiveness preserved or improved.
- Mobile-first for athletes; desktop-friendly for owners (existing
  `useResponsiveLayout` split kept).
- Each phase verified live before the next begins.

---

## Verification

- Per screen: compiles, TS strict, layout matches comp, live check in-app.
- Per phase: batched desktop+mobile screenshot round + Impeccable finish review.
- Detector (`detect.mjs`) run once on changed web targets at pilot finish.

---

## Open Decisions (resolve at build, not now)

- Final accent hex — anchored at `~#E23B4E` (muted crimson); exact value +
  hover/pressed/disabled tints tuned against the live white surface at Phase 0.
- Whether destructive/urgent states use a distinct deeper red or share the
  accent — resolved so the accent never competes with itself.
- Primary type face — a clean workhorse grotesk (real, obtainable web+native
  face, not a training-data default); chosen at Phase 0.
- Success/info color role (single muted green vs. neutral-only) — decided live.
