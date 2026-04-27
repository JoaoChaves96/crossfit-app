# Project State

**→ See `GYM_OWNER_EPIC.md` for current epic tracking (timeline, blockers, dependencies)**

## Product

Crossfit class booking application.

## Current Phase (2026-04-22)

**EPIC:** Minimal Gym Owner MVP

**Status:** Backend complete, frontend unblocked, Task #5 prompt ready to execute

- ✅ Backend: Gym creation endpoint (Task #1)
- ✅ Backend: Gym config endpoints verified (Task #2)
- ✅ Backend: Class creation endpoint verified (Task #3)
- ✅ Backend: Coach invitation endpoint verified + fixed (Task #4, #10)
- ✅ Design: 10 low-fidelity wireframes created (designs/ folder)
- ✅ Security: Audit complete — CRITICAL findings deliberately deferred to pre-prod (see PRE_PROD_CHECKLIST.md)
- ✅ Planning: Task #5 (Gym creation wizard) fully scoped and prompt ready
- 🚫 Frontend: Not yet started — Task #5 prompt ready to hand off to frontend-developer agent

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

None — frontend is unblocked.

## Deferred to Pre-Prod

Security hardening items (JwtAuthGuard, role guards, user state, transaction safety) are deliberately deferred. Full list in `context/PRE_PROD_CHECKLIST.md`. Header-based auth is intentional for MVP.

## Known Non-Goals (for now)

- No production auth (deferred, documented)
- No payments
- No automated E2E tests (manual verification only)

## Next Action

Hand Task #5 prompt to frontend-developer agent. Prompt is defined and ready — see this session's conversation context.
