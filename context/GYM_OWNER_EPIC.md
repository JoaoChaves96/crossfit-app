# EPIC: Minimal Gym Owner MVP

**Status:** 🔴 BLOCKED (Security audit findings)  
**Start Date:** 2026-04-21  
**Target Completion:** 2026-05-05 (estimated)  
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

### Design: COMPLETE ✅
- [x] Low-fidelity wireframes for all 10 screens
- [x] Saved in `/designs/`: gym-setup.png, membership-plans.png, class-management.png, staff-management.png

### Security Review: IN PROGRESS ⏳
- [x] Audit conducted (2026-04-21)
- [ ] CRITICAL issues must be fixed before frontend work
- [ ] Issues documented in DECISION_LOG.md

### Frontend: BLOCKED 🚫
- [ ] Task #5: Gym creation wizard UI (BLOCKED on security fixes)
- [ ] Task #6: Class scheduling screen (BLOCKED on Task #5)
- [ ] Task #7: Coach invitation modal (BLOCKED on security fixes)
- [ ] Task #8: Navigation & routing (BLOCKED on Tasks #5-7)
- [ ] Task #9: E2E tests (BLOCKED on all above)

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

- [ ] All backend security issues fixed and re-audited
- [ ] All 5 backend endpoints have 100% E2E test coverage
- [ ] Gym creation wizard works end-to-end (create gym → set spaces → set class types)
- [ ] Class scheduling works (create class → visible in schedule dashboard)
- [ ] Coach invitation works (invite → user auto-created → visible in coaches list)
- [ ] Navigation works (gym owner can move between all admin screens)
- [ ] E2E tests pass for full gym owner onboarding flow
- [ ] No security warnings from code review

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
