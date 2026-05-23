# EPIC: Minimal Gym Owner MVP

**Status:** ✅ COMPLETE (2026-04-29)  
**Start Date:** 2026-04-21  
**Completed:** 2026-04-29  
**Owner:** Backend + Frontend team

---

## Objective

Ship the minimal gym owner feature set to enable gym owners to:
- Create and configure their gym
- Schedule classes
- Invite coaches

This unblocks all downstream features (Coach, Athlete complete flow) and enables B2B sales.

---

## Scope

### Included (MVP)
- Gym creation (name, location, description)
- Gym configuration (spaces, class types)
- Class scheduling (date, time, coach, space, capacity)
- Coach invitation (auto-create user on invite)

### Deferred to Phase 3
- Member management UI
- Billing/revenue dashboards
- Advanced gym settings
- Announcements

---

## Current Progress

### Backend: COMPLETE ✅
- [x] Task #1: Gym creation endpoint + E2E tests (DONE)
- [x] Task #2: Gym config endpoints verified (DONE)
- [x] Task #3: Class creation endpoint verified (DONE)
- [x] Task #4: Coach invitation endpoint verified (DONE)
- [x] Task #10: Coach auto-create user fix (DONE)
- [x] Task #11: GET /api/gyms/:gymId/configuration/coaches endpoint (DONE - 2026-04-29)

### Design: COMPLETE ✅
- [x] Low-fidelity wireframes for all 10 screens
- [x] Saved in `/designs/`: gym-setup.png, membership-plans.png, class-management.png, staff-management.png

### Security Review: COMPLETE ✅
- [x] Audit conducted (2026-04-21)
- [x] CRITICAL findings deliberately deferred to pre-prod (see PRE_PROD_CHECKLIST.md)

### Frontend: COMPLETE ✅
- [x] Task #5: Gym creation wizard UI (DONE - 2026-04-27)
- [x] Task #6: Class scheduling screen / Schedule Dashboard for Gym Owner (DONE - 2026-04-27)
- [x] Task #7: Coaches screen + invite modal (DONE - 2026-04-29)
- [x] Task #8: Navigation & routing (DONE - 2026-04-29)
- [x] Task #9: E2E tests for GET coaches endpoint (DONE - 2026-04-29)

### Bug Fixes: COMPLETE ✅
- [x] Invite modal showed "Coach" instead of email after optimistic append — fixed with refetch (2026-04-29)
- [x] Class cards showed "Invalid Date" instead of scheduled time — fixed HH:MM parsing (2026-04-29)

---

## Critical Blockers (Must Fix Before Frontend)

| Issue | Severity | Fix Est. | Notes |
|-------|----------|----------|-------|
| `JwtAuthGuard` is dev stub (no token validation) | CRITICAL | 4h | Affects all endpoints; hardcoded fallback 'user-123' |
| `POST /api/gyms` has no role guard | CRITICAL | 2h | Any user → gym owner (privilege escalation) |
| Auto-created users set to `active` (no credentials) | HIGH | 2h | Should be `pending` until profile setup |
| User name = email address (data leakage) | HIGH | 1h | Set to placeholder until user fills in name |
| No transaction wrapping user + staff creation | HIGH | 2h | Partial failure leaves orphaned users |
| Missing input validation (max-length) | MEDIUM | 1h | Add constraints to gym creation DTO |

**Total Estimated Fix Time:** ~12 hours (1-2 days with parallelization)

---

## Timeline

**Phase 1: Security Hardening** (2026-04-22 to 2026-04-23)
- Fix CRITICAL auth/authz issues
- Fix HIGH data safety issues
- Re-run security audit to confirm

**Phase 2: Frontend Implementation** (2026-04-24 to 2026-05-02)
- Task #5: Gym wizard (3-4 days)
- Task #6: Class scheduling (2-3 days)
- Task #7: Coach invitation (1 day)
- Task #8: Navigation (1 day)
- Task #9: E2E tests (1-2 days)

**Phase 3: Testing & Launch** (2026-05-03 to 2026-05-05)
- Manual testing of full flow
- Bug fixes
- Ready for launch

---

## Dependencies

```
Task #1 → Task #2 ─┐
                    ├→ Task #5 ┐
Task #3 ────────────┤          ├→ Task #8 ─→ Task #9
                    ├→ Task #6 ┘
Task #4 → Task #10 → Task #7 ┘
```

**Blockers:** All frontend tasks blocked on security fixes (no Task #11 dependency, but auth must be real)

---

## Acceptance Criteria

- [x] All backend security issues triaged — CRITICAL items deferred to pre-prod (PRE_PROD_CHECKLIST.md)
- [x] All backend endpoints have E2E test coverage
- [x] Gym creation wizard works end-to-end (create gym → set spaces → set class types)
- [x] Class scheduling works (create class → visible in schedule dashboard)
- [x] Coach invitation works (invite → user auto-created → visible in coaches list)
- [x] Navigation works (gym owner can move between Schedule and Coaches screens)
- [x] E2E tests pass for GET coaches endpoint
- [x] Manual flow verified end-to-end in browser (2026-04-29)

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Auth overhaul takes longer than 2 days | Timeline slip | Start immediately; parallelize frontend design |
| Frontend more complex than wireframes suggest | Timeline slip | Wireframes ready for quick iteration |
| E2E tests expose new issues | Rework | Plan buffer in testing phase |

---

## References

- **Wireframes:** `/designs/` folder (4 PNG files)
- **Task List:** Tasks #1-10 in task management system
- **Security Audit:** Full report via security-review agent
- **Backend Endpoints:** Documented in E2E test files
- **Product Spec:** PRODUCT.md, USER_JOURNEYS.md, MVP_SCREENS.md
