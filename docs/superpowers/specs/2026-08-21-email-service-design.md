# Email Service — Design

**Date:** 2026-08-21
**Epic:** `epics/EMAIL_SERVICE_EPIC.md`
**Status:** approved, ready for an implementation plan

**Goal:** an invite reaches its recipient without the gym owner acting as the mail carrier.

---

## 1. Decisions this design settles

The epic's §4 left the provider and its configuration, the templates, the link, and the failure
story open. All are now closed.

| Question | Decision |
|---|---|
| Provider | **Resend** (already recorded in `context/PROJECT_STATE.md:256`) |
| Target environment | **Staging.** It is the only deployed environment; production config is a later repeat of the same setup |
| Failure handling | **Synchronous, reported in the create response.** No retries, no send log, no new column |
| Template form | **Minimal branded HTML with a real plain-text alternative.** Hand-written, no MJML, no React Email |
| Sender identity | **`BoxOps <invites@mail.boxops.dev>`**, a verified subdomain, with `Reply-To` set to the inviting owner's email |
| Local development | **A `log` driver** that keeps today's console line and optionally writes the rendered HTML to disk |

Two of these belong in `context/DECISION_LOG.md` on completion, where neither is recorded today:
Resend as the provider, and synchronous-status-without-a-send-log as the failure story.

### Why no retries or send log

At this volume the realistic failure modes are permanent, not transient: an unverified domain, a
bad API key, or a typo'd recipient. A retry sweep re-attempts things that fail identically.
Invites are always owner-initiated one at a time, so a human is on screen when delivery is
attempted — the request/response cycle is a better failure channel than a background log. The
fallback the log would lead to (copy the link) is already one click away and stays. And a
scheduled sweep would inherit staging's duplicate-cron problem: `@nestjs/schedule` fires twice
because two Fly machines run (`context/PROJECT_STATE.md:107`), so retries would mean either
solving machine leadership or accepting duplicate emails.

Both are additive later. Nothing in this design blocks them.

### Rejected: event-driven send

`InviteService` emits `invite.created`, a listener delivers. `@nestjs/event-emitter` is already a
dependency and the decoupling is cleaner — but it cannot report delivery status in the create
response, which is the chosen failure story. Incompatible, not merely heavier.

---

## 2. Prerequisites

The hard prerequisite named in the epic's §3 — a domain you control — **is already satisfied**:
`boxops.dev` is owned and its DNS is on Cloudflare.

Human steps, which cannot be automated from this repo:

1. Sign up for Resend and add `mail.boxops.dev` as a sending domain.
2. Add the SPF and DKIM records Resend issues to Cloudflare DNS, plus a DMARC record on
   `_dmarc.boxops.dev`.
3. Set `RESEND_API_KEY` as a Fly secret on `boxops-api-staging`.

`FRONTEND_URL` was checked and is already set correctly on staging — its secret digest is
byte-identical to `CORS_ORIGINS`, which is exactly `https://app.boxops.dev`. No work needed.

---

## 3. Architecture

A `MailDriver` interface with two implementations selected by configuration, and one
invite-aware composer above it. `InviteService` depends only on the composer.

```
InviteService
  └── InviteMailer          composes a MailMessage from an invite; owns the templates
        └── MailDriver      interface: send(message) — throws on failure
              ├── ResendDriver   one fetch POST to api.resend.com
              └── LogDriver      console line + optional HTML file on disk
```

The second driver is not speculative abstraction: a non-sending local path is a requirement, and
having it as a separate object is what makes the failure path testable with a driver that throws
rather than a mocked `fetch`.

### New files, all under `backend/src/infrastructure/mail/`

| File | Responsibility |
|---|---|
| `mail.types.ts` | `MailMessage` (`to`, `subject`, `html`, `text`, `replyTo`), the `MailDriver` interface, `MailDeliveryError` |
| `resend.driver.ts` | One `POST https://api.resend.com/emails` via global `fetch`. Non-2xx or network error throws `MailDeliveryError` carrying the status and the provider's message body |
| `log.driver.ts` | Logs recipient, subject and link. When `MAIL_PREVIEW_DIR` is set, writes `message.html` there and logs the absolute path. Never throws |
| `mail.module.ts` | Provides `MailDriver` from a factory on `MAIL_DRIVER`. Unknown value throws at boot |
| `invite-mailer.ts` | `sendInviteEmail(...)`: renders the role-appropriate template, delegates to the driver |
| `templates/invite-email.ts` | `renderInviteEmail({ role, gymName, inviterName, inviteLink, expiresAt })` → `{ subject, html, text }` |

**No `resend` npm package.** One `fetch` POST against a stable HTTP endpoint. No dependency, no
module mocking in jest, and the error handling is ours rather than a wrapper's.

### Configuration

Added to `backend/.env.example` in that file's existing commented style.

| Variable | Local default | Staging |
|---|---|---|
| `MAIL_DRIVER` | `log` | `resend` |
| `RESEND_API_KEY` | unset | Fly secret |
| `MAIL_FROM` | `BoxOps <invites@mail.boxops.dev>` | same |
| `MAIL_PREVIEW_DIR` | `tmp/mail` | unset |

**Validated at boot, not at send time.** `MAIL_DRIVER=resend` with no `RESEND_API_KEY` refuses to
start; on Fly that surfaces as a failed release, which is where a missing secret belongs. The
check tests **presence only, never validity** — an invalid-but-present key must still boot,
because that is how the forced-failure verification in §8 is performed.

`MAIL_PREVIEW_DIR` unset means "log only". Local `.env` sets it; jest and the e2e suites leave it
unset so no test run litters the working tree. `backend/tmp/` is gitignored.

### The seam

`InviteService.announceInviteLink` (`backend/src/domain/invite/invite.service.ts:405`) **keeps its
name and its call site**, as the epic's §1 requires. Its body becomes a `try`/`catch` around
`InviteMailer`, returning `'sent' | 'failed'` instead of `void`. It must never throw: the invite
row is persisted before it runs, so raising would destroy a valid token over a delivery failure.
That guarantee is now structural — the method's only job is to convert an exception into a status.

`InviteService` gains one lookup of the inviting `UserEntity` (it already holds `createdByUserId`
but never loads it), for the inviter's `name` and `email`. If the row is missing, the template
falls back to the gym name alone rather than failing the send.

---

## 4. Templates

One renderer, two wordings. The role selects the sentences; the skeleton, CTA and footer are
shared, so there is one HTML layout to get right.

**Athlete** — subject `You're invited to join {gym} on BoxOps`
> {inviter} invited you to join {gym}. Accept your invite to book classes and log your results.

**Coach** — subject `{gym} invited you to coach on BoxOps`
> {inviter} invited you to coach at {gym}. Accepting adds you to their coaching staff — you'll be
> able to see your assigned classes, mark attendance, and view results.

The distinction the epic asks for — one joins a gym, the other is offered a job — lives in that
sentence, not in a separate layout.

Both carry the gym name, who invited them, one crimson **Accept invite** button to
`/invite/<token>`, the same URL in plain text beneath it (some clients strip buttons), and
`This link expires on {date} — 7 days from when it was sent.`

### Constraints, held deliberately

- **One Accent Rule.** The Accept button is the single crimson `#E23B4E` element; everything else
  is ink and hairlines. Email is the easiest place to smear brand colour around, so this is the
  rule most at risk here — and it is enforced by a test, not by vigilance.
- **Table-based layout, inline styles, no web fonts.** Email clients do not do flexbox and mostly
  refuse `@font-face`, so the Named-Face Rule cannot apply literally. A system serif/sans stack
  reads as close to Clean Ink as email allows.
- **Hex values are hardcoded in the template**, not imported from `frontend/constants/design.ts`.
  A backend file importing frontend tokens would be a new cross-boundary dependency for two
  colours.
- **No tracking pixels, no click rewriting.** Nothing needs them and they hurt deliverability.
- **The plain-text alternative is real prose**, not stripped HTML. It is what a spam filter reads.

---

## 5. One source of truth for the link

Today the backend builds the link from `FRONTEND_URL` while `inviteLinkFor()`
(`frontend/app/coaches.tsx:38`) rebuilds it from `window.location.origin`, because the list
endpoint returns only the token. Once mail exists this stops being cosmetic: the email would say
`app.boxops.dev` while a Copy-link button hands over whatever origin the owner's browser is on.

Resolved in one direction — **the backend is the only thing that ever composes an invite link**:

- The link-building moves out of `createInvite`'s body into a private helper on `InviteService`,
  called by create, by list, and by the email.
- `InviteListItemDto` gains `inviteLink`, built by that helper. `inviteToken` stays — revoke is
  keyed on it.
- `inviteLinkFor()` is **deleted**. `handleCopyInviteLink` and the mobile row read
  `invite.inviteLink` off the DTO.
- Swagger decorators updated, then `npm run generate:api-types` in `frontend/`, so the invite
  types pick the field up from the generated schema rather than being hand-edited.

**Accepted consequence:** the invite screens stop working when pointed at a backend whose
`FRONTEND_URL` is wrong, instead of silently working because the browser supplied the origin.
That is the correct trade — a wrong `FRONTEND_URL` should be visible, and it is precisely the
failure mode that would otherwise ship broken links into real inboxes.

---

## 6. What the owner sees

`InviteResponseDto` gains one field: `delivery: 'sent' | 'failed'`, **on the create response
only**. No column, no migration, no change to the list endpoint — the status describes one
request, after which an invite is just an invite.

The Swagger operation description at `backend/src/api/invite/invite.controller.ts:83`, which today
states plainly that no email is delivered, is rewritten to describe the send and to say that
`delivery: 'failed'` means the invite is valid but must be passed on by hand.

### Athlete modal — `frontend/app/invites.tsx`

Primary action `Create Link` → **`Send Invite`**. After success:

- `sent` → quiet meta text: `Invite emailed to {email}.` The link and its Copy button stay, framed
  as *Or send them the link yourself*.
- `failed` → `We couldn't email this invite. It's still valid — send them the link yourself.` The
  link box then reads exactly as it does today.

The "No email goes out" claim at `invites.tsx:253` and the empty-state copy at `invites.tsx:425`
both go.

### Coach modal — `frontend/app/coaches.tsx`

The same two states. `Create Link` → **`Send Invite`**, and the
`email delivery is not set up yet` line in the created-invite box goes.

### Per-row actions

- `invites.tsx` — `New link` becomes **`Resend`**. The comment at line 118 explaining why it is
  *not* called that is replaced with what it now does: mints a fresh link and emails it.
- `coaches.tsx` keeps **`Copy link`** and gains nothing. A pending coach invite blocks a second
  one (`CoachInvitePendingError`), so there is no re-send path to label; the owner revokes and
  re-invites, or copies.

### Styling rules this obeys

No green success banner — `sent` is quiet meta text, because DESIGN.md has no success role. The
failure notice uses `Ink.strong`, matching the existing `inlineError` pattern in both files, and
**not** `Status.danger`: danger is reserved for destructive actions, and a delivery failure is
information, not a destructive act (the Two Reds Rule).

The copy affordances are kept throughout. An owner re-sending a link to someone who lost the mail
is a real need — they simply stop being the *only* way an invite arrives, which is exactly what
the epic's §4 asks for.

---

## 7. Testing

### Unit — `backend`

- **`resend.driver.spec.ts`** — global `fetch` stubbed: 200 resolves; 401 and a network throw both
  raise `MailDeliveryError` carrying the provider's message.
- **`invite-email.spec.ts`** — per role, the rendered HTML *and* text each contain the gym name,
  the inviter's name, the `/invite/<token>` URL and the expiry date; the subjects differ by role;
  the HTML contains **exactly one** occurrence of `#E23B4E`.
- **`invite.service.spec.ts`** additions — the load-bearing ones: a throwing driver yields
  `delivery: 'failed'` **and** the invite row still persists and the token is still returned; a
  succeeding driver yields `'sent'`; a missing inviter row still sends. The existing
  `FRONTEND_URL` describe extends to cover the link helper's three call sites.
- **`mail.module.spec.ts`** — `MAIL_DRIVER=resend` without `RESEND_API_KEY` throws at
  registration; an unknown driver name throws.

### Integration — `backend/test`

`invite-lifecycle-and-profile.e2e-spec.ts` and `invite-coach.e2e-spec.ts` assert `delivery` is
present on the create response and that list items carry `inviteLink`.

### Frontend

`invites.tsx` and `coaches.tsx` suites cover both modal states and the label changes, **with the
responsive register pinned in each** — jsdom defaults to 750px, so an unpinned suite tests mobile
only.

`frontend/e2e/journeys/11-invites-bring-people-in.spec.ts` has its assertions updated for
`Send Invite` and `Resend`, and must run with `MAIL_DRIVER` unset so no e2e run mails anybody.

---

## 8. Done when

1. An invite created through `app.boxops.dev` arrives as an email at a real external address, for
   **both** the athlete and the coach role.
2. The received message's `Authentication-Results` header shows `spf=pass`, `dkim=pass` and
   `dmarc=pass`. Not merely "it arrived" — arrival in one inbox proves nothing about the next.
3. **Forced failure:** with `RESEND_API_KEY` on Fly set to a present-but-invalid value, the app
   boots (presence-only validation), Resend returns 401, the owner sees the failure message, the
   invite is still in the list, and the link still copies. Then the key is restored.
4. No surface in the app, the Swagger schema or `docs/` claims a send that does not happen — the
   invariant the 2026-08-20 truth-in-UI pass established, now satisfied by making the claim true
   rather than by removing it.

## 9. Documentation to update on completion

- `epics/EMAIL_SERVICE_EPIC.md` — rewritten from brief to record; its §1 and §2 become history,
  not current state.
- `context/PROJECT_STATE.md` — the epic closes.
- `docs/COMMAND_MODEL.md:1257` — "Send invitation email" becomes true.
- `context/DECISION_LOG.md` — Resend as provider; synchronous status without a send log.

## 10. Out of scope

Restated so the implementation plan cannot drift into it: password reset, any non-invite email
(receipts, reminders, digests), delivery retries, a persisted send log, a coach-invite resend
endpoint, and production mail configuration.
