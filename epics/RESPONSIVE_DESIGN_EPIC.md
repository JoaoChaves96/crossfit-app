# Epic Q — Responsive Design (Coach Mobile + Athlete Desktop)

**Status:** 🟡 NOT STARTED  
**Phase:** 1 of 2 (Phase 2: Owner screens — see Future Work below)

## Goal

Every role should have a polished experience on both mobile (native/browser) and desktop (browser). Currently:
- **Coach screens** are desktop-only (sidebars, wide layouts) — need mobile adaptation
- **Athlete screens** are mobile-only (narrow stacked layouts) — need desktop adaptation

This epic covers Phase 1. Phase 2 (Owner screens on mobile) is documented below but NOT in scope yet.

---

## Scope — Phase 1

### Part A: Coach Screens → Mobile

Add responsive mobile layouts to all coach screens. Coaches use their phones during live classes (marking attendance, checking programming), so mobile is critical.

**Screens:**
| Screen | File | What needs to change |
|--------|------|---------------------|
| My Assigned Classes | `coach-classes.tsx` | Stack cards vertically, touch-friendly sizing |
| Class Details + Programming | `coach-class-details.tsx` | Collapse side panels, single-column flow |
| Mark Attendance | `coach-mark-attendance.tsx` | List with large tap targets, swipe-to-mark or checkboxes |

### Part B: Athlete Screens → Desktop

Adapt athlete screens so they don't look like a phone app stretched on a laptop. Better use of horizontal space, max-width containers, multi-column where appropriate.

**Screens:**
| Screen | File | What needs to change |
|--------|------|---------------------|
| Schedule | `(tabs)/schedule.tsx` | Wider cards, multi-column or centered container |
| My Bookings | `(tabs)/my-bookings.tsx` | Same — wider layout, grid on desktop |
| Training History | `(tabs)/training-history.tsx` | Wider content area, possible side stats |
| Profile | `(tabs)/profile.tsx` | Centered form with max-width |
| Class Details | `class-details.tsx` | Wider content, side-by-side info on desktop |
| Log Results | `log-results.tsx` | Centered form with max-width |
| Invites | `(tabs)/invites.tsx` | Wider list, centered container |

---

## Task Sequence

### Task #1 — UX Design: Coach Mobile Frames
**Agent:** `ux-designer`  
**Deliverable:** Mobile-variant frames in `designs/coach-screens.pen` for all 3 coach screens  
**Constraint:** Must match existing app look & feel (design tokens, spacing, typography from athlete mobile screens)

### Task #2 — UX Design: Athlete Desktop Frames
**Agent:** `ux-designer`  
**Deliverable:** Desktop-variant frames in `designs/athlete-screens.pen` for all 7 athlete screens  
**Constraint:** Must feel like the same app — same design language, just better use of space

### Task #3 — Frontend: Coach Mobile Responsive
**Agent:** `frontend-developer`  
**Deliverable:** All 3 coach screens render correctly on mobile viewports (≤768px)  
**Approach:** Use responsive breakpoints, conditional layouts, no separate mobile routes  
**Done when:** Coach screens usable on iPhone-sized viewport in browser

### Task #4 — Frontend: Athlete Desktop Responsive
**Agent:** `frontend-developer`  
**Deliverable:** All 7 athlete screens render correctly on desktop viewports (≥1024px)  
**Approach:** Max-width containers, grid layouts where appropriate, no stretched single-column  
**Done when:** Athlete screens look intentional on a 1440px wide browser window

---

## Future Work — Phase 2 (NOT in scope)

### Owner Screens → Mobile

Owner screens are the most complex (sidebars, multi-panel class management, settings tabs, tables). These need mobile adaptation next.

**Screens to address in Phase 2:**
- `schedule-dashboard.tsx` — Week view + sidebar navigation
- `class-management/` — Multi-panel with sidebar (bookings, results, header)
- `create-class.tsx` / `edit-class.tsx` — Complex forms
- `gym-settings/` — Tabbed settings with sidebar
- `coaches.tsx` — Coach list + invite modal
- `members.tsx` — Members table

**Why deferred:** Owner tasks (creating classes, managing settings) are typically done at a desk. Coach mobile is higher priority because coaches actively use their phone during class.

---

## Design Principles

- **One codebase, responsive layouts** — no separate mobile/desktop routes or components
- **Breakpoints:** Mobile ≤768px, Tablet 769–1023px, Desktop ≥1024px
- **Shared design tokens** — same colors, typography, spacing scale across all viewports
- **Touch targets:** Minimum 44px on mobile for all interactive elements
- **Progressive enhancement:** Mobile layout is the base, desktop adds columns/space
