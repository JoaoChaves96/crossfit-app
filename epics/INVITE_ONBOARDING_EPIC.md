# EPIC: Invite & Onboarding (Epic C.2)

**Status:** 🔄 IN PROGRESS  
**Start Date:** TBD  
**Owner:** Backend + Frontend team  
**Depends on:** `epics/ATHLETE_SCREENS_EPIC.md` — ✅ Complete  
**Next epic:** TBD

---

## Objective

Implement invite flow and onboarding so gym owners and coaches can invite athletes to their gyms, and athletes can join gyms via invite links with email confirmation.

When complete, the app will support:
- Gym owners/coaches generating invite links
- Email delivery of invite links
- Athletes clicking invite links to join gyms
- User profile setup during onboarding (name, preferences)
- Membership activation after joining

---

## Current State

- Athletes can log in and see no gym context (redirected to `/no-gym`)
- No invite generation mechanism exists
- No email delivery infrastructure
- No user profile screens
- Gym membership created only via seed script

---

## Scope

### Included
- **Invite generation** — API endpoint for owners/coaches to create athlete invites
- **Invite link delivery** — email sending with invite links
- **Invite acceptance flow** — athlete clicks link, sees gym info, joins with one tap
- **Invite management** — view, revoke, resend invite links (owner/coach screens)
- **Invite token validation** — secure single-use or time-limited invite links

### Excluded
- User profile setup screens (name already captured during registration)
- Multi-gym membership for athletes (athletes belong to one gym at a time)
- Bulk invite import (CSV, etc.)
- Invite templates or customization
- Social invites (SMS, QR codes, etc.)
- Invite analytics or tracking

---

## Data Model Changes

### New/Modified Entities

**Invite** (new table)
- id: UUID
- gymId: UUID (FK → Gym)
- createdByUserId: UUID (FK → User, the coach/owner)
- inviteeEmail: string (email of invited athlete)
- inviteToken: string (unique, for single-use link)
- acceptedAt: timestamp | null
- acceptedByUserId: UUID | null (FK → User, the athlete who accepted)
- expiresAt: timestamp (7 days from creation)
- status: enum (pending, accepted, expired, revoked)
- createdAt: timestamp
- deletedAt: timestamp | null

---

## Tasks

### Task #1: Backend — Invite Generation & Validation ✅ COMPLETE (2026-05-03)
**Agent:** backend-developer | **Type:** FEATURE

Implement invite infrastructure:
- `POST /api/gyms/:gymId/invites` — create invite link (owner/coach only)
  - Request: inviteeEmail
  - Response: { inviteToken, inviteLink, expiresAt }
- `GET /api/invites/:inviteToken` — validate invite link (public)
  - Response: { gymId, gymName, inviteeEmail, expiresAt, status }
- `POST /api/invites/:inviteToken/accept` — accept invite and create membership (athlete only)
  - Request: { password? } (if athlete is new)
  - Response: { accessToken, user }
- Email delivery (AWS SES or similar) on invite creation
- Swagger docs for all new endpoints
- Invite token generation (secure random, URL-safe)
- Expiry validation (7 days)

### Task #2: Frontend — Design Invite Screens (UX) ✅ COMPLETE (2026-05-03)
**Agent:** ux-designer | **Type:** DESIGN

Create Pencil designs for invite-related screens:
- **Athlete screens** (in `designs/athlete-screens.pen`):
  - Invite Acceptance screen: gym name, gym info, "Join Gym" button, "Decline" button
- **Owner/Coach screens** (in `designs/gym-owner-screens.pen`):
  - Invite Manager screen: list of invites (pending/accepted/expired), create invite modal, resend/revoke actions
- Use existing design system tokens and style reference from athlete/owner screens
- Export frames to `.pen` file

### Task #3: Frontend — Invite Link Handler
**Agent:** frontend-developer | **Type:** FEATURE

Implement invite link parsing and acceptance:
- New route: `/invite/:inviteToken` (public, no auth required)
- Design reference: `designs/athlete-screens.pen` — frame: "Invite Acceptance"
- Screen displays: gym name, gym info, invite status
- "Join Gym" button flow:
  - If athlete already registered: accept invite → create membership → navigate to schedule
  - If new email: redirect to registration flow with email pre-filled → accept invite → navigate to schedule
- "Decline" button returns to login
- Handle expired/invalid invites with error message
- All functional behavior tested end-to-end

### Task #4: Frontend — Invite List & Management (Gym Owner/Coach)
**Agent:** frontend-developer | **Type:** FEATURE

Implement invite management screens:
- New route: `/(tabs)/invites` (owner/coach only, visible in bottom tab bar)
- Design reference: `designs/gym-owner-screens.pen` — frame: "Invite Manager"
- Screen displays:
  - Pending invites: email, created date, resend button, revoke button
  - Accepted invites (faded): email, joined date, revoke button
  - Expired invites (greyed out): email, expiry date
- "Create Invite" button: input email → generates invite → shows "Copy Link" button
- Resend invite: re-sends email with same link
- Revoke invite: marks as revoked, link no longer works
- Copy invite link to clipboard
- All actions tested end-to-end

### Task #5: Registration Flow Update
**Agent:** frontend-developer | **Type:** FEATURE

Update registration screen to support invite pre-fill:
- If navigating from invite link, email field is pre-filled and read-only
- After registration, automatically redirect to invite acceptance flow
- Maintain existing register-then-gym-selector flow for non-invite signups

---

## Dependencies

```
Task #1 (Backend — Invites) ─┐
                              ├─→ Task #2 (UX — Design Screens)
                              │
Task #2 (UX — Design) ───────┤
                              ├─→ Task #3 (Frontend — Invite Handler)
                              │   Task #4 (Frontend — Invite Manager)
                              │   Task #5 (Frontend — Reg Update)
                              │
Task #3, #4, #5 (Frontend) ──┴─→ All complete
```

### Task Sequencing
1. **Phase 1** (Backend): Task #1 (invite generation & validation)
2. **Phase 2** (UX): Task #2 (design screens)
3. **Phase 3** (Frontend): Tasks #3, #4, #5 in parallel once designs ready

---

## Acceptance Criteria

- [ ] `POST /api/gyms/:gymId/invites` creates invite with token, sends email
- [ ] `GET /api/invites/:inviteToken` validates and returns invite details
- [ ] `POST /api/invites/:inviteToken/accept` creates membership and returns JWT
- [ ] Invite tokens expire after 7 days
- [ ] Invite acceptance screens designed in Pencil (athlete + owner/coach roles)
- [ ] Frontend `/invite/:inviteToken` route accepts invites and handles new/existing athletes
- [ ] Invite acceptance screen shows gym info with Join/Decline buttons
- [ ] Invite manager shows pending/accepted/expired invites with create/resend/revoke actions
- [ ] Registration flow pre-fills email from invite link
- [ ] Email delivery works (dev: console log, prod: AWS SES or similar)
- [ ] All new endpoints have Swagger docs with examples
- [ ] TypeScript strict mode passes on all frontend changes
- [ ] Invite acceptance flow tested end-to-end (new athlete, existing athlete)

---

## References

- **Backend entities:** `backend/src/database/entities/invite.entity.ts` (new)
- **Backend services:** `backend/src/api/invite/` (new module)
- **Frontend routes:** `/invite/:inviteToken`, `/(tabs)/invites`, `/profile-setup`
- **Previous epic:** `epics/ATHLETE_SCREENS_EPIC.md`

