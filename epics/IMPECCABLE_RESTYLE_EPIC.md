# EPIC: Impeccable Full-App Restyle — "Clean Ink"

**Status:** 🟢 Phase 1 (athlete rollout) BUILT & verified — 7 screens done (2026-08-07)
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

### Phase 2 — Gym Owner rollout — ✅ CODE-COMPLETE (2026-08-07, UNCOMMITTED)

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
- **Open items for live review:** (1) button labels moved ALL-CAPS→Title Case via
  the Button primitive (uppercase reserved for micro-labels in Clean Ink) —
  confirm acceptable as copy. **Not committed** — awaiting live screenshot review
  (chrome-devtools) + explicit go-ahead.

### Phase 3 — Coach rollout (follow-on)

`coach-classes`, `coach-class-details`, `coach-mark-attendance`.

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
