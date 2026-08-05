# Tier-2 Mobile Reflow — Design Spec

**Date:** 2026-08-05
**Phase:** Tiered Audit — Phase 3 (bug fixes), Tier-2 mobile-reflow batch
**Board:** Trello "Crossfit Application"

## Problem

Five screens render desktop-oriented layouts at mobile width (390px) that diverge
from their `.pen` mobile design frames. Each was surfaced as a 🐞 card during the
Phase 2 per-screen walkthrough and re-confirmed by a live audit at 390×844 against
the design frame.

A sixth card — `6a70c8f2` Athlete Schedule header — was found **STALE** during the
audit (the app already renders the single-tier header the design calls for) and is
excluded from this batch.

## Scope

In scope — 5 genuine mobile-reflow gaps, sequenced by shared pattern (Approach A):

| # | Card | Screen | File |
|---|------|--------|------|
| 1a | `6a70ce53` | Owner Gym Settings tabs | `frontend/app/gym-settings/index.tsx` (+ `SpacesTab`, `ClassTypesTab`) |
| 1b | `6a70cd64` | Owner Schedule Dashboard | `frontend/app/schedule-dashboard.tsx` |
| 2a | `6a70d0f3` | Coach Class Details | `frontend/app/coach-class-details.tsx` |
| 2b | `6a70d10c` | Coach Mark Attendance | `frontend/app/coach-mark-attendance.tsx` |
| 3  | `6a70cdba` | Owner Class Management | `frontend/app/class-management/index.tsx` (+ `BookingsPanel`, `ResultsPanel`, `ClassHeader`) |

Out of scope:
- **Athlete Schedule header** (`6a70c8f2`) — stale, no change.
- **Data-content bugs** spotted during the audit, tracked as separate cards:
  `6a70cdb7` (athlete UUID instead of name), `6a70cd97` ("300 seconds" raw),
  Coach Class Details `Class Type/Date/Space` rendering "—".
- **Membership Plans feature** — DEFERRED. Any plan data/columns inside these
  screens (Class Management Info-tab plan fields; any plan column) stays excluded.
- **Desktop layouts** — untouched on every screen. This batch only adds/corrects
  the mobile branch.
- **`useResponsiveLayout` refactor** — the two Coach screens keep their inline
  `MOBILE_BREAKPOINT = 768`; not refactored in this batch.

## Guiding pattern

Reference: `frontend/components/coaches.tsx` — `isMobile ? <Card list> : <table>`,
with dedicated mobile sub-components that reuse the existing handlers. No handler
logic is duplicated; only presentation forks.

## Design per screen

### Family 1 — Owner list/table → card

**1a. Owner Gym Settings tabs.** Design frame `nU1Kb` (header → tab bar → content).
The shell (`SettingsTabBar`) already reflows; only tab bodies need work.
- `SpacesTab`: on `isMobile`, render a `SpaceCard` list (name as title,
  "Base capacity: N" subtext, Edit/Delete as row actions) instead of the
  `Name / Base Capacity / Actions` table. Desktop table untouched.
- `ClassTypesTab`: same treatment — `ClassTypeCard` list on mobile.
- `ProfileTab`: already a form; verify not width-locked, otherwise leave.
- Gate via shared `useResponsiveLayout` `isMobile`.

**1b. Owner Schedule Dashboard.** Design frame `XbXLT` (horizontal day-strip +
vertical full-width class cards showing location · duration · capacity).
- Mobile branch: replace the horizontal-scroll `mobileDayColumns` ScrollView with a
  day-strip selector (single selected day) + a vertical list of full-width class
  cards, reusing existing card content and the class-nav handler.
- Desktop week grid untouched.

### Family 2 — Coach info-card compaction

Both screens already have a full `if (isMobile) return` branch; only that branch's
layout changes.

**2a. Coach Class Details.** Design frame `gXPN7` (compact 2-col InfoCard +
inline WOD title/badge).
- Rework the mobile info card into a 2-col label/value grid; move WOD title/badge
  inline. (The "—" data fields are a separate card — not fixed here.)

**2b. Coach Mark Attendance.** Design frame `PWqpG` (subheader "N athletes booked" +
Select All → avatar rows with present/absent toggle → footer "X of Y marked present"
+ Save).
- Mobile branch: drop the `StatCard` tiles + STATUS row; `MobileAthleteRow` becomes
  avatar + name + toggle; add the subheader (Select All) and footer count + Save.
  Reuse existing attendance-state handlers.

### Family 3 — Owner Class Management 3-tab restructure

**3. Class Management.** Design frame `7iKEc` (3-tab bar `Info | Bookings | Results`).
- Mobile branch: add an **Info** tab as the first `mobileTab` value; move the info
  card (compact 2-col) + its actions into the Info tab body; hide the always-shown
  wide card on mobile. Bookings/Results tab content unchanged.
- **DEFERRED carve-out:** Info tab renders only non-plan fields; Membership-Plan
  data excluded.
- Desktop side-panel layout untouched.

## Data flow / contracts

No backend or API changes. All screens already fetch the data they render; this is a
presentation-only reflow. No Swagger/type regeneration expected.

## Error handling

Existing loading/error/empty states are preserved. Each mobile card list must handle
the empty case with the screen's existing empty-state component (no new empty states
invented).

## Testing / verification

Per screen, in Approach-A order (1a → 1b → 2a → 2b → 3):
1. `tsc` / lint passes (TypeScript strict mode).
2. Live check at 390×844 in the browser against the named `.pen` frame — layout
   matches (no desktop table/grid, no stat tiles, correct tab set).
3. Desktop width unchanged (regression check).
4. Move the card through Trello To Verify → Verified with the commit ref after the
   user self-verifies live.

## Sequencing (Approach A)

Fix by shared pattern so each reflow idiom is settled once and reused:
1. **Family 1** (Gym Settings tabs → Schedule Dashboard) — establishes the
   table→card sub-component pattern.
2. **Family 2** (Class Details → Mark Attendance) — compact info-card idiom.
3. **Family 3** (Class Management) — most structural (adds a tab, relocates the
   info card).

Each screen verified live before the next. Commits only on the user's explicit
go-ahead.
