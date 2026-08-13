# Email Service — open

**Source:** the coach-invite work of 2026-08-13
(`docs/superpowers/specs/2026-08-13-coach-invite-and-gym-context-design.md`). That spec made
acceptance mandatory for coach invites, which means an invite link now has to *reach* a person
who may not have an account yet. It does not, so the gap is recorded here rather than left
implied by a `TODO`.

Not scheduled. This file is the brief for whoever picks it up.

---

## 1. There is no email provider, anywhere

No provider is wired in the repo. `backend/package.json` has no mail dependency (no
`nodemailer`, no `@aws-sdk/client-ses`, no hosted-API client), there is no mail module, no
template directory, and no SMTP or API-key configuration to set. The only outbound channel
that exists is Expo push (`epics/NOTIFICATIONS_EPIC.md`), which reaches **registered devices**
and therefore cannot carry an invite to someone who has never signed up.

There is exactly one send path, `InviteService.sendInviteEmail` in
`backend/src/domain/invite/invite.service.ts`, and both of its branches are placeholders:

- outside production it `console.log`s a `DEV EMAIL —` line carrying the recipient, the subject
  and the link;
- in production it `console.warn`s `Production email delivery not yet configured.` and the link,
  then returns.

It never throws and never reports failure, so `createInvite` succeeds identically whether or not
anything was delivered. Every invite in the system — athlete and coach — has been created this
way; nothing has ever been emailed. Password reset does not exist either, so invites are the
whole of the requirement today.

## 2. Owner-copies-the-link is the deliberate interim mechanism

Coach invites shipped knowing this. The decision (`docs/DECISIONS.md` → **Coach Invites Require
Acceptance**) needs a link to travel; with no mail path, the owner is the transport. That is
accepted as an **interim** mechanism, not the intended one — it works for a gym whose owner can
message the coach directly, and not at all for anything larger.

What a real email would replace:

- `frontend/app/coaches.tsx` — the created-invite modal stays open after a successful invite
  purely so the owner can copy the link, and each pending row (desktop and mobile) carries its
  own **Copy link** button.
- `frontend/app/invites.tsx` — the same created-invite modal for athlete invites. Its rows offer
  revoke only, with no per-row **Copy link** button, so there is less to retire there.
- `inviteLinkFor()` in `coaches.tsx`, which **rebuilds** the link from `window.location.origin`
  and the token because the list endpoint returns the token only. The backend builds its own
  link from `FRONTEND_URL`, so the two can disagree about the origin. That whole helper exists
  because delivery does not; it goes away with this epic.

The copy affordances are not wasted work — an owner re-sending a link to someone who lost the
mail is a real need — but they stop being the *only* way an invite arrives.

## 3. Scope when this is picked up

- **Provider choice.** Pick one and configure it, including the local-development story
  (a catcher, or keep the dev `console.log` branch deliberately). The existing code comment
  names AWS SES as the assumed direction; that is an assumption, not a decision.
- **Templates for both invite roles.** An athlete invite and a coach invite say different
  things — one joins a gym, the other is offered a job — and both land on the same
  `/invite/<token>` screen. Both must state who invited them, which gym, and that the link
  expires in 7 days.
- **A delivery-failure story that does not lose the invite.** The invite row is already
  persisted before `sendInviteEmail` is called, so a send failure must not roll it back or the
  owner loses a valid token. The minimum: surface to the owner that delivery failed, and keep
  the copy-link affordance as the fallback path. Retries and a send log are the larger version
  of the same question.

Out of scope until asked for: any non-invite email (receipts, reminders, digests). Class
reminders already go out over push.
