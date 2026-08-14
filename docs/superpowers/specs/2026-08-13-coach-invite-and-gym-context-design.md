# Coach Invites With Acceptance & Switchable Gym Context

**Date:** 2026-08-13
**Status:** Approved design, pending implementation plan
**Closes:** gaps 1 and 2 recorded in `epics/E2E_JOURNEYS.md` § *Findings from Tier 2*
(gap 3 closed on 2026-08-13 by `25cf081` + `e2cf2db`)

---

## Problem

### 1. An invited coach who has no account can never log in

`backend/src/commands/gym-configuration/handlers/invite-coach.handler.ts:70-87` creates a
`UserEntity` with `name: 'Coach'`, `status: 'pending'` and a `passwordHash` of
`crypto.randomBytes(32)`. Nobody ever holds that password, and the codebase has no
set-password, reset-password or complete-profile path. The owner sees the coach appear in
the staff list; the coach cannot get in. A dead user row.

### 2. There is no coach-role invite

The same handler writes an **active `gym_staff` row immediately** (`:100-110`) — no token,
no acceptance, and email delivery is still a `TODO` at `:112`. So an owner unilaterally
makes any registered user staff at their gym.

Meanwhile a complete token-based invite subsystem already exists — `invites` table,
7-day expiry, validate/accept/list/revoke, a public acceptance screen — but
`InviteService.acceptInvite` only ever creates a `GymMembershipEntity`
(`backend/src/api/invite/invite.service.ts:182-196`), i.e. an athlete. The two flows
share nothing.

E2E journey 11 is split into two tests because of this, and can only invite a
**pre-registered** account.

### 3. Multi-gym staffing is documented, stored, and unreachable

`docs/DATA_MODEL.md:105` — "Coaches can be assigned to multiple gyms independently";
`:99` — "one user can be staff at many gyms". `docs/DECISIONS.md:180` reserves multi-gym
staffing to coaches explicitly. `gym_staff` is one row per (user, gym) and nothing stops
two.

But the auth carrier is single-gym:

1. `AuthService.resolveGymContext` (`backend/src/domain/auth/auth.service.ts:113`) uses
   `findOne` ordered oldest-`assignedAt`-first and bakes **one** `gymId` into the JWT.
2. `GymOwnershipGuard` (`backend/src/auth/guards/gym-ownership.guard.ts:31`) compares the
   `:gymId` route param against that single claim and throws `403 Gym ID mismatch`
   otherwise.

So a coach staffing gyms A (older) and B gets `403` on every gym-B request, in every
session — the ordering is deliberately stable (`DECISIONS.md:189`). This is the failure
mode `DECISIONS.md` describes for owners ("a second gym is unreachable rather than merely
additional"), except for coaches nothing blocks it at the door.

The frontend has half a switcher already: `frontend/context/GymContext.tsx` holds a
persisted, settable `currentGymId` that ~10 screens read — but the backend authorizes
against the token, not against `GymContext`, so pointing it at gym B yields 403s rather
than a switch. `MVP_SCREENS.md:49` lists a gym switcher; `COMMAND_MODEL.md:194` specifies
a `SelectActiveGym` command. Neither is implemented anywhere in `backend/src`.

A working coach invite turns issue 3 from unreachable into a one-click path an owner will
find immediately, which is why it is in scope here rather than deferred.

---

## Scope

**In scope**

- Coach invites become real invites with an acceptance step: token, pending state,
  invitee-driven acceptance, revocation.
- Coach invites work for an invitee with **no account**, by reusing the existing
  register-then-accept path.
- Acceptance re-signs the JWT, so a newly accepted coach has usable gym context without
  logging out.
- Owner sees pending coach invites and can copy the link again or revoke it.
- Gym context becomes switchable for any user with more than one gym (coach or athlete).

**Out of scope**

- **Email delivery.** No provider is wired anywhere (`invite.service.ts:259-276` logs in
  dev and warns in production). The owner copies the link. Tracked in a new
  `epics/EMAIL_SERVICE_EPIC.md`; the copy-the-link UI is explicitly interim.
- **Multi-gym ownership.** `DECISIONS.md` → *One Gym Per Owner* stands untouched: nobody
  gains a second **owned** gym here. (An owner who also coaches elsewhere does get the
  switcher — that is coach staffing, which `DECISIONS.md:186` explicitly permits.)
- Coach permissions themselves, staff roles beyond `owner`/`coach`, athlete-facing
  attendance visibility, and the generic-403-message problem in `api-client` (all
  separate follow-ups already recorded).

---

## Approach

Extend the existing invite subsystem with a role, rather than building a parallel
coach-invite subsystem. One migration and one column buy the token, the expiry, the
public acceptance screen, the register-then-accept bounce, and list/revoke for free.

The rejected alternative was a separate `coach_invites` table with its own endpoints and
its own acceptance screen: it duplicates token generation, expiry resolution and
validate/list/revoke, and has no compensating benefit.

---

## Phase 1 — Coach invites with acceptance

### 1.1 Data model

One migration, following the existing timestamp-prefix convention in
`backend/src/migrations/`:

```sql
ALTER TABLE invites ADD COLUMN role varchar NOT NULL DEFAULT 'athlete';
```

`InviteEntity` (`backend/src/domain/invite/entities/invite.entity.ts`) gains
`role: InviteRole` where `InviteRole = 'athlete' | 'coach'`. Every existing row is an
athlete invite by construction, so the default is a correct backfill.

`gym_staff` and `gym_membership` are unchanged. Nothing writes `user.status = 'pending'`
any more; leave the union in `user.entity.ts:32` alone and simply stop producing it. Dead
`pending` rows already in the dev database are cleanup, not scope.

### 1.2 Move `InviteService` into the domain layer

`InviteService` currently lives at `backend/src/api/invite/invite.service.ts`. Two
consumers now need it, and importing an api-layer service into a command handler is the
wrong direction. Move it to `backend/src/domain/invite/invite.service.ts` (a mechanical
move — imports and module registration only). `InviteController` stays in `api/invite/`.
`invite.errors.ts` moves with the service.

### 1.3 Create

`createInvite(gymId, createdByUserId, inviteeEmail, role = 'athlete')`.

When `role === 'coach'`, two additional preconditions:

- **Already staff.** If a user with that email exists and has a `gym_staff` row at this
  gym in **any** status → `409`. (Any status, not just active: a deactivated coach is
  reactivated through the existing status endpoint, not re-invited.)
- **Already invited.** A `pending`, unexpired coach invite for the same (gym, email) →
  `409`. The owner revokes it or copies the existing link from the list.

If no user exists for that email, the staff check is skipped — that is the normal
brand-new-coach case.

Athlete invites keep their current behaviour exactly.

### 1.4 `InviteCoachHandler` becomes an orchestrator

`invite-coach.handler.ts` keeps its two security preconditions — owner check via
`GymStaffService.isGymOwner`, and gym exists + `status === 'active'` — both inside the
transaction, for the TOCTOU reason its own comment gives at `:40-45`. It then delegates to
`InviteService.createInvite(..., 'coach')`.

Deleted: the user-creation block (`:70-87`) and the `gym_staff` write (`:100-110`).

`InviteCoachResponseDto` changes from a gym-staff shape to the invite shape:
`inviteToken`, `inviteLink`, `expiresAt`, `inviteeEmail`, `role`. This is a breaking
response change; nothing outside `frontend/app/coaches.tsx` consumes it. `@Api*` and
`@ApiProperty` decorators updated per the Swagger-is-authoritative rule, then
`npm run generate:api-types` on the frontend.

The route keeps its path and authz: `POST /api/gyms/:gymId/configuration/coaches`,
`@Role('owner')`.

### 1.5 Accept

`acceptInvite` branches on `invite.role` inside the existing transaction
(`invite.service.ts:182`):

- `athlete` → `GymMembershipEntity` as today; the already-a-member check
  (`:171-177`) still applies.
- `coach` → `GymStaffEntity` with `role: 'coach'`, `status: 'active'`,
  `assignedAt: new Date()`; guarded by the already-staff check instead.

Both branches flip the invite to `accepted` in the same transaction, unchanged.

After the transaction commits, both branches call
`AuthService.issueTokenForUser(user.id)` (`domain/auth/auth.service.ts:90` — it exists
already and is what `CreateGymHandler` uses). `AcceptInviteResponseDto` gains
`token: string` and `role`.

This also fixes a latent athlete bug: acceptance currently does not re-sign, so an athlete
who registers via an invite carries `gymId: null, role: null` until they log in again.

If `InviteModule` importing `AuthModule` creates a cycle, inject `AuthService` directly
from its providing module rather than restructuring either module.

### 1.6 Read and revoke

- `validateInvite` returns `role`, so the acceptance screen can render coach copy.
  `ValidateInviteResponseDto` gains `role`.
- `listInvites(gymId, role?)` takes an optional `?role=` query filter;
  `InviteListItemDto` gains `role`. It already returns `inviteToken`, which the
  copy-link action needs.
- `revokeInvite` needs no change; it is role-agnostic.
- Authz: `POST /api/gyms/:gymId/invites` stays owner-or-coach and always mints
  **athlete** invites. A coach cannot create a coach. Only the owner-only
  `/configuration/coaches` route mints coach invites.

### 1.7 Frontend

**`frontend/app/invite/[inviteToken].tsx`** becomes role-aware:

- Coach copy in `HeroSection` ("You've been invited to coach at X"), a Role row in
  `GymCard`, CTA label "Accept & Join as Coach".
- The unauthenticated path needs **no change** — `:119-128` already pushes to `/register`
  with `inviteToken` and `email`, and `register.tsx:59` bounces back to
  `/invite/<token>` to accept. This is what makes an account-less coach invite work.
- On success it stores the returned token via `auth.login(token)` (which is the
  set-token entry point, `context/AuthContext.tsx:76`) and then routes by the returned
  role. `routeForRole` currently lives privately in `app/login.tsx:185`; extract it to a
  shared util and reuse it, rather than duplicating the role→route map.

**`frontend/app/coaches.tsx`** additionally fetches
`GET /api/gyms/:gymId/invites?role=coach` and renders pending invites as rows with a
Pending chip, a copy-link action and a revoke action. Per `DESIGN.md`: the single crimson
accent stays on the `Invite Coach` CTA (the file's own comment at `:60` already states
this), per-row actions are `quiet`, and revoke uses `Status.danger`, never the accent.
The invite modal shows the resulting link with a copy button, since no email is sent.

### 1.8 Docs

- `docs/DECISIONS.md`: new Tier 1 entry **Coach Invites Require Acceptance** — an owner
  cannot make someone staff unilaterally; the invitee accepts; acceptance re-signs the
  token.
- `docs/DECISIONS.md` → *Owner Gym Context After Creation* is **amended**: it names
  "accepting a coach invite" as the change that would force a revisit, and that revisit
  is happening here.
- `epics/EMAIL_SERVICE_EPIC.md`: new, capturing owner-copies-the-link as interim and
  listing the two existing send-sites (`invite.service.ts:259`, the deleted
  `invite-coach.handler.ts:112` TODO).
- `epics/E2E_JOURNEYS.md` and `context/PROJECT_STATE.md`: mark gaps 1 and 2 closed.

---

## Phase 2 — Switchable gym context

Role-agnostic: it fixes multi-gym athletes as well as coaches, and is the missing half of
`COMMAND_MODEL.md:194` *SelectActiveGym*.

### 2.1 Backend

- **`GET /api/me/gyms`** → `{ gyms: [{ gymId, gymName, role }] }`, from the caller's active
  `gym_staff` rows plus active `gym_membership` rows. When both exist for the same gym,
  staff wins — matching `resolveGymContext`'s existing precedence, which is also what
  keeps "owners are coaches" behaving. This is what the switcher renders. It goes on the
  existing `@Controller('/api/me')` in `api/user/user.controller.ts` rather than a new
  path, alongside the other user-scoped reads.
- **`POST /api/auth/gym-context`** with `{ gymId }` → verifies the caller has an active
  staff row or active membership at that gym, then returns a token re-signed for it.
  Anything else → `403`.
- Implementation: generalise `resolveGymContext` into
  `resolveGymContextFor(userId, gymId)`; `issueTokenForUser` becomes the
  no-gym-specified case. The oldest-first ordering stays as the default so login
  behaviour does not change.

### 2.2 The `DECISIONS.md` amendment this requires

*Owner Gym Context After Creation* states there is "deliberately no general
`/api/auth/refresh`". `POST /api/auth/gym-context` is not a general refresh — it re-signs
only for an explicitly named gym the caller is provably attached to — but it is close
enough that leaving the old wording standing would mislead. Amend that entry and add
**Gym Context Is Switchable**.

### 2.3 Deliberate deviation from `COMMAND_MODEL.md`

`COMMAND_MODEL.md:203` lists "User has active AthleteMembershipPlan for that gym" as a
precondition for switching. **Dropped.** It turns "joined but hasn't bought a plan yet"
into "cannot even see the gym you just joined", and the schedule already refuses
unentitled athletes downstream (`class-schedule.service.ts`, `book-class.handler.ts`).
Recorded in the *Gym Context Is Switchable* entry.

### 2.4 Frontend

- `context/GymContext.tsx` gains a switch action: call the endpoint → store the new token
  via `auth.login(newToken)` → `setCurrentGymId` → refetch. Today `setCurrentGymId` only
  writes local storage (`:32-35`), which is precisely why switching does not work.
- A switcher control renders **only** when `me/gyms` returns more than one entry, so it
  stays invisible for the single-gym majority. Placement: the athlete schedule
  header per `MVP_SCREENS.md:49`, and the coach classes header for symmetry.
- Built from existing `components/cleanink/` primitives (`SelectField` or
  `SegmentedToggle` depending on count) — no new primitive.

---

## Testing

**Backend**

- `invite-coach.handler.spec.ts` rewritten: creates a pending coach invite; no user row
  and no `gym_staff` row are written; non-owner → 403; inactive gym → 400; already-staff
  → 409; duplicate pending invite → 409.
- Invite service specs extended: coach acceptance creates `gym_staff` (not
  `gym_membership`); athlete acceptance unchanged; both return a re-signed token whose
  claims carry the new gym and role; expired/revoked/already-accepted paths still apply to
  coach invites.
- Phase 2: `resolveGymContextFor` — staff-beats-membership, unattached gym → 403,
  inactive staff row → 403; `me/gyms` returns both attachment kinds and is gym-scoped.

**Frontend**

- Role-aware acceptance screen: coach copy, coach CTA, unauthenticated → register push
  carries the token, success stores the token and routes to `/coach-classes`.
- `coaches.tsx`: pending rows render with copy and revoke; revoke removes the row; the
  crimson-accent count per view stays at one.
- Desktop register pinned in every new suite (jsdom defaults to 750px → mobile; unpinned
  suites test mobile only).

**E2E**

- Journey 11 collapses from two tests to **one**: owner invites a brand-new email → owner
  copies the link → invitee registers through the link → accepts → lands on the coach home
  → appears as an active coach on the owner's Coaches screen.
- Phase 2 journey: a coach staffed at two gyms switches context and can read gym B's
  classes — the assertion that would have failed with `403 Gym ID mismatch` before.
- Both mutation-proved: reintroduce the defect, confirm red, revert. A mutation that
  changes no observable behaviour is discarded, not counted.

**Verification bar:** `tsc` clean both sides, backend and frontend jest green, e2e green,
Swagger accurate at `/api-docs`, frontend types regenerated, and a live screenshot review
at 1280×832 and 390×844.

Pre-existing on HEAD and out of scope: `frontend/__tests__/useRefreshOnAppActive.test.tsx:76`
fails `tsc`.

---

## Sequencing

1. **Phase 1 — coach invite.** Includes the token re-signing on accept, which is also
   groundwork for phase 2.
2. **Phase 2 — gym context switching.** Immediately after, same epic.

Phase 1 alone makes a real dead end reachable (invite a coach who already staffs another
gym → silent `403`), so the work is not done at phase 1. They ship together.

---

## Risks

- **Breaking response shape** on `POST /gyms/:gymId/configuration/coaches`. Mitigated by
  regenerating frontend types in the same change; nothing else consumes it.
- **Module cycle** between `InviteModule` and `AuthModule` when acceptance re-signs.
  Resolve by provider injection, not module restructuring.
- **A coach's default gym is still the oldest one** after phase 2 — switching is explicit
  and per-session, not remembered server-side. Acceptable: `currentGymId` already
  persists client-side, so the last choice survives a reload.
