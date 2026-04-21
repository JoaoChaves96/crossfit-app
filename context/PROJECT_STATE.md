# Project State

**→ See `GYM_OWNER_EPIC.md` for current epic tracking (timeline, blockers, dependencies)**

## Product

Crossfit class booking application.

## Current Phase (2026-04-21)

**EPIC:** Minimal Gym Owner MVP

**Status:** Backend complete, security audit in progress, frontend design ready

- ✅ Backend: Gym creation endpoint (Task #1)
- ✅ Backend: Gym config endpoints verified (Task #2)
- ✅ Backend: Class creation endpoint verified (Task #3)
- ✅ Backend: Coach invitation endpoint verified + fixed (Task #4, #10)
- ✅ Design: 10 low-fidelity wireframes created (designs/ folder)
- ⏳ Security: Audit complete, CRITICAL findings require fixes before frontend
- 🚫 Frontend: Blocked pending security hardening (auth guard, role guards)

## Verified Working Flows (Athlete MVP)

✅ View class schedule  
✅ View class details  
✅ Book a class  
✅ View My Bookings  
✅ Cancel booking  
✅ State persists across reload (dev)

## Gym Owner MVP - New Endpoints Ready

✅ POST /api/gyms (create gym)  
✅ POST /gym-configuration/spaces (create space)  
✅ POST /gym-configuration/class-types (configure class types)  
✅ POST /api/gyms/:gymId/classes (create class)  
✅ POST /api/gyms/:gymId/configuration/coaches (invite coach - now auto-creates users)  

## Local Environment

- Backend: NestJS on port 3000
- Frontend: Expo (web + mobile)
- Auth: header-based (x-user-id, x-gym-id) — **DEV STUB, NOT PRODUCTION**
- Dev bootstrap screen exists (DEV ONLY)
- Designs saved in: `/designs/` (gym-setup.png, membership-plans.png, class-management.png, staff-management.png)

## Known Blockers

- **CRITICAL:** `JwtAuthGuard` is a stub; accepts any header value + hardcoded fallback 'user-123'
- **CRITICAL:** Gym creation endpoint has no role guard (any user → gym owner)
- **HIGH:** Auth/authz incomplete; security review flagged 8 issues (see DECISION_LOG.md)

## Known Non-Goals (for now)

- No production auth until security fixes complete
- No payments
- No automated E2E tests (manual verification only)
