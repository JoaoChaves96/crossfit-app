# Project State

**→ See `epics/GYM_OWNER_EPIC.md` for completed epic details**  
**→ See `epics/COACH_MVP_EPIC.md` for completed epic details**  
**→ See `epics/AUTH_JWT_EPIC.md` for completed epic details**  
**→ See `epics/AUTH_FLOWS_EPIC.md` for completed epic details**  
**→ See `epics/ATHLETE_SCREENS_EPIC.md` for completed epic details**
**→ See `epics/INVITE_ONBOARDING_EPIC.md` for completed epic details**
**→ See `epics/LOG_RESULTS_EPIC.md` for completed epic details**
**→ See `epics/CLASS_MANAGEMENT_EPIC.md` for completed epic details**
**→ See `epics/GYM_SETTINGS_EPIC.md` for completed epic details**
**→ See `epics/CLASS_LIFECYCLE_EPIC.md` for completed epic details**
**→ See `epics/MEMBERS_EPIC.md` for completed epic details**
**→ See `epics/EDIT_CLASS_EPIC.md` for completed epic details**
**→ See `epics/REVOKE_COACH_EPIC.md` for completed epic details**
**→ See `epics/ATHLETE_PROFILE_EPIC.md` for completed epic details**
**→ See `epics/GYM_PROFILE_EPIC.md` for completed epic details**
**→ See `epics/NOTIFICATIONS_EPIC.md` for completed epic details**

## Product

Crossfit class booking application.

## Current Phase (2026-08-03)

**Tiered Audit — Phase 3: bug triage & fixes** (Trello board "Crossfit Application")
Phase 1 (automated sweep) and Phase 2 (per-screen walkthrough vs `.pen` designs) surfaced
🐞 cards on the board. Phase 3 fixed the audited backend/frontend bugs, blocker first, one at
a time (execution agents implement; each fix verified before the next).

**Phase 2 per-screen walkthrough status:** ✅ COMPLETE — all three roles. Athlete role ✅ (22 🐞
cards). Gym-Owner role ✅ (25 🐞 cards — incl. Membership Plans feature entirely missing, and
/invites rendering the athlete nav shell). Coach role ✅ (13 🐞 cards — Class Details renders the
desktop-style card on mobile; undesigned "Loggable" toggle; Mark Attendance layout diverges from
design & defaults athletes to Absent; desktop sidebar & Schedule/Create/Manage frames exceed coach
MVP scope. Coach desktop has NO duplicate-header bug). Discovery/triage only; fixes are Phase 3.

- ✅ **🐞 Athlete HTTP 403 on log-results** (blocker) → **Verified**
  - Backend (`9df7d47`): new own-scoped `GET /api/gyms/:gymId/classes/:classId/results/me`
    (`@Role(['athlete','owner','coach'])`, returns only the caller's result). Roster
    `GET .../results` left coach/owner-only (no cross-athlete leak). `GET .../programming`
    relaxed to athletes with an active membership in the gym. gymId scoping preserved.
  - Frontend (`d352c28`): `log-results.tsx` now fetches `.../results/me` (single `{ result }`
    shape) instead of the roster endpoint; types regenerated from Swagger.
- ✅ **🐞 Login screen hard-crash** (blocker, regression) → **Verified** (`78a07e1`)
  - `NotificationBell` (mounted globally) called `useNotifications()` → `useApiClient()`, which
    throws with no token, crashing the whole tree on `/login`. Restored the `isAuthenticated`
    guard so the bell renders `null` when logged out. Exposed when the unfinished notifications
    work (which carried the guard) was stashed.
- ✅ **🐞 Malformed (non-UUID) path param → HTTP 500** (low) → **Verified** (`29a538e`)
  - Global `UuidParamPipe` (APP_PIPE) rejects malformed UUIDs (params ending in `Id`) with 400
    before the DB; skips invite `token`/`inviteToken`. Global `QueryFailedFilter` (APP_FILTER)
    maps Postgres `22P02` → 400 as a backstop. Well-formed-but-missing UUID still → 404.
- ✅ **🐞 Duplicate-header / slug family** → **Verified** (`8a7528c`)
- ✅ **🐞 Raw-ISO date/time rendering family** → **Verified** (`0f71eee`)
- ✅ **🐞 Coach shown as email instead of display name** → **Verified** (`6ebb0b9`)
  - `CoachListItemDto` omitted `name` though the service already loaded the user. Added `name`
    to DTO + service mapping; create/edit-class coach pickers and the Coaches list now show the
    name (email demoted to secondary); types regenerated from Swagger.
- ✅ **🐞 Tenant-mismatch status inconsistent** → **Verified & pushed** (`4a28c58`)
  - **Invariant clarification:** for gym-scoped routes, **401 = missing/invalid authentication
    only; 403 Forbidden = authenticated but wrong tenant or role.** `GymOwnershipGuard` now throws
    `ForbiddenException` (was 401) on JWT-gym vs route-gym mismatch — single enforcement point for
    7 controllers. Service/handler resource-gym checks already returned 403 (unchanged). ~22 stale
    e2e assertions (previously expecting 401/500) aligned to 403; all no-auth 401 assertions kept.
    (No isolation bug existed — real cross-tenant access was always blocked; only the status code
    disagreed.)
- ✅ **🐞 Hardcoded gym labels + pluralization family** → **Verified** (`afca90c`)
  - Athlete/owner Schedule showed a hardcoded "My Gym"; invite acceptance showed a hardcoded
    "CrossFit Box" subtext. Added `gymName` to `GetClassScheduleResponseDto` (populated from
    `GymService` in both athlete and owner schedule paths) and `gymLocation` to
    `ValidateInviteResponseDto` (from `gym.location`). Frontend `schedule.tsx` renders the real
    gym name across mobile/empty-state/desktop headers; invite screen renders the gym location
    (fallback "Welcome to our community!"). Coach Class Details now pluralizes "athlete(s) booked".
    Types regenerated from Swagger.
- 🔍 **🐞 Tier-2 mobile-reflow family** (5 cards) → **To Verify** (subagent-driven; each task
  reviewed spec+quality and live-checked at 390×844 vs its `.pen` frame; final whole-branch
  review clean; desktop re-verified unregressed at 1280px). Presentation-only mobile (≤768px)
  reflows; desktop layouts untouched. Plan: `docs/superpowers/plans/2026-08-05-tier2-mobile-reflow.md`.
  - `6a70ce53` Gym Settings Spaces & Class Types tabs → card lists (frame `nU1Kb`) — `ae8d3ac`
  - `6a70cd64` Owner Schedule Dashboard → day-strip + vertical class cards (frame `XbXLT`) — `6c5587d`
  - `6a70d0f3` Coach Class Details → compact 2-col info grid (frame `gXPN7`) — `826bdbd`
  - `6a70d10c` Coach Mark Attendance → subheader + Select All + footer, dropped stat tiles (frame `PWqpG`) — `35de7b2`
  - `6a70cdba` Owner Class Management → 3-tab Info|Bookings|Results (frame `7iKEc`) — `ff3978a`
  - Stale card `6a70c8f2` (Athlete Schedule header) excluded — app already renders the designed single-tier header.
- 🔍 **🐞 Athlete data/section family** (8 cards) → **To Verify** — backend `301a065`, frontend `d7ff5bd`.
  Real data now renders where placeholders/labels-only stood before; two backend contract additions,
  types regenerated from Swagger. Added shared `frontend/utils/result-format.ts`.
  - `6a70c92f` Class Details programming → fetches `.../classes/{id}/programming`, renders WOD (empty-state fallback)
  - `6a70c933` Class Details Recent Results → fetches `.../results/me`, renders athlete's own result
  - `6a70c926` Class Details location meta row → `spaceName` MetaRow (desktop + mobile)
  - `6a70c8ed` Schedule card location row → conditional 📍 `spaceName`
  - `6a70c961` My Bookings location row + icon fix → split 📍 space / 👤 coach rows (Upcoming + Past)
  - `6a70cc1b` Training History result value → renders value + metric, "Not Logged" badge fallback
  - `6a70c9a5` Training History coach row → `TrainingHistoryItemDto.coachName` (attendance repo join) + 👤 row
  - `6a70caec` Invite Acceptance → `ValidateInviteResponseDto.inviterName`/`inviterRole`; renders "Invited by {name} ({role})"
- 🔍 **🐞 Owner/Class Management Results panel family** (3 cards) → **To Verify** — backend `e0d7aa4`, frontend `79c20fd`.
  Added `userName` to `ClassResultItemDto`, resolved via UserService in both the coach/owner class-results
  query and the athlete own-result query (fallback to userId); types regenerated from Swagger.
  - `6a70cdb7` Results row athlete UUID → renders `userName` with initials avatar
  - `6a70cd97` Result value raw ("300 seconds") → formatted via `result-format` util ("18:42 min", frame `9ZqYx`)
  - `6a70cd94` Header collision "AthleteMetric" → `gap: Spacing.sm` on shared tableHeader/tableRow
- 🔍 **🐞 Athlete/Schedule family** (3 cards) → **To Verify** — frontend `61c1d0b`.
  - `6a70c8e2` Leftover Expo-starter tabs → deleted `(tabs)/index` + `explore`, repointed `/(tabs)` redirect + modal link to `/(tabs)/schedule`
  - `6a70c8ea` Missing Week/Day toggle + filter chips → added Controls (segmented toggle + class-type chips, client-side filtering) on mobile + desktop. ⚠️ pixel-verify vs frame `wUe5e` pending (Pencil editor locked on gym-owner file)
  - `6a70c8f2` Two-tier header / hardcoded gym name → verify-only; app already renders single header + real `gymName`
- 🔍 **🐞 Owner/Invites + Nav-consistency family** (3 cards) → **To Verify** — frontend `d4af41c`.
  `OWNER_NAV_ITEMS` is now the single owner nav shell everywhere: Dashboard(off)/Schedule/Classes(off)/Members/Coaches/Plans(off)/Invites/Settings (Plans shown-but-disabled, feature deferred; label "Members" not "Athletes").
  - `6a70cf37` Invites used athlete tab-nav → moved `app/(tabs)/invites` → top-level `app/invites` route, removed from athlete Tabs layout, registered in root Stack, now hosts `OwnerSidebar` + mobile drawer
  - `6a70cf85` Divergent inline sidebars → schedule-dashboard/coaches/members drop their local `Sidebar`/`NAV_ITEMS` and render shared `OwnerSidebar`; dead per-screen sidebar styles removed
  - `6a70cf3c` Create-Invite modal no backdrop → overlay uses `absoluteFillObject` (flex:1 collapsed to 0-height in RN-Web Modal host); dimmed layer now fills viewport, card opaque above it
  - Note: `gym-settings` still uses its own `SettingsSidebar` (out of scope; unify later if desired)
- 🔍 **🐞 Owner/Schedule Dashboard mobile card** (`6a70cd59`) → **To Verify** — verify-only, no code change (HEAD `7e87d87`). `MobileClassCard` already matches design frame `XbXLT` (time / name / Coach / "{space} · {duration} min" row / top-right N/N capacity). Card's "corner badge" claim was inaccurate — `XbXLT` renders capacity as plain #6B7280 text, which the code already does. Row was added in the earlier Tier-2 mobile-reflow batch.
- 🔍 **🐞 Owner/Coaches family** (2 cards) → **To Verify** — backend `ba8b948`, frontend `6282daf`.
  Backend added `classesAssigned: string[]` (distinct, sorted class-type names) to `CoachListItemDto`,
  computed gymId-scoped with no N+1; types regenerated from Swagger.
  - `6a70ce71` Missing "Classes Assigned" column → desktop table realigned to design frame `5gQj6`
    (Name · Email · Status · Classes Assigned · Actions; Role column dropped); mobile `CoachCard` gains a
    Classes Assigned line ("No classes assigned" when empty)
  - `6a70ce73` Missing Coach Details side panel → new 340px desktop panel (frame `JE7Pq`); Actions "View"
    button (+ clickable row) selects a coach; panel shows Name/Email/Classes Assigned + Disable/Enable wired
    to the existing status-change flow; derives the coach from live list state by userId so it stays in sync
- 🔍 **🐞 Owner/Create Class family** (2 cards) → **To Verify** — frontend `1e8057a`.
  New reusable `OwnerSidebar` component (`OWNER_NAV_ITEMS`) introduced here; will be rolled out to remaining owner screens by the Nav-consistency batch.
  - `6a70cdd5` Desktop missing sidebar nav → Create Class desktop hosts `OwnerSidebar` (activeItem="classes"); mobile stays form-only
  - `6a70cdd7` Date/Time plain text inputs → new `DateTimeField`: web renders native `<input type=date|time>`, native falls back to pressable box + inline entry; payload contract unchanged (no new dependency)
- **Deferred (separate plan):** Notifications frontend migration — unit tests (17 failing) + tsc
  errors + expo 54 / expo-notifications 56 version mismatch. Held in `git stash` on `dev`; two
  🐞 cards remain in the board's Issues Found list. See `epics/NOTIFICATIONS_PLAN.md`.

## Previous Phase (2026-05-23)

**EPIC:** Notifications (Epic R) — ✅ COMPLETE (2026-05-23)  
**→ See `epics/NOTIFICATIONS_EPIC.md` for full task breakdown**
- ✅ Backend: Notification entities, service, controller, Expo push service
- ✅ Backend: Event listener (booking.created, waitlist.promoted, class.modified, class.cancelled)
- ✅ Backend: Class reminder scheduler (cron, 30 min before)
- ✅ UX Design: 3 frames in `athlete-screens.pen` (Notifications List, Bell Badge, Preferences)
- ✅ Frontend: useNotifications + usePushToken hooks
- ✅ Frontend: Notifications screen + NotificationBell with badge
- ✅ Frontend: Notification preference toggles in profile
- ✅ Frontend aligned with designs (per-type icon colors, subtitles, dividers)
- Tests: 169 backend + 164 frontend = 333 total

## Previous Phase (2026-05-18)

**EPIC:** Responsive Design — Phase 1 (Epic Q) — ✅ COMPLETE (2026-05-19)  
**→ See `epics/RESPONSIVE_DESIGN_EPIC.md` for full task breakdown**
- ✅ Task #1: UX Design — Coach mobile frames in `coach-screens.pen`
- ✅ Task #2: UX Design — Athlete desktop frames in `athlete-screens.pen`
- ✅ Task #3: Frontend — Coach screens responsive (mobile)
- ✅ Task #4: Frontend — Athlete screens responsive (desktop)

**EPIC:** Responsive Design — Phase 2 (Epic Q cont.) — ✅ COMPLETE (2026-05-19)  
- ✅ Task #5: UX Design — Owner mobile frames in `gym-owner-screens.pen`
- ✅ Task #6: Frontend — Owner screens responsive (mobile)

## Previous Phase (2026-05-07)

**EPIC:** Backend Test Coverage (Epic N) — ✅ COMPLETE (2026-05-07)  
**→ See `epics/BACKEND_TESTS_EPIC.md` for full task breakdown**
- ✅ Task #1: Unit tests — booking & cancellation handlers (21 tests)
- ✅ Task #2: Unit tests — state machine & lifecycle handlers (46 tests)
- ✅ Task #3: Unit tests — guards (GymOwnership, Roles, JWT) (27 tests)
- ✅ Task #4: Unit tests — remaining priority handlers (24 tests)
- ✅ Task #5: Integration tests — results, attendance, programming
- ✅ Task #6: Integration tests — class lifecycle & gym configuration
- ✅ Task #7: Integration tests — invitations & profiles

**EPIC:** Frontend Unit Tests (Epic O) — ✅ COMPLETE (2026-05-11)  
**→ See `epics/FRONTEND_TESTS_EPIC.md` for full task breakdown**
- ✅ Task #1: Jest + React Native Testing Library setup
- ✅ Task #2: Unit tests — auth & API hooks (28/30 pass; 2 expose missing behavior)
- ✅ Task #3: Unit tests — gym & class transition hooks (18 tests)
- ✅ Task #4: Unit tests — schedule & class details logic (35 tests)
- ✅ Task #5: Unit tests — form screens (create/edit class) (25 tests)
- ✅ Task #6: Unit tests — gym settings tabs (25 tests)

**EPIC:** Playwright E2E Suite (Epic P) — ✅ COMPLETE (2026-05-11)  
**→ See `epics/PLAYWRIGHT_EPIC.md` for full task breakdown**
- ✅ Task #1: Playwright setup + auth helpers + DB reset + testIDs
- ✅ Task #2: Athlete flows (5 flows)
- ✅ Task #3: Gym owner flows (9 flows)
- ✅ Task #4: Coach flows (4 flows)
- ✅ Task #5: Cross-role regression flows (lifecycle + waitlist)

## Previous Phase (2026-05-07)

**EPIC:** Codebase Refactor (Epic M) — ✅ COMPLETE (2026-05-07)  
**→ See `epics/REFACTOR_EPIC.md` for full task breakdown**
- ✅ Task #1: Frontend — Design tokens expansion (`theme.ts`)
- ✅ Task #2: Frontend — Styles extraction to `.styles.ts` files
- ✅ Task #3: Frontend — Component decomposition of `gym-settings` + `class-management`
- ✅ Task #4: Backend — GymId ownership guard extraction
- ✅ Task #5: Backend — DTO consolidation + exception factory
- ✅ Task #6: Backend — Class controller decomposition

## Previous Phase (2026-05-05)

**EPIC:** Gym Profile Editing (Epic L) — ✅ COMPLETE (2026-05-06)
**→ See `epics/GYM_PROFILE_EPIC.md` for full task breakdown**
- ✅ Task #1: Backend — `GET` + `PATCH /api/gyms/:gymId/profile`
- ✅ Task #2: UX Design — Gym Profile tab frame in `gym-owner-screens.pen`
- ✅ Task #3: Frontend — Profile tab added to `gym-settings.tsx`

**EPIC:** Athlete Profile (Epic K) — ✅ COMPLETE (2026-05-06)
**→ See `epics/ATHLETE_PROFILE_EPIC.md` for full task breakdown**
- ✅ Task #1: Backend — `GET /api/me` + `PATCH /api/me`
- ✅ Task #2: UX Design — Profile screen frame in `athlete-screens.pen`
- ✅ Task #3: Frontend — `profile.tsx` tab screen replacing `explore` tab

**EPIC:** Revoke Coach Access (Epic J) — ✅ COMPLETE (2026-05-06)
**→ See `epics/REVOKE_COACH_EPIC.md` for full task breakdown**
- ✅ Task #1: UX Design — Coaches frame variant with Deactivate/Reactivate actions
- ✅ Task #2: Frontend — Deactivate/Reactivate buttons in `coaches.tsx`

**EPIC:** Edit & Delete Class (Epic I) — ✅ COMPLETE (2026-05-06)
**→ See `epics/EDIT_CLASS_EPIC.md` for full task breakdown**
- ✅ Task #1: Backend — `PATCH` + `DELETE` `/api/gyms/:gymId/classes/:classId`
- ✅ Task #2: UX Design — Edit Class form frame in `gym-owner-screens.pen`
- ✅ Task #3: Frontend — `edit-class.tsx` + Edit/Delete wiring in Class Management
- ✅ Follow-up fix: coachUserId + spaceId added to ClassScheduleItemDto; Edit Class pickers now pre-fill correctly

**EPIC:** Members List (Epic H) — ✅ COMPLETE (2026-05-06)
**→ See `epics/MEMBERS_EPIC.md` for full task breakdown**
- ✅ Task #1: Backend — `GET /api/gyms/:gymId/members` endpoint
- ✅ Task #2: UX Design — Members screen frame in `gym-owner-screens.pen`
- ✅ Task #3: Frontend — `members.tsx` screen + sidebar nav wiring

**Results panel in Class Management** — ✅ COMPLETE (2026-05-05)
- ✅ UX — `Class Management / Results` frame added to `gym-owner-screens.pen` (node `9ZqYx`)
- ✅ Frontend — Results panel added to `class-management.tsx`; fetches `GET /:classId/results` in parallel with bookings

**EPIC:** Class Lifecycle & Duration (Epic G) — ✅ COMPLETE (2026-05-05)
**→ See `epics/CLASS_LIFECYCLE_EPIC.md` for full task breakdown**
- ✅ Task #1: Backend — Add `duration` field to ClassEntity + migration + all DTOs
- ✅ Task #2: Backend — Lifecycle scheduler (auto-transitions every minute)
- ✅ Task #3: Frontend — Duration field in Create Class + Class Management info card

**EPIC:** Gym Settings (Epic F) — ✅ COMPLETE (2026-05-05)
**→ See `epics/GYM_SETTINGS_EPIC.md` for full task breakdown**
- ✅ Task #1: UX Design — Spaces + Class Types list/form states in `gym-owner-screens.pen`
- ✅ Task #2: Frontend — Gym Settings screen, Spaces tab (CRUD)
- ✅ Task #3: Frontend — Class Types tab (CRUD)
- ✅ Task #4: Frontend — Enable sidebar Settings nav item

**EPIC:** Gym Owner Class Management (Epic E) — ✅ COMPLETE (2026-05-05)
**→ See `epics/CLASS_MANAGEMENT_EPIC.md` for full task breakdown**
- ✅ Task #1: Backend — `GET /api/gyms/:gymId/classes/:classId` + owners can mark attendance/structure
- ✅ Task #2: Frontend — Class Management screen (`app/class-management.tsx`)
- ✅ Task #3: Frontend — Schedule Dashboard class cards navigate to Class Management

**EPIC:** Log Results & Training History (Epic D) — ✅ COMPLETE (2026-05-04)  
**→ See `epics/LOG_RESULTS_EPIC.md` for full task breakdown**  
- ✅ Task #1: Backend — `GET /api/gyms/:gymId/athletes/me/history` endpoint  
- ✅ Task #2: UX Design — Log Results + Training History frames in `athlete-screens.pen`  
- ✅ Task #3: Frontend — Log Results screen (`app/log-results.tsx`)  
- ✅ Task #4: Frontend — Training History tab (`app/(tabs)/training-history.tsx`)  
- ✅ Task #5: Frontend — My Bookings completed cards → Log Results CTA  

**Waitlist UI** — ✅ COMPLETE (2026-05-04)
- ✅ UX design: waitlist state variants added to `designs/athlete-screens.pen` (Class Details State A/B, Schedule full card, My Bookings waitlisted badge)
- ✅ Backend: `waitlistPosition` added to `UserBookingItemDto` (was missing from GET /api/me/bookings)
- ✅ Frontend: waitlist states implemented across Schedule, Class Details, and My Bookings
- ✅ Frontend types regenerated from Swagger

**EPIC:** Invite & Onboarding (Epic C.2) — ✅ COMPLETE (2026-05-03)
- ✅ Task #1: Backend invite endpoints (create, validate, accept, list, revoke)
- ✅ Task #2: UX design — invite acceptance + invite manager screens
- ✅ Task #3: Frontend invite link handler (`/invite/[inviteToken]`)
- ✅ Task #4: Frontend invite manager (owner/coach tab)
- ✅ Task #5: Registration flow pre-fill from invite link

**Previous:** Athlete Screens Redesign (Epic C.1) — ✅ COMPLETE (2026-05-03)

**Previous:** Auth Flows (Epic B) — ✅ COMPLETE (2026-05-03)  
**Previous:** JWT Auth Infrastructure (Epic A) — ✅ COMPLETE (2026-05-03)  
**Previous:** Coach MVP — ✅ COMPLETE (2026-05-03)

## Auth State (Epic B Complete)

### Backend
- `JwtAuthGuard` validates real Bearer tokens (JWT_SECRET from `backend/.env`)
- Dev bypass: `NODE_ENV=development` + no Authorization header → falls back to `x-user-id`/`x-gym-id` headers
- All endpoints protected with JwtAuthGuard + role-based RolesGuard
- `POST /api/auth/login` — public, issues 7-day JWT for valid credentials
- `POST /api/auth/register` — public, creates athlete account and issues JWT (gymId: null, role: null)
- `CurrentUser` and `CurrentGym` decorators read from JWT claims

### Frontend
- `AuthContext` — manages token, user state, session restore on app start
- `apiClient` — attaches Bearer token to all requests, handles 401 redirects
- Navigation guard — unauthenticated users redirected to `/login`
- Login screen — logs in any role, routes by role (owner/athlete → `/(tabs)/schedule`, coach → `/coach-classes`)
- Register screen — creates new athlete account, routes to `/no-gym`
- No-gym screen — holds unauthenticated athletes until invited to a gym
- Dev bootstrap — three tappable user cards (Owner, Coach, Athlete) with instant login

## Local Environment

- Backend: NestJS on port 3000 (requires `JWT_SECRET` in `backend/.env`)
- Frontend: Expo web on port 8081
- Database: PostgreSQL (seeded with test users: owner@, coach@, athlete@example.com / password123)
- Designs: `/designs/auth-screens.pen`, `/designs/athlete-screens.pen`, `/designs/gym-owner-screens.pen`, `/designs/coach-screens.pen`

## Verified Working Flows (Athlete MVP)

✅ View class schedule (redesigned with Pencil specs: header, date separators, class cards, status badges)  
✅ View class details (redesigned: back nav, meta info with icons, capacity progress bar, programming section)  
✅ Book a class  
✅ View My Bookings (redesigned: toggle filters, booking cards, empty state with Browse Schedule button)  
✅ Cancel booking  
✅ State persists across reload (dev)  
✅ GymContext persists gym ID after login (fixed: athletes now see their gym's classes)

## Verified Working Flows (Gym Owner MVP)

✅ Schedule Dashboard loads with week view  
✅ Week navigation shows classes with correct times  
✅ Coaches screen loads coaches from API  
✅ Invite Coach modal submits and refreshes list  
✅ Sidebar navigation: Schedule ↔ Coaches  
✅ Disabled nav items are muted and non-interactive  

## Verified Working Flows (Coach MVP)

✅ My Assigned Classes screen loads with real coach-scoped data  
✅ Class Details & Programming screen renders class info and fetches existing WOD  
✅ WOD programming can be added and edited via POST  
✅ Mark Attendance screen loads real booked athletes from API  
✅ Navigation: My Classes → Class Details → Mark Attendance  
✅ All 3 CRITICAL cross-tenant class access bugs fixed (gymId scoping on programming, attendance, transition handlers)

## All Active Endpoints

✅ POST /api/auth/login (public — issues JWT)  
✅ POST /api/gyms (any authenticated user)  
✅ POST /gym-configuration/spaces (owner)  
✅ POST /gym-configuration/class-types (owner)  
✅ POST /api/gyms/:gymId/classes (owner)  
✅ POST /api/gyms/:gymId/configuration/coaches (owner)  
✅ GET /api/gyms/:gymId/configuration/coaches (owner)  
✅ GET /api/gyms/:gymId/schedule (owner)  
✅ GET /api/gyms/:gymId/coach/classes (coach)  
✅ GET /api/gyms/:gymId/classes/:classId/programming (athlete w/ active membership, coach, or owner)  
✅ POST /api/gyms/:gymId/classes/:classId/programming (coach)  
✅ GET /api/gyms/:gymId/classes/:classId/bookings (coach or owner)  
✅ POST /api/gyms/:gymId/classes/:classId/attendance (coach)  
✅ GET /api/gyms/:gymId/classes/:classId/results (coach or owner — full roster)  
✅ GET /api/gyms/:gymId/classes/:classId/results/me (athlete/coach/owner — caller's own result only)  
✅ POST /api/gyms/:gymId/classes/:classId/transition (coach or owner)  

## Invite Endpoints (Task #1 Complete)

✅ POST /api/gyms/:gymId/invites (owner/coach — creates invite, sends email, returns token + link)
✅ GET /api/invites/:inviteToken (public — validates invite, returns gym name + status)
✅ POST /api/invites/:inviteToken/accept (public — creates membership, returns gym + athlete)

## Known Non-Goals (for now)

- No payments/billing
- No analytics dashboard
- No admin panel

## Verified Working Flows (Waitlist)

✅ Schedule — full class cards show "Full · Waitlist Open" in orange  
✅ Class Details — "JOIN WAITLIST" button at capacity (State A)  
✅ Class Details — "WAITLIST #N – You are #N in line" + "LEAVE WAITLIST" when on waitlist (State B)  
✅ My Bookings — waitlisted cards show "WAITLISTED #N" badge, cancel label shows "Leave Waitlist"  
✅ `waitlistPosition` returned by GET /api/me/bookings and wired into all UI states  

## Verification Complete (2026-05-03)

✅ All endpoints tested and working  
✅ Frontend auth flow works end-to-end  
✅ Dev bootstrap ready for quick testing  
✅ Session persistence working  

Test credentials:
- athlete@example.com / password123
- coach@example.com / password123
- owner@example.com / password123

Resume token: c157441a-ad5b-46b0-b7eb-a0df12c3d445
