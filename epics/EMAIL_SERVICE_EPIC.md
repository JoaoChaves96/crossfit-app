# Email Service — OPEN (not scheduled)

**Goal:** an invite reaches its recipient without the gym owner acting as the mail carrier.

**Status:** open, unscheduled. This file is the brief for whoever picks it up, and the record of
why the copy-the-link mechanism exists so it is not mistaken for a bug or "fixed" by accident.

**Source:** the coach-invite work of 2026-08-13
(`docs/superpowers/specs/2026-08-13-coach-invite-and-gym-context-design.md`). That spec made
acceptance mandatory for coach invites, which means an invite link now has to *reach* a person
who may not have an account yet. It does not, so the gap is recorded here rather than left
implied by a `TODO`.

---

## 1. There is no email provider, anywhere

No provider is wired in the repo. `backend/package.json` has no mail dependency (no
`nodemailer`, no `@aws-sdk/client-ses`, no hosted-API client), there is no mail module, no
template directory, and no SMTP or API-key configuration to set. The only outbound channel
that exists is Expo push (`epics/NOTIFICATIONS_EPIC.md`), which reaches **registered devices**
and therefore cannot carry an invite to someone who has never signed up.

There is exactly one seam where delivery would live, `InviteService.announceInviteLink` in
`backend/src/domain/invite/invite.service.ts`. It does not deliver. Both branches log:

- outside production, a `NOT EMAILED (no provider)` line carrying the recipient and the link;
- in production, the same as a `console.warn`, then it returns.

It never throws and never reports failure, so `createInvite` succeeds identically whether or not
anything was delivered — which is correct, because nothing is ever attempted. Every invite in the
system, athlete and coach, has been created this way; **nothing has ever been emailed.** Password
reset does not exist either, so invites are the whole of the requirement today.

The method is deliberately kept as a seam so the call site does not move when a provider arrives.
It must not start throwing as a "safety" improvement: the invite row is already persisted by the
time it runs, so raising would destroy a valid token over a delivery that was never attempted.

## 2. Owner-copies-the-link is the deliberate interim mechanism

Coach invites shipped knowing this. The decision (`docs/DECISIONS.md` → **Coach Invites Require
Acceptance**) needs a link to travel; with no mail path, the owner is the transport. That is
accepted as an **interim** mechanism, not the intended one — it works for a gym whose owner can
message the coach directly, and not at all for anything larger.

The UI says so plainly, as of 2026-08-20. Swagger's `POST /api/gyms/:gymId/invites` response, the
athlete-invite modal, the invites empty state, and the coach-invite modal all state that no email
is delivered and the link must be sent by hand. The athlete modal's primary action is **Create
Link**, not "Send Invite", and the per-row action is **New link**, not "Resend" — there was never
a send to re-do.

What a real email would replace:

- `frontend/app/coaches.tsx` — the created-invite modal stays open after a successful invite
  purely so the owner can copy the link, and each pending row (desktop and mobile) carries its
  own **Copy link** button.
- `frontend/app/invites.tsx` — the same created-invite modal for athlete invites, plus the
  "send it to them yourself" copy in the modal and the empty state.
- `inviteLinkFor()` in `coaches.tsx`, which **rebuilds** the link from `window.location.origin`
  and the token because the list endpoint returns the token only. The backend builds its own
  link from `FRONTEND_URL`, so the two can disagree about the origin. That whole helper exists
  because delivery does not; it goes away with this epic.
- `docs/COMMAND_MODEL.md:1257` — "Send invitation email (implementation-specific; may be async)"
  is the one place in the docs that still reads as though a send happens. It becomes true here.

The copy affordances are not wasted work — an owner re-sending a link to someone who lost the
mail is a real need — but they stop being the *only* way an invite arrives.

## 3. Cost

**Monetary cost at this product's volume is effectively nil.** Invites are one-per-new-member,
not a broadcast channel: a gym onboarding 50 athletes a month sends ~50 emails. Every provider's
free or lowest tier covers that with three orders of magnitude to spare.

Approximate list prices (my knowledge cutoff is May 2026 — **confirm at signup, these move**):

| Provider | Shape | Cost at ~50/mo | Cost at 5,000/mo |
|---|---|---|---|
| AWS SES | pay-per-use, ~$0.10 / 1,000 | ~$0.01 | ~$0.50 |
| Resend | free tier ~3,000/mo | $0 | ~$20/mo (paid tier) |
| SendGrid | free tier ~100/day | $0 | ~$20/mo |
| Postmark | no meaningful free tier | ~$15/mo | ~$15/mo (10k included) |

**The real costs are not the invoice:**

- **A domain you control.** Deliverability requires SPF, DKIM and DMARC records on a domain you
  own — you cannot send as `@gmail.com`. ~$10–15/year if there isn't one already. This is the
  hard prerequisite; without it, invites land in spam and the epic has failed even though the
  code works.
- **SES starts in sandbox.** It will only send to addresses you have verified until you file a
  production-access request with AWS (a short form, typically approved in a day or so). Plan for
  that lead time rather than discovering it on launch day. Providers like Resend and Postmark
  have a lighter version of the same domain-verification step.
- **Engineering time**, which dominates: two templates, config plumbing, a local-development
  story, and the delivery-failure handling in §4. Small, but larger than the bill.
- **Ongoing attention.** Bounces and complaints affect sender reputation; SES will suspend an
  account with a bad bounce rate. A tiny volume makes this unlikely, but it is not zero-touch.

**Recommendation if this is picked up:** SES if the app is already going to run on AWS (cheapest,
one less vendor, sandbox is the only friction); Resend if it is not (least setup, free at this
volume, better developer experience). Either is defensible — this is a decision, not a finding.

## 4. Scope when this is picked up

- **Provider choice** (see §3), configured, including the local-development story: a catcher such
  as Mailhog, or keep the dev logging branch deliberately. A code comment once named SES as the
  assumed direction; that was an assumption, not a decision.
- **Templates for both invite roles.** An athlete invite and a coach invite say different
  things — one joins a gym, the other is offered a job — and both land on the same
  `/invite/<token>` screen. Both must state who invited them, which gym, and that the link
  expires in 7 days.
- **A single source of truth for the link.** Resolve the `FRONTEND_URL` vs `window.location.origin`
  disagreement described in §2, so the email and the UI cannot name different origins.
- **A delivery-failure story that does not lose the invite.** The invite row is already persisted
  before `announceInviteLink` is called, so a send failure must not roll it back or the owner
  loses a valid token. The minimum: surface to the owner that delivery failed, and keep the
  copy-link affordance as the fallback path. Retries and a send log are the larger version of the
  same question.
- **Retire the interim copy** listed in §2 — but only the claims, not the Copy buttons.

## 5. Done when

- An invite created through the UI arrives as an email at a real external address, for both the
  athlete and the coach role, from a domain with SPF/DKIM/DMARC passing.
- A forced provider failure leaves the invite row intact, tells the owner delivery failed, and
  still offers the link to copy.
- No surface in the app, the Swagger schema, or `docs/` claims a send that does not happen —
  which, inverted, is the invariant the 2026-08-20 truth-in-UI pass established and this epic
  must not regress.

**Out of scope until asked for:** any non-invite email (receipts, reminders, digests, password
reset). Class reminders already go out over push. Password reset is its own epic and does not
exist yet, though it will need this one first.
