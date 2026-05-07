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

## Product

Crossfit class booking application.

## Current Phase (2026-05-07)

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
✅ GET /api/gyms/:gymId/classes/:classId/programming (coach or owner)  
✅ POST /api/gyms/:gymId/classes/:classId/programming (coach)  
✅ GET /api/gyms/:gymId/classes/:classId/bookings (coach or owner)  
✅ POST /api/gyms/:gymId/classes/:classId/attendance (coach)  
✅ GET /api/gyms/:gymId/classes/:classId/results (coach or owner)  
✅ POST /api/gyms/:gymId/classes/:classId/transition (coach or owner)  

## Invite Endpoints (Task #1 Complete)

✅ POST /api/gyms/:gymId/invites (owner/coach — creates invite, sends email, returns token + link)
✅ GET /api/invites/:inviteToken (public — validates invite, returns gym name + status)
✅ POST /api/invites/:inviteToken/accept (public — creates membership, returns gym + athlete)

## Known Non-Goals (for now)

- No payments
- No Members UI
- No Settings UI

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
