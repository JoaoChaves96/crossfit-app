# Project State

**→ See `epics/GYM_OWNER_EPIC.md` for completed epic details**  
**→ See `epics/COACH_MVP_EPIC.md` for completed epic details**  
**→ See `epics/AUTH_JWT_EPIC.md` for completed epic details**

## Product

Crossfit class booking application.

## Current Phase (2026-05-03)

**EPIC:** JWT Auth Infrastructure (Epic A) — ✅ COMPLETE (2026-05-03)

**Previous:** Coach MVP — ✅ COMPLETE (2026-05-03)

## Auth State

- `JwtAuthGuard` validates real Bearer tokens (JWT_SECRET env var)
- Dev bypass active when `NODE_ENV=development` and no Authorization header (header stub still works locally)
- All endpoints protected with JwtAuthGuard + role-based RolesGuard
- `POST /api/auth/login` is public — issues signed JWT for valid credentials
- `CurrentUser` and `CurrentGym` read from JWT claims — no hardcoded fallbacks

## Local Environment

- Backend: NestJS on port 3000
- Frontend: Expo web on port 8081
- Auth: JWT (Bearer token) in production/test; header bypass in `NODE_ENV=development`
- Dev bootstrap screen exists (DEV ONLY) — still usable via header bypass
- Designs saved in: `/designs/`

## Verified Working Flows (Athlete MVP)

✅ View class schedule  
✅ View class details  
✅ Book a class  
✅ View My Bookings  
✅ Cancel booking  
✅ State persists across reload (dev)

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

## Known Non-Goals (for now)

- No login/register screens (Epic B — Auth Flows)
- No frontend token storage/handling (Epic B)
- No invite flow / email delivery (Epic C — Invite & Onboarding)
- No payments
- No Members UI
- No Settings UI

## Next Action

Epic A complete. Next: Epic B — Auth Flows (login/register screens, frontend token handling).
