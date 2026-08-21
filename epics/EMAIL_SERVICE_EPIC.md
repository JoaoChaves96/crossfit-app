# Email Service — COMPLETE (2026-08-21)

**Goal:** an invite reaches its recipient without the gym owner acting as the mail carrier.

**Status:** done and verified live. Invites for both roles are mailed through a driver seam and
arrived at a real external inbox from `mail.boxops.dev`; the failure path was forced against real
Resend and reported `delivery: 'failed'` without costing the invite. Every §6 box is ticked — see
the Evidence section, including the two limits accepted on it.

The seam's default is still the non-sending log driver, so **a new environment delivers nothing
until `MAIL_DRIVER=resend` and `RESEND_API_KEY` are set on it.** Only `boxops-api-staging` has them.

**Source:** the coach-invite work of 2026-08-13
(`docs/superpowers/specs/2026-08-13-coach-invite-and-gym-context-design.md`), which made
acceptance mandatory for coach invites and so required an invite link to *reach* a person who may
not have an account yet.

**Design:** `docs/superpowers/specs/2026-08-21-email-service-design.md`.
**Plan:** `docs/superpowers/plans/2026-08-21-email-service.md`.

---

## 1. What shipped

**Provider:** Resend, over its HTTP API via global `fetch`. **No new npm dependency** in either
project — sending an email is one POST, and owning the error mapping is what lets the service
report a status instead of guessing at an SDK's exception types.

**The seam.** `MailDriver` has exactly two implementations, selected at boot by `MAIL_DRIVER`:

| Driver | Behaviour |
|---|---|
| `log` (default) | Logs the message; with `MAIL_PREVIEW_DIR` set, writes the rendered HTML there so a template can be opened in a browser. **Never throws** — it is the absence of a provider, not a provider under test. |
| `resend` | One POST to `api.resend.com/emails`; throws `MailDeliveryError` carrying the status and the provider's body. Refuses to boot without `RESEND_API_KEY`. |

Selection is boot-time, so a misconfigured environment fails the deploy rather than the first
invite an owner creates. The key is checked for **presence, never validity** — the forced-failure
verification needs the app to boot with a wrong key so Resend can answer 401 at send time.

**Above the seam:** `InviteMailer` owns the two role-specific templates. An athlete is joining a
gym; a coach is being offered a job — different subjects and different bodies, both landing on the
same `/invite/<token>` screen, both naming who invited them, which gym, and the 7-day expiry. The
expiry date is formatted with `timeZone: 'UTC'` pinned, or the same instant would read as a
different day depending on the host's clock zone.

**Delivery reporting.** `InviteService.announceInviteLink` kept its name and its call site — the
seam did not move when a provider arrived — but now returns `'sent' | 'failed'` instead of `void`,
and it **must never throw**. The invite row is persisted before it runs, so raising would destroy
a valid token over a delivery the owner can still work around by copying the link. Converting the
exception into a status is its entire job. The status surfaces as `delivery` on **both** create
responses: `InviteResponseDto` and `InviteCoachResponseDto` (coach invites go through
`InviteCoachHandler`, not the generic invite controller).

**One source of truth for the link.** `InviteService.buildInviteLink` is now the only place an
invite link is composed; `createInvite`, `listInvites` and the email all call it, and
`InviteListItemDto` carries `inviteLink`. `inviteLinkFor()` in `coaches.tsx` — which rebuilt the
link from `window.location.origin` and so could disagree with the backend about the host — is
deleted. The missing-`FRONTEND_URL` fallback is `http://localhost:8081`, deliberately: the old
default `https://app.crossfitbox.com` is a domain nobody here owns, so it minted links that looked
correct and went nowhere.

**Owner-facing behaviour.** Both invite modals now report the send and keep the link:

- sent → quiet meta text, `Invite emailed to <address>.` There is no green banner; DESIGN.md has
  no success role.
- failed → `We couldn't email this invite. It's still valid — send them the link yourself.` in
  strong ink, **not** `Status.danger` — danger is destructive-only (Two Reds Rule).

The primary action is **Send Invite** and the per-row action is **Resend**, both now honest. The
Copy affordances stay: an owner re-sending a link to someone who lost the mail is a real need.
They have simply stopped being the *only* way an invite arrives. The athlete modal's dismiss
button reads **Done** once the invite exists, because at that point it cancels nothing.

## 2. Deliberately not built

- **No retries and no send log.** The failures at this volume are permanent (bad address, bad key,
  unverified domain), not transient; a human is always on screen when an invite is created; the
  copy-link fallback already exists; and a retry sweep would inherit the duplicate-cron problem
  from staging's two Fly machines. Both are additive later.
- **No `delivery` column and no migration.** The status describes one request. After that request
  an invite is just an invite, and a column would imply a history the system does not keep.
- **No non-invite email** — receipts, reminders, digests. Class reminders already go out over push.
- **Password reset still does not exist**, but it is no longer blocked: it now has a mail seam to
  build on.

## 3. Configuration

Documented in `backend/.env.example`. `MAIL_PREVIEW_DIR` is unset under jest and Playwright, so no
test run writes files into the working tree, and `MAIL_DRIVER` is unset there too — the log driver
runs and `delivery` is `'sent'` without anything leaving the machine.

**Human prerequisites, still outstanding:**

1. Sign up for Resend; add `mail.boxops.dev` as a sending domain.
2. Add Resend's SPF + DKIM records to Cloudflare DNS, plus a DMARC TXT record on
   `_dmarc.boxops.dev`.
3. `flyctl secrets set RESEND_API_KEY=... MAIL_DRIVER=resend -a boxops-api-staging`.

`FRONTEND_URL` was verified already correct on staging (its secret digest is byte-identical to
`CORS_ORIGINS`, which is `https://app.boxops.dev`).

## 4. History — the state this epic closed (2026-08-13 → 2026-08-21)

Kept because it explains why the copy-the-link affordances exist, so they are not mistaken for a
bug or "fixed" by accident.

For eight days there was **no email provider anywhere** in the repo: no mail dependency, no mail
module, no templates, no SMTP or API-key configuration. The only outbound channel was Expo push,
which reaches registered devices and therefore could not carry an invite to someone who had never
signed up. `announceInviteLink` existed but only logged — a `NOT EMAILED (no provider)` line
carrying the recipient and the link. **Every invite ever created in this system before 2026-08-21
was created that way; nothing had ever been emailed.**

Owner-copies-the-link was the deliberate interim mechanism, accepted knowingly when coach invites
shipped: `docs/DECISIONS.md` → **Coach Invites Require Acceptance** needs a link to travel, and
with no mail path the owner was the transport. From 2026-08-20 the UI said so plainly, in a
truth-in-UI pass that renamed the primary action to **Create Link** and the per-row action to
**New link** — there had never been a send to re-do. Those labels are what this epic reversed, and
the invariant that pass established still holds in the other direction: **no surface may claim a
send that does not happen.**

## 5. Cost

Retained from the original brief; it is what settled the provider choice.

**Monetary cost at this product's volume is effectively nil.** Invites are one-per-new-member, not
a broadcast channel: a gym onboarding 50 athletes a month sends ~50 emails. Every provider's free
or lowest tier covers that with three orders of magnitude to spare.

Approximate list prices (knowledge cutoff May 2026 — **confirm at signup, these move**):

| Provider | Shape | Cost at ~50/mo | Cost at 5,000/mo |
|---|---|---|---|
| AWS SES | pay-per-use, ~$0.10 / 1,000 | ~$0.01 | ~$0.50 |
| Resend | free tier ~3,000/mo | $0 | ~$20/mo (paid tier) |
| SendGrid | free tier ~100/day | $0 | ~$20/mo |
| Postmark | no meaningful free tier | ~$15/mo | ~$15/mo (10k included) |

**The real costs are not the invoice:**

- **A domain you control.** Deliverability requires SPF, DKIM and DMARC on a domain you own — you
  cannot send as `@gmail.com`. This is the hard prerequisite; without it invites land in spam and
  the epic has failed even though the code works. Satisfied here by `mail.boxops.dev`.
- **SES starts in sandbox**, sending only to verified addresses until a production-access request
  is approved. Resend's domain verification is the lighter version of the same step — which, with
  the app not running on AWS, is why Resend won.
- **Engineering time**, which dominates the bill.
- **Ongoing attention.** Bounces and complaints affect sender reputation.

## 6. Done when

- [x] Both invite roles render a role-appropriate email naming the inviter, the gym and the expiry.
- [x] A provider failure leaves the invite row intact, tells the owner delivery failed, and still
      offers the link to copy.
- [x] The email and the Copy button cannot name different origins.
- [x] No surface in the app, the Swagger schema, or `docs/` claims a send that does not happen.
- [x] **An invite arrives as an email at a real external address, for both the athlete and the
      coach role, from a domain with SPF/DKIM/DMARC passing.** Done 2026-08-21 — see the evidence
      below, and the two accepted limits on it.
- [x] The forced-failure path confirmed against the real provider on staging. Done 2026-08-21.

Verification procedure: `docs/superpowers/plans/2026-08-21-email-service.md` → Task 11.

### Evidence, 2026-08-21

Resend is live: `mail.boxops.dev` verified in the EU (Ireland) region, with the DKIM key at
`resend._domainkey.mail`, `v=spf1 include:amazonses.com ~all` on `send.mail`, the
`feedback-smtp.eu-west-1.amazonses.com` bounce MX, and `v=DMARC1; p=none` at `_dmarc.boxops.dev`
— all four confirmed by `dig` independently of Resend's own green ticks. `RESEND_API_KEY` and
`MAIL_DRIVER=resend` are deployed on `boxops-api-staging`.

Both roles were then created against `api.boxops.dev` and both responses carried
`delivery: 'sent'`; **both emails arrived in a real external Gmail inbox**, confirmed by the
recipient. CI run 32513785089 was green on all six jobs.

**The forced-failure run, 2026-08-21.** Rather than the bogus `RESEND_API_KEY` the plan's Task 11
described, `MAIL_FROM` was pointed at a sender Resend does not know — an equivalent rejection that
needs no secret restored from memory afterwards. `MAIL_FROM` was unset when it was over, so the
verified `DEFAULT_MAIL_FROM` is what staging uses again.

With the unverified sender deployed, an invite created through `POST /api/gyms/:gymId/invites`
returned `delivery: 'failed'` while keeping everything else intact: the row persisted, the invite
listed as `pending`, and `GET /api/invites/:token` still validated the link. The API log named the
reason, which is what makes this the provider's rejection and not a local guess:

```
Resend returned 403: {"statusCode":403,"message":"This API key is not authorized to
send emails from unverified-boxops-test.dev"}
```

After `flyctl secrets unset MAIL_FROM`, the same call returned `delivery: 'sent'`, so staging was
not left half-configured. All test invites were revoked.

One thing this run taught, worth keeping: Resend also 422s on a recipient at `example.com`
("please use our testing email address instead"). A first attempt failed for that reason rather
than the sender, which read identically from the caller's side. **`delivery: 'failed'` says nothing
about why** — the log line is the only place the reason exists, by the no-send-log decision.
`delivered@resend.dev` is the recipient to use for a test that must actually leave.

**Two limits on the evidence, accepted rather than closed:**

1. **The `Authentication-Results` header was not inspected.** Header-level SPF/DKIM/DMARC
   alignment is inferred from the four DNS records being correct under `dig`, not observed in a
   received message. Accepted: the records are the thing that determines the outcome, and every
   receiver evaluates them itself.
2. **The invites were created through the API, not the deployed UI.** Accepted: both screens'
   sent and failed states are covered by the frontend suites and journey 11, over the same
   endpoints this run exercised live.

**The first attempt found a real gap:** the invites were created while staging still ran `f655a65`,
because all ten email commits were committed but never pushed. The responses came back with no
`delivery` field at all and no mail was sent. Worth remembering as the failure mode — the log
driver and an undeployed API both look like success from the caller's side.
