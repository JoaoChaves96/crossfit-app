# Password Reset — Design

**Date:** 2026-08-21
**Epic:** `epics/PASSWORD_RESET_EPIC.md`
**Status:** approved, ready for an implementation plan

**Goal:** a user who has forgotten their password can get back into their account without anyone
else's help.

---

## 1. Why now

Password reset has been excluded from every auth epic so far for one reason: there was no way to
email anyone. `epics/AUTH_FLOWS_EPIC.md` listed it under **Excluded**, and
`epics/EMAIL_SERVICE_EPIC.md` §2 closed with *"Password reset still does not exist, but it is no
longer blocked: it now has a mail seam to build on."* This design consumes that seam.

Until this ships, a forgotten password is unrecoverable for the user and unfixable by the gym
owner — there is no support path, no admin reset, nothing. It is the last hole in the sign-in
story.

---

## 2. Decisions this design settles

| Question | Decision |
|---|---|
| Scope | **Self-service forgot-password only.** No change-password-while-signed-in, no owner-triggered reset, no set-password for invited users |
| Token storage | **A dedicated `password_reset_tokens` table**, storing a SHA-256 hash of the token, never the token |
| Token lifetime | **1 hour**, single-use |
| Account enumeration | **`POST /api/auth/forgot-password` always returns 200 with an empty body** — same response for a known address, an unknown address, a throttled request, and a failed send |
| Abuse protection | **A per-email throttle in the domain**, answered by the reset-token rows themselves. No new dependency, no global IP throttler |
| Existing sessions | **Left alone.** A reset does not revoke tokens already issued |
| After a successful reset | **Signed in immediately** — the endpoint returns an `accessToken`, like `register` and `login` |

### Why a table and not a stateless signed token

A self-invalidating JWT is the tempting alternative: sign `{ purpose: 'password-reset', sub }`
plus a fingerprint of the user's current `passwordHash`, and changing the password kills the token
for free — no migration, no rows, no cleanup.

It loses on two counts. It cannot record that a request *happened*, so the per-email throttle would
need its own persistent store anyway, which is the migration we were avoiding. And the
self-invalidation trick has no fingerprint to bind to when `passwordHash` is `null`, which is a
real state in this system — `UserEntity.passwordHash` is nullable and invited users reach it. The
migration costs less than the exceptions.

### Why the token is hashed when invite tokens are not

`InviteEntity.inviteToken` is stored in plaintext, and this design deliberately does not follow
that precedent. The blast radius is different: an invite token grants membership of one gym, which
an owner can revoke, while a reset token grants **the account**. Storing only
`sha256(token)` means a leaked database dump cannot be replayed into anyone's account. The
plaintext token exists exactly once, in the email.

This is not a criticism of the invite table and does not imply a change to it — that would be
scope creep. It is a justified divergence, recorded here so the difference reads as intentional.

### Why a per-email throttle and not `@nestjs/throttler`

The abuse that costs real money and real annoyance is *mail volume aimed at one person*: an
attacker who knows an address and hammers the endpoint fills that inbox and burns Resend quota. A
per-email cap stops precisely that, needs no dependency, and needs no shared store — the check is
a query against rows we are already writing.

A global IP throttler is the more general tool, but it needs a store decision that in-memory
cannot satisfy: staging runs **two Fly machines**, so an in-memory counter caps at 2× the intended
rate and resets on every deploy. That is a real piece of infrastructure work, and it belongs to
whichever epic decides the backend needs rate limiting generally — not to this one. Filed as a
follow-up.

### Why sessions survive a reset

Revoking issued JWTs needs machinery this system does not have: no refresh tokens, no `jti`, no
session store. The cheapest real implementation is a `passwordChangedAt` column stamped on reset,
carried in the claims, and compared in `JwtAuthGuard` — which puts a database read on **every
authenticated request** unless it is cached.

That cost buys protection against a threat this flow is not answering. This is the *"I forgot my
password"* path, not the *"I have been compromised, lock everyone out"* path. The exposure is
bounded by the access token's remaining lifetime and is written into the epic as an accepted
limit, not left implicit.

---

## 3. Backend design

Three endpoints, all on the existing `AuthController` at `backend/src/api/auth/`, all public (no
`JwtAuthGuard`), all fully decorated for Swagger.

### `POST /api/auth/forgot-password`

Request: `{ "email": "..." }` → **200, empty body. Always.**

```
look up the user by email
  ├─ no user            → return (silently)
  ├─ recent token exists → return (silently, throttled)
  └─ user exists
       ├─ mint a random token, persist sha256(token) with expiresAt = now + 1h
       ├─ send the mail; on failure log it and swallow
       └─ return
```

Every branch is indistinguishable from the outside. There is deliberately **no `delivery` field**
on the response, unlike the invite endpoints: an invite's caller is a gym owner who can fall back
to copying the link, whereas here the caller is an anonymous stranger who can do nothing with
`failed` except learn that the address exists. Send failures are a server-side log line only.

A `MailDeliveryError` must never escape this endpoint. The pattern is already established —
`InviteService.announceInviteLink` must never throw for the same reason — but here the status is
swallowed rather than returned.

### `POST /api/auth/reset-password`

Request: `{ "token": "...", "password": "..." }` → `{ "accessToken": "..." }`

```
hash the presented token, look the row up by hash
  ├─ not found / expired / usedAt set → 400, one indistinguishable message
  └─ valid
       ├─ hash the new password (same bcrypt path AuthService already owns)
       ├─ stamp usedAt on the row
       └─ issue a token through the SAME code path login uses
```

The three failure causes collapse into one 400 on purpose: distinguishing "expired" from "unknown"
tells an attacker which tokens have existed.

Reissuing the JWT **must** reuse `AuthService`'s existing token-issuing path so role and gym
context are resolved identically. Hand-signing a token here is how you mint one with wrong or
missing claims.

Password validation rules must be **identical to `RegisterDto`'s**. If reset is more permissive,
an account can be reset into a password it could never have registered with; if it is stricter, a
legitimately-registered user can hit an unreachable state.

### `GET /api/auth/reset-password/:token/validate`

Response: `{ "valid": boolean }`

Exists so the screen can show "this link has expired, request a new one" on mount instead of after
the user has typed a password twice. Mirrors the invite screen's existing validate call, which is
the shipped precedent for a token-in-URL screen.

### Files

New:
- `backend/src/domain/auth/entities/password-reset-token.entity.ts`
- `backend/src/domain/auth/password-reset.service.ts` (+ spec)
- `backend/src/api/auth/dto/forgot-password.dto.ts`
- `backend/src/api/auth/dto/reset-password.dto.ts`
- `backend/src/api/auth/dto/validate-reset-token-response.dto.ts`
- `backend/src/infrastructure/mail/password-reset-mailer.ts`
- `backend/src/infrastructure/mail/templates/password-reset-email.ts`
- one TypeORM migration for `password_reset_tokens`

Changed:
- `backend/src/api/auth/auth.controller.ts` — the three endpoints
- `backend/src/api/auth/auth.module.ts` — import `MailModule`, provide the new service
- `backend/src/infrastructure/mail/mail.module.ts` — provide and export `PasswordResetMailer`

The mail seam itself — `MailDriver`, `mail-driver.factory.ts`, `log.driver.ts`,
`resend.driver.ts` — is **not modified**. A second mailer above an unchanged seam is what the seam
was built for.

### The table

`password_reset_tokens`: `id` (uuid pk), `userId` (uuid, indexed), `tokenHash` (varchar, unique
index), `expiresAt` (timestamp), `usedAt` (timestamp, nullable), `createdAt`.

No status enum. Unlike an invite, there is nothing to display and no lifecycle to report — the row
is either usable or it is not, which `expiresAt` and `usedAt` already answer.

**No cleanup cron.** Expired rows are inert. `epics/EMAIL_SERVICE_EPIC.md` §2 ruled out scheduled
work because `@nestjs/schedule` double-fires across staging's two Fly machines; that reasoning
applies unchanged. A sweep is additive and blocked by nothing.

### The email

`PasswordResetMailer` owns one template — there is no role split here, unlike invites. It states
who it is for, that the link expires in an hour, and that ignoring it leaves the password
unchanged. The expiry is formatted with `timeZone: 'UTC'` pinned; the invite template already
learned that an unpinned format renders the same instant as a different day depending on the
host's clock.

The link is composed by **one builder** reading `FRONTEND_URL`, mirroring
`InviteService.buildInviteLink`. The email epic's finding stands: a second link-composer drifts
from the first, which is why `inviteLinkFor()` was deleted from the frontend.

---

## 4. Frontend design

Built through the `impeccable` skill against `frontend/DESIGN.md`, tokens from
`constants/design.ts`, composed from `components/cleanink/` primitives. Types from
`npm run generate:api-types` once the Swagger decorators exist — never hand-written.

### `frontend/app/forgot-password.tsx`

Email field, one primary CTA (**Send reset link** — the single accent on the view), then swaps to
a confirmation state:

> If an account exists for that address, we've sent a reset link. It expires in an hour.

Identical in every case. The screen cannot leak what the endpoint refuses to. No green banner —
DESIGN.md has no success role.

### `frontend/app/reset-password/[token].tsx`

Exemplar: `frontend/app/invite/[inviteToken].tsx`, the shipped token-in-URL screen.

Validate on mount → invalid/expired shows a plain message and a route back to
`/forgot-password`; valid shows new-password + confirm fields, then on success signs in via the
auth context and routes by role exactly as `login.tsx` does.

### `frontend/app/login.tsx`

Gains a **Forgot password?** link, styled quiet — the sign-in CTA already owns the one accent on
that view, and a second accented control is a One Accent Rule violation.

### `frontend/app/_layout.tsx`

The navigation guard's public-route list must gain `/forgot-password` and `/reset-password/*`.
This is not optional polish: the guard bounces every non-exempt route to `/login` when signed out,
so without it a reset link opened from a mail client lands on the login screen and the flow is
unreachable. The file already carries a comment recording this exact bug class for the invite and
register routes.

---

## 5. Invariants

- **No tenancy surface.** `User` is the one entity not scoped to a gym, and a reset touches nothing
  else. The token carries no `gymId`; no query in this flow needs gym scoping because no gym-scoped
  row is read or written.
- **Role-based access is unaffected.** All three endpoints are public by design; the reissued token
  gets its claims from the same resolution `login` performs, so no role or gym is granted that the
  user did not already have.
- **Class lifecycle and the visibility rule** are untouched.

---

## 6. Accepted limits

Written here so they are not later mistaken for bugs:

1. **Sessions survive a reset.** Tokens issued before the reset remain valid until they expire.
2. **The throttle is per-email.** An attacker spraying many different addresses is not capped, and
   response timing may still differ measurably between a known and unknown address even though the
   response body does not.
3. **A new environment delivers nothing.** `MAIL_DRIVER` defaults to the non-sending `log` driver.
   Only `boxops-api-staging` has `MAIL_DRIVER=resend` and `RESEND_API_KEY`. This flow will appear
   to work — 200, no error — and mail nobody, on any environment lacking those secrets. This is the
   same trap the email epic documented: `delivery: 'sent'` is also what the log driver reports.
4. **No cleanup of expired rows.**

---

## 7. Verification

- **jest, backend** — `PasswordResetService`: unknown email is silent, the throttle suppresses a
  second request, an expired token 400s, a used token 400s, a valid reset changes the hash and
  returns a working token. Controller: `forgot-password` returns byte-identical 200s for a known and
  an unknown address.
- **jest, frontend** — both screens, **with the responsive register pinned in each suite**. jsdom
  defaults to 750px, so an unpinned suite silently tests mobile only.
- **`tsc`** clean in both projects; Swagger visibly correct at `http://localhost:3000/api-docs`.
- **Live, log driver** — request a reset, read the real link out of the log line, walk it to a
  changed password and a working sign-in.
- **Screenshot review** at desktop 1280×832 and mobile 390×844.

A live send through real Resend is worth doing on staging but is not a gate — the email epic
already proved that seam end to end, including its failure path.

---

## 8. Follow-ups, not built here

- Global IP rate limiting with a store that survives two Fly machines.
- Expired-token cleanup (needs the machine-leadership problem solved first).
- Change-password while signed in; owner-triggered reset; set-password for invited users with a
  null `passwordHash`.
- Session revocation on reset (`passwordChangedAt` in the claims + guard check).

---

## 9. References

- **Mail seam:** `backend/src/infrastructure/mail/` — `epics/EMAIL_SERVICE_EPIC.md`
- **Token-in-URL precedent:** `backend/src/domain/invite/`, `frontend/app/invite/[inviteToken].tsx`
- **Auth:** `backend/src/domain/auth/auth.service.ts`, `epics/AUTH_FLOWS_EPIC.md`,
  `epics/AUTH_JWT_EPIC.md`
- **Design rules:** `frontend/DESIGN.md` + the `impeccable` skill
