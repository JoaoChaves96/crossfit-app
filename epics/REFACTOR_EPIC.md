# EPIC: Codebase Refactor (Epic M)

**Status:** ✅ COMPLETE (2026-05-07)  
**Start Date:** 2026-05-07  
**Owner:** Frontend + Backend  
**Depends on:** None — pure refactor, no feature changes  
**Next epic:** TBD

---

## Objective

The codebase has grown organically across many epics and now has structural debt that will slow down future work. This epic addresses it in two fronts:

- **Frontend:** styles are inlined in every screen file, design tokens are inconsistent or missing, and several screens have grown past 700–1700 lines
- **Backend:** gym ownership checks, DTO field definitions, and exception handling are duplicated across controllers and handlers

No new features. No behavior changes. Only structure.

---

## Current State (Audit Findings)

### Frontend

| File | Lines |
|------|-------|
| `app/gym-settings.tsx` | 1,707 |
| `app/class-management.tsx` | 1,106 |
| `app/gym-setup.tsx` | 985 |
| `app/coaches.tsx` | 886 |
| `app/(tabs)/invites.tsx` | 830 |
| `app/log-results.tsx` | 807 |
| `app/coach-class-details.tsx` | 778 |
| `app/coach-mark-attendance.tsx` | 771 |
| `app/edit-class.tsx` | 763 |
| `app/schedule-dashboard.tsx` | 754 |

Style duplication:
- 29 `StyleSheet.create()` blocks spread across the codebase
- Hardcoded color values: `#FFFFFF` (60×), `#1A1A1A` (28×), `#6B7280` (26×), `#9CA3AF` (23×), `#111827` (22×)
- Hardcoded `fontSize: 14` (109×), `fontSize: 13` (74×) — no typography scale
- `paddingHorizontal: 20` (44×), `paddingVertical: 10` (40×) — no spacing scale
- `frontend/constants/theme.ts` exists but only has Expo boilerplate colors — unused by any screen

### Backend

| File | Lines | Type |
|------|-------|------|
| `api/class/class.controller.ts` | 978 | Controller |
| `api/gym-configuration/gym-configuration.controller.ts` | 754 | Controller |
| `queries/class/class-schedule.service.ts` | 310 | Service |
| `api/invite/invite.controller.ts` | 292 | Controller |
| `api/invite/invite.service.ts` | 263 | Service |

Duplication patterns:
- GymId ownership check (`if (gymId !== currentGymId) throw new UnauthorizedException()`) appears in 29+ places
- `CreateClassDto` and `EditClassDto` share 70%+ of their fields with identical validators — no shared base
- ~58 throw statements across class handlers following 3 repetitive patterns (ForbiddenException / NotFoundException / BadRequestException) with no shared factory
- Repository queries repeat `where: { id, gymId, deletedAt: IsNull() }` across 7+ repositories

---

## Decisions

- **No behavior changes.** Every refactor must leave the observable API and UI identical.
- **Frontend styles live in co-located `.styles.ts` files.** Each screen or component has a `[name].styles.ts` sibling file — never inline `StyleSheet.create()` in the component file.
- **Design tokens are the single source of truth.** All color, font size, and spacing literals in StyleSheets must reference the token file. Direct hex codes and magic numbers are forbidden after this epic.
- **Component decomposition is bounded.** Large screen files are split into logical sub-components within a co-located folder (e.g. `app/gym-settings/index.tsx` + `app/gym-settings/SpacesTab.tsx`). Sub-components are not generic — they are screen-specific.
- **Backend refactors stay within NestJS idioms.** Use guards, decorators, and base classes — not framework workarounds.
- **DTOs use inheritance, not composition.** A shared `BaseClassDto` is extended by `CreateClassDto` and `EditClassDto`.

---

## Scope

### Included

**Frontend:**
- Expand `frontend/constants/theme.ts` into a complete design token file: color palette, typography scale, spacing scale, border radius
- Extract all `StyleSheet.create()` blocks from every screen into co-located `.styles.ts` files
- Decompose `gym-settings.tsx` (1,707 lines) into sub-components
- Decompose `class-management.tsx` (1,106 lines) into sub-components

**Backend:**
- Extract the gymId ownership check into a reusable mechanism (decorator, guard, or pipe — agent decides best fit)
- Consolidate `CreateClassDto` and `EditClassDto` into a shared `BaseClassDto`
- Create an exception factory utility for the three repeated exception patterns
- Split `class.controller.ts` (978 lines) into focused sub-controllers or route groups

### Excluded

- Changing any API response shapes
- Changing any screen behavior or navigation
- Styling or visual changes (tokens must match current hardcoded values exactly)
- Test additions (separate concern)
- Any feature work

---

## Tasks

### Task #1 — Frontend: Design Tokens

**TASK TYPE:** REFACTOR  
**AGENT:** frontend-developer

Replace `frontend/constants/theme.ts` with a complete design token system covering the actual values in use across the app. Map every hardcoded color, font size, and spacing value currently scattered across screens into named tokens. All existing screens must keep identical visual output.

**Done when:**
- `theme.ts` exports a `Colors` object with named semantic tokens for all colors currently hardcoded across screens (at minimum: the top 5 hex values identified in the audit)
- `theme.ts` exports a `Typography` scale covering all `fontSize` values in use
- `theme.ts` exports a `Spacing` scale covering all `padding`/`margin` values in use
- TypeScript compiles cleanly (`npx tsc --noEmit`)
- No visual regressions (screens look identical)

**Status:** ✅ Complete

---

### Task #2 — Frontend: Styles Extraction

**TASK TYPE:** REFACTOR  
**AGENT:** frontend-developer  
**Depends on:** Task #1 (tokens must exist before styles reference them)

Extract every `StyleSheet.create()` block from every screen file into a co-located `.styles.ts` file. The component file imports styles from its sibling. All style values must reference the token file from Task #1 — no hardcoded hex or magic numbers.

Target files (all `.tsx` files in `frontend/app/` that contain `StyleSheet.create()`).

**Done when:**
- No `StyleSheet.create()` calls remain in any `.tsx` component/screen file
- Every screen has a sibling `[name].styles.ts` (or `styles.ts` inside a folder) that owns its styles
- All color, font size, and spacing literals in `.styles.ts` files reference tokens from `theme.ts`
- TypeScript compiles cleanly
- No visual regressions

**Status:** ✅ Complete

---

### Task #3 — Frontend: Component Decomposition

**TASK TYPE:** REFACTOR  
**AGENT:** frontend-developer  
**Depends on:** Task #2 (styles must be extracted first so decomposition doesn't re-inline them)

Decompose the two largest screen files into sub-components. Move each logical tab or section into its own file under a co-located folder.

**`gym-settings.tsx` (1,707 lines):**
- Convert to a folder: `app/gym-settings/index.tsx` (orchestration only)
- Extract each settings tab into its own file inside the folder (e.g. `SpacesTab.tsx`, `ClassTypesTab.tsx`, `ProfileTab.tsx`)

**`class-management.tsx` (1,106 lines):**
- Convert to a folder: `app/class-management/index.tsx` (orchestration only)
- Extract each panel/section into its own file inside the folder (e.g. `BookingsPanel.tsx`, `ResultsPanel.tsx`, `AttendancePanel.tsx`)

Sub-components are screen-specific — not generic shared components.

**Done when:**
- `gym-settings/index.tsx` is under 200 lines
- `class-management/index.tsx` is under 200 lines
- Navigation and routing still works identically (these are registered routes)
- TypeScript compiles cleanly
- No visual or behavioral regressions

**Status:** ✅ Complete

---

### Task #4 — Backend: GymId Ownership Guard

**TASK TYPE:** REFACTOR  
**AGENT:** backend-developer

The pattern `if (gymId !== currentGymId) throw new UnauthorizedException()` appears in 29+ places across controllers. Extract this into a reusable NestJS mechanism (custom guard, decorator, or pipe — choose the most idiomatic fit).

Apply it to all controllers in `backend/src/api/` that currently repeat the inline check. The check behavior must be identical to what it replaces.

**Done when:**
- Inline gymId ownership checks are removed from all controllers
- Replaced by the new mechanism applied at the controller or handler level
- All existing endpoints still return `401` when gymId mismatches
- TypeScript compiles cleanly

**Status:** ✅ Complete

---

### Task #5 — Backend: DTO Consolidation & Exception Factory

**TASK TYPE:** REFACTOR  
**AGENT:** backend-developer

**DTO consolidation:**
- Create a `BaseClassDto` in the class module that declares the shared fields with their validation decorators
- `CreateClassDto` and `EditClassDto` extend `BaseClassDto` (Create makes fields required, Edit makes them optional)
- Swagger decorators must remain accurate — use `@ApiProperty` / `@PartialType` / `@OmitType` as appropriate

**Exception factory:**
- Create a shared utility (e.g. `backend/src/http/exceptions.ts` or similar) that exports named factory functions for the three repeated patterns: gym not found/forbidden, entity not found, invalid state transition
- Replace the repeated `throw new XException(...)` calls across class handlers with calls to the factory
- Error messages and HTTP codes must remain identical

**Done when:**
- No duplicated field declarations between `CreateClassDto` and `EditClassDto`
- Swagger schema at `/api-docs` is still accurate for both endpoints
- Exception factory used in class handlers (at minimum)
- TypeScript compiles cleanly

**Status:** ✅ Complete

---

### Task #6 — Backend: Class Controller Decomposition

**TASK TYPE:** REFACTOR  
**AGENT:** backend-developer  
**Depends on:** Task #4 and Task #5 (guards and DTOs must be in place first)

Split `class.controller.ts` (978 lines) into focused controllers or route modules. Group by responsibility — scheduling operations, booking operations, programming, attendance, results. Each group becomes its own controller class registered in the class module.

**Done when:**
- No single controller file in the class module exceeds 300 lines
- All endpoints still exist at the same paths
- Swagger schema unchanged
- TypeScript compiles cleanly

**Status:** ✅ Complete

---

## Execution Order

```
Task #1 (Tokens)
    └── Task #2 (Styles Extraction)
            └── Task #3 (Component Decomposition)

Task #4 (GymId Guard)  ─┐
Task #5 (DTOs + Exceptions) ─┤── Task #6 (Controller Split)
```

Frontend tasks #1–3 are sequential. Backend tasks #4–5 can run in parallel; #6 depends on both.

---

## Security Invariants

- No endpoint paths, guards, or role checks may change
- `gymId` always from JWT claims — refactors must not introduce user-controlled gymId paths
- All `RolesGuard` decorators must remain in place after controller decomposition

---

## Done When

- [ ] `frontend/constants/theme.ts` is the single source of truth for all design tokens
- [ ] No `StyleSheet.create()` in any `.tsx` file
- [ ] All styles live in `.styles.ts` sibling files
- [ ] `gym-settings/index.tsx` and `class-management/index.tsx` are under 200 lines each
- [ ] GymId ownership check is a single reusable mechanism, not inline in 29 places
- [ ] `CreateClassDto` and `EditClassDto` share a `BaseClassDto`
- [ ] Exception factory used across class handlers
- [ ] No class controller file exceeds 300 lines
- [ ] `npx tsc --noEmit` passes on both frontend and backend
- [ ] Swagger schema at `/api-docs` is unchanged
- [ ] No visual or behavioral regressions in the app
