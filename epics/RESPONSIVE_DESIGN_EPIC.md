# Epic Q — Responsive Design (Coach Mobile + Athlete Desktop)

**Status:** ✅ COMPLETE (2026-05-19)  
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

### Task #1 — UX Design: Coach Mobile Frames ✅ COMPLETE (2026-05-19)
**Agent:** `ux-designer`  
**Deliverable:** Mobile-variant frames in `designs/coach-screens.pen` for all 3 coach screens  
**Constraint:** Must match existing app look & feel (design tokens, spacing, typography from athlete mobile screens)  
**Frames:** `hnkOL` (My Classes), `gXPN7` (Class Details), `PWqpG` (Mark Attendance)

### Task #2 — UX Design: Athlete Desktop Frames ✅ COMPLETE (2026-05-19)
**Agent:** `ux-designer`  
**Deliverable:** Desktop-variant frames in `designs/athlete-screens.pen` for all 7 athlete screens  
**Constraint:** Must feel like the same app — same design language, just better use of space  
**Frames:** `xINPc` (Schedule), `J3IHN` (My Bookings), `bnWAo` (Training History), `WwbkY` (Profile), `e4xgL` (Class Details), `twcwR` (Log Results), `stqJL` (Invites)  
**Design decisions:** Top nav bar replaces bottom tabs on desktop; content centered in 960px (grids) or 480-560px (forms); multi-column grids for cards

### Task #3 — Frontend: Coach Mobile Responsive ✅ COMPLETE (2026-05-19)
**Agent:** `frontend-developer`  
**Deliverable:** All 3 coach screens render correctly on mobile viewports (≤768px)  
**Approach:** `useWindowDimensions()` with 768px breakpoint, mobile styles in separate `mobileStyles` exports  
**Done when:** Coach screens usable on iPhone-sized viewport in browser

### Task #4 — Frontend: Athlete Desktop Responsive ✅ COMPLETE (2026-05-19)
**Agent:** `frontend-developer`  
**Deliverable:** All 7 athlete screens render correctly on desktop viewports (≥1024px)  
**Approach:** `useResponsiveLayout` hook (1024px breakpoint), `DesktopTopNav` component, desktop styles in `.styles.ts` files  
**Done when:** Athlete screens look intentional on a 1440px wide browser window

---

## Phase 2 — Owner Screens → Mobile

**Status:** ✅ COMPLETE (2026-05-19)

Owner screens are the most complex (sidebars, multi-panel class management, settings tabs, tables). These need mobile adaptation.

**Screens:**
| Screen | File | What needs to change |
|--------|------|---------------------|
| Schedule Dashboard | `schedule-dashboard.tsx` | Collapse sidebar, vertical week nav, stacked day view |
| Class Management | `class-management/` | Collapse sidebar + panels into tabbed single-column |
| Create Class | `create-class.tsx` | Full-width form, larger inputs |
| Edit Class | `edit-class.tsx` | Full-width form, larger inputs |
| Gym Settings | `gym-settings/` | Replace sidebar with tab bar, stack form content |
| Coaches | `coaches.tsx` | Card list, full-screen invite modal |
| Members | `members.tsx` | Card list replacing table |

### Task #5 — UX Design: Owner Mobile Frames ✅ COMPLETE (2026-05-19)
**Agent:** `ux-designer`  
**Deliverable:** Mobile-variant frames in `designs/gym-owner-screens.pen` for all 7 owner screens  
**Constraint:** Must match coach mobile + athlete mobile design language (same tokens, card styles, touch targets)  
**Frames:** `XbXLT` (Schedule), `7iKEc` (Class Management), `VeMLd` (Create Class), `5gBZA` (Edit Class), `nU1Kb` (Gym Settings), `zPcNM` (Coaches), `ZUwOd` (Members)

### Task #6 — Frontend: Owner Mobile Responsive ✅ COMPLETE (2026-05-19)
**Agent:** `frontend-developer`  
**Deliverable:** All 7 owner screens render correctly on mobile viewports (≤768px)  
**Approach:** `useResponsiveLayout` hook (added `isMobile` at 768px), hamburger drawer replaces sidebars, tabbed panels, card lists replace tables  
**Done when:** Owner screens usable on iPhone-sized viewport in browser

---

## Design Principles

- **One codebase, responsive layouts** — no separate mobile/desktop routes or components
- **Breakpoints:** Mobile ≤768px, Tablet 769–1023px, Desktop ≥1024px
- **Shared design tokens** — same colors, typography, spacing scale across all viewports
- **Touch targets:** Minimum 44px on mobile for all interactive elements
- **Progressive enhancement:** Mobile layout is the base, desktop adds columns/space
