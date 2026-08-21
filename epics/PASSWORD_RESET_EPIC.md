# EPIC: Password Reset

**Status:** ✅ COMPLETE — 2026-08-22
**Owner:** Backend + frontend
**Depends on:** `epics/EMAIL_SERVICE_EPIC.md` — ✅ Complete (this epic consumes its mail seam)
**Design:** `docs/superpowers/specs/2026-08-21-password-reset-design.md` — approved 2026-08-21

**Goal:** a user who has forgotten their password can get back into their account without anyone
else's help.

Today a forgotten password is unrecoverable. There is no self-service reset, no owner-triggered
reset, and no admin path — the account is simply lost. This is the last hole in the sign-in story
that `epics/AUTH_JWT_EPIC.md` and `epics/AUTH_FLOWS_EPIC.md` left open, and it was left open for
one reason only: there was no way to email anyone. `epics/EMAIL_SERVICE_EPIC.md` removed that
constraint.

---

## Scope

### Included
- `POST /api/auth/forgot-password` — request a reset link, always 200
- `POST /api/auth/reset-password` — set a new password, returns a JWT
- `GET /api/auth/reset-password/:token/validate` — so the screen can fail early
- `password_reset_tokens` table + migration (hashed token, 1-hour single-use)
- A per-email throttle, answered by the token rows themselves
- `PasswordResetMailer` + one template, above the **unmodified** mail seam
- `frontend/app/forgot-password.tsx` and `frontend/app/reset-password/[token].tsx`
- A quiet **Forgot password?** link on `login.tsx`
- The navigation guard's public-route exemptions for both new routes

### Excluded
- Change password while signed in (knows their current password)
- Owner-triggered reset for a member
- Set-password for invited users whose `passwordHash` is `null`
- Session revocation on reset
- Global IP rate limiting
- Expired-row cleanup

---

## Decisions (settled in the design — do not re-litigate)

| Question | Decision |
|---|---|
| Token storage | Dedicated table storing `sha256(token)`, never the token |
| Token lifetime | 1 hour, single-use |
| Enumeration | `forgot-password` returns an identical empty 200 for known, unknown, throttled and failed-send |
| Abuse protection | Per-email throttle in the domain. **No new dependency**, no global throttler |
| Existing sessions | Left alone — a reset revokes nothing |
| After reset | Signed in immediately, like `register` and `login` |
| Failure reporting | None to the caller. Send failures are a server-side log line |

Two of these are worth recording in `context/DECISION_LOG.md` on completion: **reset tokens are
stored hashed** (a deliberate divergence from the plaintext `InviteEntity.inviteToken`, justified by
blast radius — a reset token grants the account), and **a reset does not revoke existing sessions**.

---

## Tasks

### Task #1: Backend INFRA — Token entity + migration ✅
**Type:** INFRA

`password_reset_tokens`: `id`, `userId` (indexed), `tokenHash` (unique index), `expiresAt`,
`usedAt` (nullable), `createdAt`. No status enum — `expiresAt` and `usedAt` answer everything
there is to ask.

### Task #2: Backend FEATURE — `PasswordResetService` ✅
**Type:** FEATURE

Lives in `backend/src/domain/auth/` alongside `AuthService`, which keeps password hashing in the
one place that already owns it. Owns minting, the per-email throttle, validation, and consuming a
token. A `MailDeliveryError` must never escape it — the same rule
`InviteService.announceInviteLink` follows.

Reissuing the JWT **must** go through `AuthService`'s existing token-issuing path so role and gym
claims resolve identically. Password rules must match `RegisterDto`'s exactly.

### Task #3: Backend FEATURE — The three endpoints ✅
**Type:** FEATURE

On the existing `AuthController`, all public, all fully Swagger-decorated. `forgot-password`
returns an identical empty 200 on every branch; `reset-password` collapses unknown, expired and
already-used into one indistinguishable 400.

### Task #4: Backend FEATURE — `PasswordResetMailer` + template ✅
**Type:** FEATURE

Next to `InviteMailer`. One template (no role split). Expiry formatted with `timeZone: 'UTC'`
pinned. The link comes from a single builder reading `FRONTEND_URL`, mirroring
`InviteService.buildInviteLink`. **The mail seam itself is not modified.**

### Task #5: Frontend FEATURE — Forgot-password screen ✅
**Type:** FEATURE

`frontend/app/forgot-password.tsx` via the `impeccable` skill. Email field, one accented CTA, then
a confirmation state whose wording is identical in every case. No success banner — DESIGN.md has no
success role.

### Task #6: Frontend FEATURE — Reset-password screen ✅
**Type:** FEATURE

`frontend/app/reset-password/[token].tsx`, following `app/invite/[inviteToken].tsx` as its
exemplar. Validate on mount, expired state routes back to forgot-password, success signs in and
routes by role.

### Task #7: Frontend FEATURE — Login link + navigation guard ✅
**Type:** FEATURE

The **Forgot password?** link on `login.tsx` is quiet, not accented — the sign-in CTA owns the one
accent on that view. Add `/forgot-password` and `/reset-password/*` to the guard's public-route
list in `_layout.tsx`. **Without this the flow is unreachable from a mail client**: the guard
bounces every non-exempt route to `/login` when signed out.

---

## Dependencies

```
Task #1 (entity + migration) ──┐
                               ├──> Task #2 (service) ──> Task #3 (endpoints) ──> Tasks #5, #6, #7
Task #4 (mailer + template) ───┘
```

Tasks #1 and #4 are independent. Frontend tasks need the endpoints for generated types.

---

## Acceptance Criteria

- [x] `POST /api/auth/forgot-password` returns a byte-identical empty 200 for a known address, an
      unknown address, a throttled request, and a failed send
- [x] A reset token is stored only as a hash — the plaintext exists once, in the email
- [x] A token expires after 1 hour and works exactly once
- [x] Unknown, expired and used tokens all produce the same 400
- [x] A second reset request for the same email inside the throttle window sends no mail
- [x] `POST /api/auth/reset-password` changes the password and returns a working JWT with correct
      role and gym claims
- [x] Password validation is identical to `POST /api/auth/register`'s
- [x] A reset link opened while signed out reaches the reset screen, not `/login`
- [x] The reset screen shows an expired state on mount, before asking for a password
- [x] A completed reset signs the user in and routes by role
- [x] A `MailDeliveryError` never escapes the endpoint
- [x] Swagger at `/api-docs` documents all three endpoints; frontend types are generated, not written
- [x] jest green in both projects, `tsc` clean, frontend suites pin the responsive register
- [x] Live walk-through against the log driver: request → read the link from the log → new password
      → signed in
- [x] Screenshot review at 1280×832 and 390×844

---

## Accepted Limits

Documented so they are not later mistaken for bugs. All four are deliberate.

1. **Sessions survive a reset.** Tokens issued before the reset stay valid until they expire.
   Revocation needs a `passwordChangedAt` claim plus a guard check, i.e. a DB read per request.
2. **The throttle is per-email.** Spraying many different addresses is not capped, and response
   timing may still differ between a known and an unknown address.
3. **A new environment delivers nothing.** `MAIL_DRIVER` defaults to the non-sending `log` driver;
   only `boxops-api-staging` has `MAIL_DRIVER=resend` and `RESEND_API_KEY`. The flow will return
   200 and mail nobody. Same trap as the email epic: a `sent` status is also what the log driver
   reports.
4. **Expired rows are never cleaned up.** A sweep needs the duplicate-cron problem solved —
   `@nestjs/schedule` double-fires across staging's two Fly machines.

---

## Verification Record — 2026-08-22

Live walk-through against the log driver on the dev database, signed out, at 1280×832 and 390×844.
`/login` → **Forgot password?** → confirmation → **the link opened while signed out reached the
form rather than bouncing to `/login`** (the guard exemption, the one thing that makes the flow
usable from a mail client) → new password → landed signed in on `/schedule-dashboard` → new
password 200, old password 401 → re-opening the same link showed *Reset link unavailable*. An
unknown address produced byte-identical copy and zero sends. Design read clean: one accent per
view, error text on `Status.danger` `#B3261E` and not the accent, no green success anywhere.

Suites at close: backend **60 suites / 582 tests**, backend e2e **16 suites / 246 tests**,
frontend **40 suites / 445 tests**, `tsc` clean in both projects.

### One real bug, found by the walk-through and fixed

**The 15-minute throttle never fired.** Two requests two minutes apart both sent mail. The table
had two clocks in it: `createdAt` came from the column's `DEFAULT now()` — the *database* clock, in
UTC — while `expiresAt` and the throttle's `MoreThan(cutoff)` come from the *app* clock, and a
naive `timestamp` column round-trips through whatever zone the process runs in. Under a non-UTC app
the two disagreed by the offset and the window never matched a row. It happened to work on staging
(UTC) and was broken in dev, latent for any non-UTC deploy.

Fixed by stamping `createdAt` from the app clock in `requestReset`, which is what every other write
path in this codebase already does. The unit spec could not have caught it — it stubs `count` → 1,
proving the branch and never the query — so the guard is `backend/test/password-reset.e2e-spec.ts`,
where the zone is pinned to `America/New_York`. Reverting the one-line fix makes that spec fail with
a measured drift of exactly 14,400,023 ms.

Two smaller hardening changes went in at the same time: `resetPassword`'s two writes (the new hash,
then `usedAt`) now share one `dataSource.transaction`, because a failure between them left an
account on a new password with its single-use link still replayable; and `backend/.mail-preview/`
is now gitignored, since a rendered preview carries a working reset link in its markup.

### Where the plan was wrong — for whoever writes the next one

1. **The log driver does not print the mail body**, so "copy the link out of the log" is impossible
   as written. Set `MAIL_PREVIEW_DIR` and read the rendered file instead.
2. **`migration:run` cannot be run against `crossfit_box_dev`** — that database is
   `synchronize`-built and its `migrations` table is empty. `npm run schema:check` is the real gate.
3. **`synchronize: true` front-runs `migration:generate`**: the dev server has already applied the
   entity change, so the generator sees no diff. Stop the server and drop the table first.

---

## References

- **Design:** `docs/superpowers/specs/2026-08-21-password-reset-design.md`
- **Mail seam:** `backend/src/infrastructure/mail/` — `epics/EMAIL_SERVICE_EPIC.md`
- **Token-in-URL precedent:** `backend/src/domain/invite/`, `frontend/app/invite/[inviteToken].tsx`
- **Auth:** `backend/src/domain/auth/auth.service.ts`, `epics/AUTH_FLOWS_EPIC.md`
- **Design rules:** `frontend/DESIGN.md` + the `impeccable` skill
