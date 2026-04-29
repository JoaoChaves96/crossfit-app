# Project State

**→ See `GYM_OWNER_EPIC.md` for completed epic details**

## Product

Crossfit class booking application.

## Current Phase (2026-04-29)

**EPIC:** Minimal Gym Owner MVP — ✅ COMPLETE

All tasks delivered and manually verified in browser.

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

## All Active Endpoints

✅ POST /api/gyms (create gym)  
✅ POST /gym-configuration/spaces (create space)  
✅ POST /gym-configuration/class-types (configure class types)  
✅ POST /api/gyms/:gymId/classes (create class)  
✅ POST /api/gyms/:gymId/configuration/coaches (invite coach)  
✅ GET /api/gyms/:gymId/configuration/coaches (list coaches)  
✅ GET /api/gyms/:gymId/schedule (owner schedule)  

## Local Environment

- Backend: NestJS on port 3000
- Frontend: Expo web on port 8081
- Auth: header-based (x-user-id, x-gym-id) — **DEV STUB, NOT PRODUCTION**
- Dev bootstrap screen exists (DEV ONLY)
- Designs saved in: `/designs/`

## Deferred to Pre-Prod

Security hardening items (JwtAuthGuard, role guards, user state, transaction safety) are deliberately deferred. Full list in `context/PRE_PROD_CHECKLIST.md`.

## Known Non-Goals (for now)

- No production auth (deferred, documented)
- No payments
- No Members UI
- No Settings UI

## Next Action

Gym Owner MVP is shipped. Next epic TBD — candidates:
- Coach MVP (assigned classes, programming, attendance)
- Pre-prod security hardening
- Member management UI
