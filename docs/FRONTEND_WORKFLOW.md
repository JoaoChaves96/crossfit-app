# Frontend Workflow: Design → Code (Impeccable / Clean Ink)

## Overview

This document describes how frontend development works in this project:

**The design contract is `frontend/DESIGN.md`** — direction **"Clean Ink"**
**Tokens are code** — `frontend/constants/design.ts`, never raw hex
**Screens are composed, not invented** — primitives in `frontend/components/cleanink/`

> **Pencil is retired.** The `.pen` files under `/designs/` are historical reference
> only. Do not read them, do not gate work on a frame existing, and do not dispatch the
> (retired) `ux-designer` agent. This is settled — do not re-litigate it.

Design work goes through the **`impeccable` skill**, which owns the design process end
to end. `DESIGN.md` and its sidecar `frontend/.impeccable/design.json` were derived from
the shipped app, which is why they cannot drift from it the way a parked design file did.

---

## Workflow Process

### Step 1: Read the contract

- `frontend/DESIGN.md` — the binding rules, colors, and type scale
- `frontend/constants/design.ts` — the token layer you actually import from
  (`Ink`, `Ground`, `Line`, `Accent`, `Status`, `Space`, `Type`, `Elevation`)

Never hardcode a hex value. Never import the legacy `theme.ts` / `AppColors` /
`Spacing` — where those still appear on a screen they are debt to remove, not a
pattern to copy.

### Step 2: Find the exemplar

Copy the shape of a screen already on Clean Ink rather than deriving a new one:

| Building… | Follow |
|---|---|
| Data-dense owner screen | `app/schedule-dashboard.tsx` |
| An editor with a save | `app/class-management/ProgrammingPanel.tsx` |
| A roster / list of people | `app/class-management/BookingsPanel.tsx` |
| A settings tab | `app/gym-settings/SpacesTab.tsx`, `ClassTypesTab.tsx` |
| A nav shell | `components/OwnerSidebar.tsx`, `components/CoachSidebar.tsx` |
| Safe-area wrapping | `components/SafeScreen.tsx` |

### Step 3: Compose from primitives

`frontend/components/cleanink/` provides: `Text`, `Icon`, `StatusChip`,
`Button` / `ButtonRow`, `SegmentedToggle`, `FilterChips`, `SelectField`.

Reuse one before hand-rolling anything. `SelectField` already handles the
desktop-floating-menu vs mobile-bottom-sheet split; `Icon` wraps Ionicons behind
semantic names with **zero emoji**.

**When a glyph is missing, report it rather than editing `Icon.tsx`** — that file is a
shared surface and parallel agents collide on it.

### Step 4: Honour the binding rules

- **One Accent Rule** — the single crimson `#E23B4E` is one emphasis per view (primary
  CTA, active state, or key number), never decorative. A list of N rows each with a
  crimson button is N accents: per-row actions are `quiet`.
- **Two Reds Rule** — destructive is `Status.danger` `#B3261E`, a deliberately distinct
  hue. Never interchange it with the accent.
- **Named-Face Rule** — all text through the `Text` primitive. React Native does **not**
  select a font face from `fontWeight`; the primitive maps semantic weight → family.
- **Hairline-First Rule** — structure comes from hairlines and tone, not shadows.
- **Same-Hue Chip Rule** — a chip's text, background, and border share one hue family.
- `Status.open` green is reserved for **open/available** status only.
- **There is no success role.** Confirm with quiet meta text (`Saved`, `Updated …`),
  never a green success banner.

### Step 5: Verify

- `npx tsc --noEmit` clean
- `npm test` green
- **Every existing `testID` preserved** — the Playwright specs under `e2e/` locate by
  them, and a renamed testID passes local gates while breaking CI
- Live screenshot review at **desktop 1280×832 and mobile 390×844** — this project's
  jsdom width is 750px, so unpinned test suites exercise the mobile layout *only*
- No raw hex, no legacy `AppColors`/`Spacing.`, no orphaned style keys left behind

---

## Removing a control vs disabling it

Established precedent (commit `9f97c2a`): when the backend refuses an action
**permanently** — e.g. editing a class past `published` — **remove** the control and
render a locked notice. `disabled` implies a temporary lock and misleads the user.

Gate on **lifecycle state, not a date comparison**. `class-lifecycle.scheduler.ts`
advances class states every minute, so state matches the server exactly while a
client-side date check drifts from it. The shared predicates live in
`app/class-management/classStates.ts` (`STATE_LABEL`, `STATE_CHIP_TONE`,
`isProgrammingEditable`) — import them, don't redefine them.

---

## Task Structure

Every frontend task includes:

```
DESIGN CONTRACT: frontend/DESIGN.md (Clean Ink) + constants/design.ts
EXEMPLAR:        <the closest already-migrated screen>

WORKFLOW:
1. Read DESIGN.md; take all values from constants/design.ts
2. Compose from components/cleanink/ primitives
3. Follow the exemplar's structure for this screen shape
4. Preserve every existing testID
5. Gate: tsc, jest, screenshots at 1280×832 and 390×844

CONSTRAINTS:
- Do NOT touch cleanink/*, constants/design.ts, or sibling screens
- Report missing Icon glyphs instead of editing Icon.tsx
- No raw hex, no theme.ts / AppColors / Spacing
```

---

## API Type Safety

API response types are **generated from Swagger**, never hand-written:

1. Backend Swagger must be accurate (all `@Api*` / `@ApiProperty` decorators)
2. Frontend runs `npm run generate:api-types` → `@/types/api.gen`
3. Components import `type X = components['schemas']['YDto']`
4. If a type isn't in the generated file, **the endpoint isn't implemented in backend**

Standing rule: a `T | null` field needs an explicit `type:` in its `@ApiProperty`, or
Nest cannot infer the union and Swagger emits an empty object — which surfaces as
`Record<string, never> | null` in the generated types.

---

## Reference Docs

- **Design contract:** `frontend/DESIGN.md` + `frontend/.impeccable/design.json`
- **Tokens:** `frontend/constants/design.ts`
- **Agent rules:** `.claude/agents/frontend-developer.md`
- **Product spec:** `docs/MVP_SCREENS.md` (what screens should do)
- **User journeys:** `docs/USER_JOURNEYS.md`
