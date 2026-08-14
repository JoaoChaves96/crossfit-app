# Project State

**→ See `epics/GYM_OWNER_EPIC.md` for completed epic details**  
**→ See `epics/COACH_MVP_EPIC.md` for completed epic details**  
**→ See `epics/AUTH_JWT_EPIC.md` for completed epic details**  
**→ See `epics/AUTH_FLOWS_EPIC.md` for completed epic details**  
**→ See `epics/ATHLETE_SCREENS_EPIC.md` for completed epic details**
**→ See `epics/INVITE_ONBOARDING_EPIC.md` for completed epic details**
**→ See `epics/LOG_RESULTS_EPIC.md` for completed epic details**
**→ See `epics/CLASS_MANAGEMENT_EPIC.md` for completed epic details**
**→ See `epics/GYM_SETTINGS_EPIC.md` for completed epic details**
**→ See `epics/CLASS_LIFECYCLE_EPIC.md` for completed epic details**
**→ See `epics/MEMBERS_EPIC.md` for completed epic details**
**→ See `epics/EDIT_CLASS_EPIC.md` for completed epic details**
**→ See `epics/REVOKE_COACH_EPIC.md` for completed epic details**
**→ See `epics/ATHLETE_PROFILE_EPIC.md` for completed epic details**
**→ See `epics/GYM_PROFILE_EPIC.md` for completed epic details**
**→ See `epics/NOTIFICATIONS_EPIC.md` for completed epic details**
**→ See `epics/MEMBERSHIP_PLANS_EPIC.md` for completed epic details**

## Product

Crossfit class booking application.

## Current Phase (2026-08-03)

**Tiered Audit — Phase 3: bug triage & fixes** (Trello board "Crossfit Application")
Phase 1 (automated sweep) and Phase 2 (per-screen walkthrough vs `.pen` designs) surfaced
🐞 cards on the board. Phase 3 fixed the audited backend/frontend bugs, blocker first, one at
a time (execution agents implement; each fix verified before the next).

**Phase 2 per-screen walkthrough status:** ✅ COMPLETE — all three roles. Athlete role ✅ (22 🐞
cards). Gym-Owner role ✅ (25 🐞 cards — incl. Membership Plans feature entirely missing, and
/invites rendering the athlete nav shell). Coach role ✅ (13 🐞 cards — Class Details renders the
desktop-style card on mobile; undesigned "Loggable" toggle; Mark Attendance layout diverges from
design & defaults athletes to Absent; desktop sidebar & Schedule/Create/Manage frames exceed coach
MVP scope. Coach desktop has NO duplicate-header bug). Discovery/triage only; fixes are Phase 3.

- ✅ **🐞 Athlete HTTP 403 on log-results** (blocker) → **Verified**
  - Backend (`9df7d47`): new own-scoped `GET /api/gyms/:gymId/classes/:classId/results/me`
    (`@Role(['athlete','owner','coach'])`, returns only the caller's result). Roster
    `GET .../results` left coach/owner-only (no cross-athlete leak). `GET .../programming`
    relaxed to athletes with an active membership in the gym. gymId scoping preserved.
  - Frontend (`d352c28`): `log-results.tsx` now fetches `.../results/me` (single `{ result }`
    shape) instead of the roster endpoint; types regenerated from Swagger.
- ✅ **🐞 Login screen hard-crash** (blocker, regression) → **Verified** (`78a07e1`)
  - `NotificationBell` (mounted globally) called `useNotifications()` → `useApiClient()`, which
    throws with no token, crashing the whole tree on `/login`. Restored the `isAuthenticated`
    guard so the bell renders `null` when logged out. Exposed when the unfinished notifications
    work (which carried the guard) was stashed.
- ✅ **🐞 Malformed (non-UUID) path param → HTTP 500** (low) → **Verified** (`29a538e`)
  - Global `UuidParamPipe` (APP_PIPE) rejects malformed UUIDs (params ending in `Id`) with 400
    before the DB; skips invite `token`/`inviteToken`. Global `QueryFailedFilter` (APP_FILTER)
    maps Postgres `22P02` → 400 as a backstop. Well-formed-but-missing UUID still → 404.
- ✅ **🐞 Duplicate-header / slug family** → **Verified** (`8a7528c`)
- ✅ **🐞 Raw-ISO date/time rendering family** → **Verified** (`0f71eee`)
- ✅ **🐞 Coach shown as email instead of display name** → **Verified** (`6ebb0b9`)
  - `CoachListItemDto` omitted `name` though the service already loaded the user. Added `name`
    to DTO + service mapping; create/edit-class coach pickers and the Coaches list now show the
    name (email demoted to secondary); types regenerated from Swagger.
- ✅ **🐞 Tenant-mismatch status inconsistent** → **Verified & pushed** (`4a28c58`)
  - **Invariant clarification:** for gym-scoped routes, **401 = missing/invalid authentication
    only; 403 Forbidden = authenticated but wrong tenant or role.** `GymOwnershipGuard` now throws
    `ForbiddenException` (was 401) on JWT-gym vs route-gym mismatch — single enforcement point for
    7 controllers. Service/handler resource-gym checks already returned 403 (unchanged). ~22 stale
    e2e assertions (previously expecting 401/500) aligned to 403; all no-auth 401 assertions kept.
    (No isolation bug existed — real cross-tenant access was always blocked; only the status code
    disagreed.)
- ✅ **🐞 Hardcoded gym labels + pluralization family** → **Verified** (`afca90c`)
  - Athlete/owner Schedule showed a hardcoded "My Gym"; invite acceptance showed a hardcoded
    "CrossFit Box" subtext. Added `gymName` to `GetClassScheduleResponseDto` (populated from
    `GymService` in both athlete and owner schedule paths) and `gymLocation` to
    `ValidateInviteResponseDto` (from `gym.location`). Frontend `schedule.tsx` renders the real
    gym name across mobile/empty-state/desktop headers; invite screen renders the gym location
    (fallback "Welcome to our community!"). Coach Class Details now pluralizes "athlete(s) booked".
    Types regenerated from Swagger.
- 🔍 **🐞 Tier-2 mobile-reflow family** (5 cards) → **To Verify** (subagent-driven; each task
  reviewed spec+quality and live-checked at 390×844 vs its `.pen` frame; final whole-branch
  review clean; desktop re-verified unregressed at 1280px). Presentation-only mobile (≤768px)
  reflows; desktop layouts untouched. Plan: `docs/superpowers/plans/2026-08-05-tier2-mobile-reflow.md`.
  - `6a70ce53` Gym Settings Spaces & Class Types tabs → card lists (frame `nU1Kb`) — `ae8d3ac`
  - `6a70cd64` Owner Schedule Dashboard → day-strip + vertical class cards (frame `XbXLT`) — `6c5587d`
  - `6a70d0f3` Coach Class Details → compact 2-col info grid (frame `gXPN7`) — `826bdbd`
  - `6a70d10c` Coach Mark Attendance → subheader + Select All + footer, dropped stat tiles (frame `PWqpG`) — `35de7b2`
  - `6a70cdba` Owner Class Management → 3-tab Info|Bookings|Results (frame `7iKEc`) — `ff3978a`
  - Stale card `6a70c8f2` (Athlete Schedule header) excluded — app already renders the designed single-tier header.
- 🔍 **🐞 Athlete data/section family** (8 cards) → **To Verify** — backend `301a065`, frontend `d7ff5bd`.
  Real data now renders where placeholders/labels-only stood before; two backend contract additions,
  types regenerated from Swagger. Added shared `frontend/utils/result-format.ts`.
  - `6a70c92f` Class Details programming → fetches `.../classes/{id}/programming`, renders WOD (empty-state fallback)
  - `6a70c933` Class Details Recent Results → fetches `.../results/me`, renders athlete's own result
  - `6a70c926` Class Details location meta row → `spaceName` MetaRow (desktop + mobile)
  - `6a70c8ed` Schedule card location row → conditional 📍 `spaceName`
  - `6a70c961` My Bookings location row + icon fix → split 📍 space / 👤 coach rows (Upcoming + Past)
  - `6a70cc1b` Training History result value → renders value + metric, "Not Logged" badge fallback
  - `6a70c9a5` Training History coach row → `TrainingHistoryItemDto.coachName` (attendance repo join) + 👤 row
  - `6a70caec` Invite Acceptance → `ValidateInviteResponseDto.inviterName`/`inviterRole`; renders "Invited by {name} ({role})"
- 🔍 **🐞 Owner/Class Management Results panel family** (3 cards) → **To Verify** — backend `e0d7aa4`, frontend `79c20fd`.
  Added `userName` to `ClassResultItemDto`, resolved via UserService in both the coach/owner class-results
  query and the athlete own-result query (fallback to userId); types regenerated from Swagger.
  - `6a70cdb7` Results row athlete UUID → renders `userName` with initials avatar
  - `6a70cd97` Result value raw ("300 seconds") → formatted via `result-format` util ("18:42 min", frame `9ZqYx`)
  - `6a70cd94` Header collision "AthleteMetric" → `gap: Spacing.sm` on shared tableHeader/tableRow
- 🔍 **🐞 Athlete/Schedule family** (3 cards) → **To Verify** — frontend `61c1d0b`.
  - `6a70c8e2` Leftover Expo-starter tabs → deleted `(tabs)/index` + `explore`, repointed `/(tabs)` redirect + modal link to `/(tabs)/schedule`
  - `6a70c8ea` Missing Week/Day toggle + filter chips → added Controls (segmented toggle + class-type chips, client-side filtering) on mobile + desktop. ⚠️ pixel-verify vs frame `wUe5e` pending (Pencil editor locked on gym-owner file)
  - `6a70c8f2` Two-tier header / hardcoded gym name → verify-only; app already renders single header + real `gymName`
- 🔍 **🐞 Owner/Invites + Nav-consistency family** (3 cards) → **To Verify** — frontend `d4af41c`.
  `OWNER_NAV_ITEMS` is now the single owner nav shell everywhere: Dashboard(off)/Schedule/Classes(off)/Members/Coaches/Plans(off)/Invites/Settings (Plans shown-but-disabled, feature deferred; label "Members" not "Athletes").
  - `6a70cf37` Invites used athlete tab-nav → moved `app/(tabs)/invites` → top-level `app/invites` route, removed from athlete Tabs layout, registered in root Stack, now hosts `OwnerSidebar` + mobile drawer
  - `6a70cf85` Divergent inline sidebars → schedule-dashboard/coaches/members drop their local `Sidebar`/`NAV_ITEMS` and render shared `OwnerSidebar`; dead per-screen sidebar styles removed
  - `6a70cf3c` Create-Invite modal no backdrop → overlay uses `absoluteFillObject` (flex:1 collapsed to 0-height in RN-Web Modal host); dimmed layer now fills viewport, card opaque above it
  - Note: `gym-settings` still uses its own `SettingsSidebar` (out of scope; unify later if desired)
- 🔍 **🐞 Owner/Schedule Dashboard mobile card** (`6a70cd59`) → **To Verify** — verify-only, no code change (HEAD `7e87d87`). `MobileClassCard` already matches design frame `XbXLT` (time / name / Coach / "{space} · {duration} min" row / top-right N/N capacity). Card's "corner badge" claim was inaccurate — `XbXLT` renders capacity as plain #6B7280 text, which the code already does. Row was added in the earlier Tier-2 mobile-reflow batch.
- 🔍 **🐞 Coach mobile/attendance family** (4 cards) → **To Verify** — frontend `bb7cef1`.
  - `6a70d0ee` My Classes mobile card merged space+capacity → split into two Ionicon rows
    (`location-outline` + space, `people-outline` + capacity), frame `hnkOL`; desktop table unchanged
  - `6a70d0f0` Mobile card CTA "View" → "View Details" (frame `hnkOL`); testID unchanged
  - `6a70d10f` Mark Attendance STATUS showed raw slug "published" → local `STATUS_LABEL` map renders
    title-cased label (desktop info card only; mobile has no status row)
  - `6a70d10d` Mark Attendance defaulted athletes to Absent → now defaults booked athletes to Present
    (frame `PWqpG`); screen loads no prior attendance so nothing saved is clobbered
- 🔺 **🐞 Coach/Class Details "Loggable" toggle** (`6a70d0fb`) → **stays in Issues Found** — triage: KEEP.
  Toggle is live backend-wired behavior (persisted on POST programming, gates athlete result logging), so
  removal would delete a working feature. Gap is in the design; recommend a ux-designer task to add the
  control to coach frames `gXPN7`/`hrUW2` rather than an app change. No code change.
- 🔍 **🐞 Owner/Coaches family** (2 cards) → **To Verify** — backend `ba8b948`, frontend `6282daf`.
  Backend added `classesAssigned: string[]` (distinct, sorted class-type names) to `CoachListItemDto`,
  computed gymId-scoped with no N+1; types regenerated from Swagger.
  - `6a70ce71` Missing "Classes Assigned" column → desktop table realigned to design frame `5gQj6`
    (Name · Email · Status · Classes Assigned · Actions; Role column dropped); mobile `CoachCard` gains a
    Classes Assigned line ("No classes assigned" when empty)
  - `6a70ce73` Missing Coach Details side panel → new 340px desktop panel (frame `JE7Pq`); Actions "View"
    button (+ clickable row) selects a coach; panel shows Name/Email/Classes Assigned + Disable/Enable wired
    to the existing status-change flow; derives the coach from live list state by userId so it stays in sync
- 🔍 **🐞 Owner/Create Class family** (2 cards) → **To Verify** — frontend `1e8057a`.
  New reusable `OwnerSidebar` component (`OWNER_NAV_ITEMS`) introduced here; will be rolled out to remaining owner screens by the Nav-consistency batch.
  - `6a70cdd5` Desktop missing sidebar nav → Create Class desktop hosts `OwnerSidebar` (activeItem="classes"); mobile stays form-only
  - `6a70cdd7` Date/Time plain text inputs → new `DateTimeField`: web renders native `<input type=date|time>`, native falls back to pressable box + inline entry; payload contract unchanged (no new dependency)
- 🔍 **🐞 Notifications family** (4 cards) → **To Verify** — frontend `93c9941`. The prior
  "held in `git stash` / 17 failing tests / deferred migration" narrative was **stale**: the
  notifications frontend was already committed on `dev` and working. Actual remaining issues were
  a small cluster, all fixed here:
  - `6a6cdffe` tsc fails → 3 real errors resolved. `usePushToken.ts` `.status` errors traced to an
    expo 54 / expo-notifications 56 version skew (imported `PermissionResponse` drops `.status`),
    fixed with a narrow cast; `notifications.tsx` SFSymbol typing fixed by moving off the unmapped
    `IconSymbol` names. (`profile.tsx` `notificationPreferences` error was already gone via regen.)
    Only remaining tsc error is `useClassTransition.test.ts` — a separate stale Class Lifecycle mock.
  - `6a6cdffb` "17 tests failing" → actually 4 `NotificationBell` tests missing `useAuth` in the
    harness; added a `useAuth` mock. `npx jest notifications` → 20/20 pass.
  - `6a70ca28` mobile profile notification rows → added subtitles + section description + dividers to
    match the desktop layout / design frame.
  - `6a70cae7` "screen hard-crashes (`notifications` undefined)" → **crash was real** (earlier
    "not reproducible" note corrected). Backend returns the list under `items` + `unreadCount`, but
    the hook read `response.notifications` → undefined → crash; the `type` enum was also mismatched
    (`booking_confirmation` vs backend `booking_confirmed`). Fixed in the UX batch below (`9b7e6bd`).
- 🔍 **🐞 Coach design-scope reconciliation** (3 cards) → **To Verify** — design `e76b950`
  (`ux-designer` on `designs/coach-screens.pen`; no app change). Coach design frames had drifted
  from `docs/PRODUCT.md` §5.3 (several copied from the gym-owner design). Reconciled the design set
  DOWN to what coaches actually get:
  - `6a70d167` Sidebar nav `eT7ZY` → rebuilt from the owner-copied 6-item nav down to the shipped
    coach nav (My Classes + Profile only).
  - `6a70d16b` Owner-scoped frames removed: `J5KcE` (Schedule Dashboard), `8J7nW` (Create/Edit Class),
    `KYfwz` (Class Management). Remaining coach frames are all coach-scoped.
  - `6a70d0fb` Loggable toggle → KEEP (§5.3 grants coaches "decide whether a class is loggable");
    the design was incomplete, so ADDED the toggle to mobile `gXPN7` (desktop `hrUW2` already had it).
  - Designer flagged two read-only-for-now items in the surviving coach Class Details frames to
    confirm are never wired editable: the lifecycle status badge and capacity/booked counts
    (coaches can't change lifecycle state or capacity per §5.3).
- 🔍 **Five athlete-app UX fixes** → **To Verify** — frontend `9b7e6bd` (live-verified in Chrome).
  Post-audit issues reported directly by the user while exercising the athlete app:
  - **No logout** → Log Out button added at the bottom of the Profile screen (desktop + mobile) and
    in the new gym menu; clears the session and routes to `/login`.
  - **Login redirect when already authenticated** → `login.tsx` mount guard: once AuthContext finishes
    loading, an authenticated user is routed to their role home (shared `routeForRole` helper).
  - **Week/Day schedule bug** → schedule no longer filters to a hardcoded `new Date()` "today"
    (which rendered empty). Week shows all plan-eligible classes grouped by date; Day focuses the
    next upcoming date; date separators use a UTC-safe `formatDateLabel`.
  - **Dead gym dropdown** → new `GymMenu` popover (gym name + Log Out) replaces the inert ▼ selector
    in the desktop top-nav and mobile schedule headers. Decision: menu, not a multi-gym switcher.
  - **Notification bell crash on click** → the `items`/`unreadCount` contract + enum fix
    (see `6a70cae7` above). 20/20 notification tests, 19/19 schedule tests pass.
  - Spun off a new Backlog card for a separate cold-load robustness issue: direct-URL `/notifications`
    load crashes because `useApiClient` throws before AuthContext restores the token.
- ✅ **🐞 Absence no longer promotes from the waitlist (2026-08-11)** — product decision by
  João: marking an athlete absent must not promote anyone. Attendance is only markable once
  the class is `in_progress`/`completed`, so the promotion added an athlete to a session
  already underway or over — unnotified (that path never emitted `waitlist.promoted`) and
  unable to log a result anyway (LogResult needs `present=true`). Removed from
  `mark-attendance.handler.ts` along with its now-dead Booking deps; `CancelBooking`
  (guarded on `published`) remains the only promotion path. New
  `mark-attendance.handler.spec.ts`, 6 tests — the handler had none. `docs/DECISIONS.md`
  → **Absence Does Not Promote**; `docs/DATA_MODEL.md` booking rules corrected (they said
  "cancels or is marked absent"). BE 274/274. Live-proved on the seeded waitlist class:
  present→absent left the waitlisted athlete waitlisted; fixture restored.
  - **Follow-up decision by João:** the waitlist is accepted as **inert from
    `booking_closed` onward**. Since cancellation is the only promotion path and it
    rejects any class past `published`, no seat can be freed once the booking window
    shuts — a waitlisted athlete not promoted by then simply does not get in. Pinned
    with 4 new cases in `cancel-booking.handler.spec.ts` (mutation-checked: relaxing
    the guard to allow `booking_closed` fails them). Explicitly **out of scope**:
    extending cancellation into `booking_closed` (needs a late-cancellation cutoff
    MVP has not defined) and expiring never-promoted `waitlisted` bookings (record
    hygiene, no user-visible effect). Not-telling a waitlisted athlete they didn't
    get in is **accepted** by João, not a gap to fix.
- ✅ **Booking close lead time 30 min → 5 min (2026-08-11)** — decision by João, taken
  once the inert-waitlist window above was quantified: the lead time *is* that window,
  so 30 minutes meant a booked athlete dropping out in the last half hour left their
  seat unusable. `BOOKING_CLOSE_MINUTES_BEFORE_START` in `class-lifecycle.scheduler.ts`
  is now 5. New `class-lifecycle.scheduler.spec.ts` (7 tests, fake timers) — the
  scheduler had **no spec at all**; RED verified at the 6-min boundary before the
  change. `docs/DECISIONS.md` → new **Booking Close Lead Time**;
  `docs/USER_JOURNEYS.md` freeze-time step corrected (it said "e.g. 30 minutes").
  ⚠️ The other 30 is **unrelated and deliberately untouched**:
  `REMINDER_MINUTES_BEFORE` in `notification-reminder.scheduler.ts` is the class-reminder
  lead time, so `profile.tsx`'s "30 minutes before your class starts" copy stays correct.
  Not gym-configurable in MVP. BE 281/281.
- ✅ **Issues Found is now empty of actionable 🐞 cards.** All Phase 3 audit bugs are fixed and sit
  in To Verify awaiting live verification. Membership Plans / Members cards are parked in Backlog
  (deferred post-go-live).
- 🔍 **Owner onboarding follow-up (2026-08-11)** — three items off the newly-wired
  `/gym-setup` route:
  - ✅ **One gym per owner** (`3f4146c`, docs `d5662ac`) — `POST /api/gyms` returns 409 when the
    caller already owns an active gym, checked before the save so no orphan gym is created;
    `resolveGymContext` findOnes ordered for a stable gym per login. See `docs/DECISIONS.md`.
  - ✅ **Wizard correctness** — steps 2/3 block Next on an empty list, the 409 surfaces as
    readable copy, and `GymContext` is now set on submit (without it the owner left setup with
    `currentGymId: null` and every gym-scoped owner screen silently no-oped). New
    `__tests__/gym-setup.test.tsx`, 16 tests.
  - 🔍 **Responsive `adapt` pass** — Impeccable Phase 4, BUILT, awaiting commit go-ahead. See
    `epics/IMPECCABLE_RESTYLE_EPIC.md` → Phase 4.
  - ✅ **Owners are coaches (2026-08-11)** — closes the last dead end: a configured but
    coachless gym could not schedule anything, because `CreateClass` demanded an assigned
    coach and a new gym has none. An active `owner` gym_staff row now satisfies that
    precondition in `create-class`, `edit-class`, and `create-recurring-classes`. Still
    **one `gym_staff` row per user per gym** — no second row, no compound role — so the
    unfiltered `findOne({userId, gymId})` lookups and the single JWT `role` claim stay
    unambiguous. `GET /configuration/coaches` gained `?assignable=true`: the class coach
    picker passes it and gets the owner, the staff-management list does not (it can
    deactivate a row, and an owner must never deactivate their own ownership).
    `ChangeCoachStatus` still filters `role='coach'`. The wizard's closing screen now
    offers "Create Your First Class" again — it is submittable. See `docs/DECISIONS.md`
    → **Owners as Coaches**. BE 264/264, FE 299/299; live-verified against
    `owner.b2@test.local`'s coachless gym.
- ✅ **EPIC: Membership Plans (2026-08-12)** — closes the Phase 2 gym-owner audit
  finding **"Membership Plans feature entirely missing."** Owners can now list plans
  with subscriber counts, assign/change a member's plan, extend expiry, toggle
  per-member auto-renew, and suspend/resume a membership; an hourly scheduler rolls
  or expires plans; the athlete schedule and booking path enforce expiry, live-proved
  end to end. See `epics/MEMBERSHIP_PLANS_EPIC.md` for the full task breakdown.
- ✅ **E2E journeys suite (2026-08-13)** — 15 Playwright journeys covering all three
  roles, each mutation-proved, ~3.3 min serially. The suite owns `crossfit_box_e2e` and
  never touches the dev database. `workers: 1` is settled and measured — see
  `epics/E2E_JOURNEYS.md` and the reasoning in `playwright.config.ts`.
- ✅ **Coach lifecycle control reachable (2026-08-13)** — first of the three coach-side
  gaps the journeys recorded. A manual class transition now accepts the assigned coach
  **or** an active owner of the gym (`docs/DECISIONS.md` → **Owners May Transition Any
  Class**; the owner previously got a 403 from a control their own screen offered), and
  the coach's class screen finally renders the transition badge — until now no coach
  screen led to it at all. Journey 7 rewritten to drive the coach UI. BE 424/424,
  FE 358/358, 15/15 e2e; live-verified at 1280×832 and 390×844.
  The rest of that batch — the coach invite — is closed by the entry below.
- ✅ **Coach invites require acceptance (2026-08-13)** — closes the remaining two coach-side
  gaps the journeys recorded: there was no coach-role invite token in the schema, and an
  invited coach with no account could never log in (the handler minted a `pending` user
  with a random 32-byte password nobody held). `InviteCoachHandler` now creates a
  **pending coach-role invite** and no `gym_staff` row; acceptance writes the staff row and
  returns a re-signed token, so the new coach operates without re-logging in. `invites`
  rows carry a `role`; coach creation is owner-only while the generic invite route stays
  owner-or-coach and always creates an athlete. An invitee with no account registers
  through the link and is returned to it. Owners see, copy and revoke pending coach
  invites on `/coaches`. See `docs/DECISIONS.md` → **Coach Invites Require Acceptance**
  and the design at
  `docs/superpowers/specs/2026-08-13-coach-invite-and-gym-context-design.md`.
  BE 437/437 unit + invite e2e specs rewritten, FE 368/368, `tsc` clean.
  Journey 11 rewritten to drive acceptance and then *save programming* — a coach-side read
  is not evidence about a token's claims on this codebase, only a write is.
  **Still open, now sharper:** no email is ever sent. The owner copying the invite link is
  the whole delivery mechanism — recorded as `epics/EMAIL_SERVICE_EPIC.md`.
- ✅ **Gym context is switchable (2026-08-14)** — the second half of that same design, and the
  resolution of the multi-gym finding recorded under **Auth State** below. `gym_staff` has
  always allowed a coach at several gyms, but the JWT carries exactly one `gymId` and
  `GymOwnershipGuard` compares it to the route — so every gym but the oldest answered 403 in
  every session, forever, and the deterministic login ordering only made that failure
  *stable*. New `POST /api/auth/gym-context` re-signs the token for one named gym the caller
  is attached to (staff beats membership; refuses rather than falling back, so it cannot hand
  back another tenant's context) and `GET /api/me/gyms` lists what they may switch to.
  Frontend: `GymContext.switchGym` posts, adopts the re-signed token, then persists the local
  id; a `GymSwitcher` renders on the coach and athlete surfaces (`coach-classes` and the
  athlete schedule) **only when there are two or more gyms** — a single-gym user sees nothing,
  which is every current user. Deliberate: those are the two screens a multi-gym user actually
  works from. `/schedule-dashboard` has none, so an owner who also coaches elsewhere changes
  context from `/coach-classes`. This supersedes
  the 2026-08-05 note above ("Decision: menu, not a multi-gym switcher"): the menu stays, and
  the switcher sits beside it. Journey 16 proves the switch end to end and is mutation-proved
  on the write, not the read. See `docs/DECISIONS.md` → **Gym Context Is Switchable** for the
  three documented deviations from `COMMAND_MODEL.md`'s `SelectActiveGym` — notably that
  neither endpoint checks `Gym status = active`, recorded as debt needing one pass over both
  endpoints *and* the guards. BE 447/447, FE 379/379, 15/15 e2e, `tsc` clean.

## Previous Phase (2026-05-23)

**EPIC:** Notifications (Epic R) — ✅ COMPLETE (2026-05-23)  
**→ See `epics/NOTIFICATIONS_EPIC.md` for full task breakdown**
- ✅ Backend: Notification entities, service, controller, Expo push service
- ✅ Backend: Event listener (booking.created, waitlist.promoted, class.modified, class.cancelled)
- ✅ Backend: Class reminder scheduler (cron, 30 min before)
- ✅ UX Design: 3 frames in `athlete-screens.pen` (Notifications List, Bell Badge, Preferences)
- ✅ Frontend: useNotifications + usePushToken hooks
- ✅ Frontend: Notifications screen + NotificationBell with badge
- ✅ Frontend: Notification preference toggles in profile
- ✅ Frontend aligned with designs (per-type icon colors, subtitles, dividers)
- Tests: 169 backend + 164 frontend = 333 total

## Previous Phase (2026-05-18)

**EPIC:** Responsive Design — Phase 1 (Epic Q) — ✅ COMPLETE (2026-05-19)  
**→ See `epics/RESPONSIVE_DESIGN_EPIC.md` for full task breakdown**
- ✅ Task #1: UX Design — Coach mobile frames in `coach-screens.pen`
- ✅ Task #2: UX Design — Athlete desktop frames in `athlete-screens.pen`
- ✅ Task #3: Frontend — Coach screens responsive (mobile)
- ✅ Task #4: Frontend — Athlete screens responsive (desktop)

**EPIC:** Responsive Design — Phase 2 (Epic Q cont.) — ✅ COMPLETE (2026-05-19)  
- ✅ Task #5: UX Design — Owner mobile frames in `gym-owner-screens.pen`
- ✅ Task #6: Frontend — Owner screens responsive (mobile)

## Previous Phase (2026-05-07)

**EPIC:** Backend Test Coverage (Epic N) — ✅ COMPLETE (2026-05-07)  
**→ See `epics/BACKEND_TESTS_EPIC.md` for full task breakdown**
- ✅ Task #1: Unit tests — booking & cancellation handlers (21 tests)
- ✅ Task #2: Unit tests — state machine & lifecycle handlers (46 tests)
- ✅ Task #3: Unit tests — guards (GymOwnership, Roles, JWT) (27 tests)
- ✅ Task #4: Unit tests — remaining priority handlers (24 tests)
- ✅ Task #5: Integration tests — results, attendance, programming
- ✅ Task #6: Integration tests — class lifecycle & gym configuration
- ✅ Task #7: Integration tests — invitations & profiles

**EPIC:** Frontend Unit Tests (Epic O) — ✅ COMPLETE (2026-05-11)  
**→ See `epics/FRONTEND_TESTS_EPIC.md` for full task breakdown**
- ✅ Task #1: Jest + React Native Testing Library setup
- ✅ Task #2: Unit tests — auth & API hooks (28/30 pass; 2 expose missing behavior)
- ✅ Task #3: Unit tests — gym & class transition hooks (18 tests)
- ✅ Task #4: Unit tests — schedule & class details logic (35 tests)
- ✅ Task #5: Unit tests — form screens (create/edit class) (25 tests)
- ✅ Task #6: Unit tests — gym settings tabs (25 tests)

**EPIC:** Playwright E2E Suite (Epic P) — ✅ COMPLETE (2026-05-11)  
**→ See `epics/PLAYWRIGHT_EPIC.md` for full task breakdown**
- ✅ Task #1: Playwright setup + auth helpers + DB reset + testIDs
- ✅ Task #2: Athlete flows (5 flows)
- ✅ Task #3: Gym owner flows (9 flows)
- ✅ Task #4: Coach flows (4 flows)
- ✅ Task #5: Cross-role regression flows (lifecycle + waitlist)

## Previous Phase (2026-05-07)

**EPIC:** Codebase Refactor (Epic M) — ✅ COMPLETE (2026-05-07)  
**→ See `epics/REFACTOR_EPIC.md` for full task breakdown**
- ✅ Task #1: Frontend — Design tokens expansion (`theme.ts`)
- ✅ Task #2: Frontend — Styles extraction to `.styles.ts` files
- ✅ Task #3: Frontend — Component decomposition of `gym-settings` + `class-management`
- ✅ Task #4: Backend — GymId ownership guard extraction
- ✅ Task #5: Backend — DTO consolidation + exception factory
- ✅ Task #6: Backend — Class controller decomposition

## Previous Phase (2026-05-05)

**EPIC:** Gym Profile Editing (Epic L) — ✅ COMPLETE (2026-05-06)
**→ See `epics/GYM_PROFILE_EPIC.md` for full task breakdown**
- ✅ Task #1: Backend — `GET` + `PATCH /api/gyms/:gymId/profile`
- ✅ Task #2: UX Design — Gym Profile tab frame in `gym-owner-screens.pen`
- ✅ Task #3: Frontend — Profile tab added to `gym-settings.tsx`

**EPIC:** Athlete Profile (Epic K) — ✅ COMPLETE (2026-05-06)
**→ See `epics/ATHLETE_PROFILE_EPIC.md` for full task breakdown**
- ✅ Task #1: Backend — `GET /api/me` + `PATCH /api/me`
- ✅ Task #2: UX Design — Profile screen frame in `athlete-screens.pen`
- ✅ Task #3: Frontend — `profile.tsx` tab screen replacing `explore` tab

**EPIC:** Revoke Coach Access (Epic J) — ✅ COMPLETE (2026-05-06)
**→ See `epics/REVOKE_COACH_EPIC.md` for full task breakdown**
- ✅ Task #1: UX Design — Coaches frame variant with Deactivate/Reactivate actions
- ✅ Task #2: Frontend — Deactivate/Reactivate buttons in `coaches.tsx`

**EPIC:** Edit & Delete Class (Epic I) — ✅ COMPLETE (2026-05-06)
**→ See `epics/EDIT_CLASS_EPIC.md` for full task breakdown**
- ✅ Task #1: Backend — `PATCH` + `DELETE` `/api/gyms/:gymId/classes/:classId`
- ✅ Task #2: UX Design — Edit Class form frame in `gym-owner-screens.pen`
- ✅ Task #3: Frontend — `edit-class.tsx` + Edit/Delete wiring in Class Management
- ✅ Follow-up fix: coachUserId + spaceId added to ClassScheduleItemDto; Edit Class pickers now pre-fill correctly

**EPIC:** Members List (Epic H) — ✅ COMPLETE (2026-05-06)
**→ See `epics/MEMBERS_EPIC.md` for full task breakdown**
- ✅ Task #1: Backend — `GET /api/gyms/:gymId/members` endpoint
- ✅ Task #2: UX Design — Members screen frame in `gym-owner-screens.pen`
- ✅ Task #3: Frontend — `members.tsx` screen + sidebar nav wiring

**Results panel in Class Management** — ✅ COMPLETE (2026-05-05)
- ✅ UX — `Class Management / Results` frame added to `gym-owner-screens.pen` (node `9ZqYx`)
- ✅ Frontend — Results panel added to `class-management.tsx`; fetches `GET /:classId/results` in parallel with bookings

**EPIC:** Class Lifecycle & Duration (Epic G) — ✅ COMPLETE (2026-05-05)
**→ See `epics/CLASS_LIFECYCLE_EPIC.md` for full task breakdown**
- ✅ Task #1: Backend — Add `duration` field to ClassEntity + migration + all DTOs
- ✅ Task #2: Backend — Lifecycle scheduler (auto-transitions every minute)
- ✅ Task #3: Frontend — Duration field in Create Class + Class Management info card

**EPIC:** Gym Settings (Epic F) — ✅ COMPLETE (2026-05-05)
**→ See `epics/GYM_SETTINGS_EPIC.md` for full task breakdown**
- ✅ Task #1: UX Design — Spaces + Class Types list/form states in `gym-owner-screens.pen`
- ✅ Task #2: Frontend — Gym Settings screen, Spaces tab (CRUD)
- ✅ Task #3: Frontend — Class Types tab (CRUD)
- ✅ Task #4: Frontend — Enable sidebar Settings nav item

**EPIC:** Gym Owner Class Management (Epic E) — ✅ COMPLETE (2026-05-05)
**→ See `epics/CLASS_MANAGEMENT_EPIC.md` for full task breakdown**
- ✅ Task #1: Backend — `GET /api/gyms/:gymId/classes/:classId` + owners can mark attendance/structure
- ✅ Task #2: Frontend — Class Management screen (`app/class-management.tsx`)
- ✅ Task #3: Frontend — Schedule Dashboard class cards navigate to Class Management

**EPIC:** Log Results & Training History (Epic D) — ✅ COMPLETE (2026-05-04)  
**→ See `epics/LOG_RESULTS_EPIC.md` for full task breakdown**  
- ✅ Task #1: Backend — `GET /api/gyms/:gymId/athletes/me/history` endpoint  
- ✅ Task #2: UX Design — Log Results + Training History frames in `athlete-screens.pen`  
- ✅ Task #3: Frontend — Log Results screen (`app/log-results.tsx`)  
- ✅ Task #4: Frontend — Training History tab (`app/(tabs)/training-history.tsx`)  
- ✅ Task #5: Frontend — My Bookings completed cards → Log Results CTA  

**Waitlist UI** — ✅ COMPLETE (2026-05-04)
- ✅ UX design: waitlist state variants added to `designs/athlete-screens.pen` (Class Details State A/B, Schedule full card, My Bookings waitlisted badge)
- ✅ Backend: `waitlistPosition` added to `UserBookingItemDto` (was missing from GET /api/me/bookings)
- ✅ Frontend: waitlist states implemented across Schedule, Class Details, and My Bookings
- ✅ Frontend types regenerated from Swagger

**EPIC:** Invite & Onboarding (Epic C.2) — ✅ COMPLETE (2026-05-03)
- ✅ Task #1: Backend invite endpoints (create, validate, accept, list, revoke)
- ✅ Task #2: UX design — invite acceptance + invite manager screens
- ✅ Task #3: Frontend invite link handler (`/invite/[inviteToken]`)
- ✅ Task #4: Frontend invite manager (owner/coach tab)
- ✅ Task #5: Registration flow pre-fill from invite link

**Previous:** Athlete Screens Redesign (Epic C.1) — ✅ COMPLETE (2026-05-03)

**Previous:** Auth Flows (Epic B) — ✅ COMPLETE (2026-05-03)  
**Previous:** JWT Auth Infrastructure (Epic A) — ✅ COMPLETE (2026-05-03)  
**Previous:** Coach MVP — ✅ COMPLETE (2026-05-03)

## Auth State (Epic B Complete)

### Backend
- `JwtAuthGuard` validates real Bearer tokens (JWT_SECRET from `backend/.env`)
- Dev bypass: `NODE_ENV=development` + no Authorization header → falls back to `x-user-id`/`x-gym-id` headers
- All endpoints protected with JwtAuthGuard + role-based RolesGuard
- `POST /api/auth/login` — public, issues 7-day JWT for valid credentials
- `POST /api/auth/register` — public, creates athlete account and issues JWT (gymId: null, role: null)
- `POST /api/gyms` — 409 if the caller already owns an active gym (one gym per
  owner, see `docs/DECISIONS.md`); gym context resolution is explicitly ordered so
  a multi-gym coach gets the same gym on every login (2026-08-10) — that ordering made the
  *default* stable, and `POST /api/auth/gym-context` (2026-08-14) is what makes the other
  gyms reachable at all
- `POST /api/auth/gym-context` — re-signs the caller's token for one gym they are attached to
  (staff beats membership; 403 otherwise, never a silent fallback to another gym)
- `GET /api/me/gyms` — the gyms this user may act in, staff and membership both
- `CurrentUser` and `CurrentGym` decorators read from JWT claims

### Frontend
- `AuthContext` — manages token, user state, session restore on app start
- `apiClient` — attaches Bearer token to all requests, handles 401 redirects
- Navigation guard — unauthenticated users redirected to `/login`
- Login screen — logs in any role, routes by role (owner/athlete → `/(tabs)/schedule`, coach → `/coach-classes`)
- Register screen — creates new athlete account, routes to `/no-gym`
- No-gym screen — the landing place for any user with no gym: holds athletes until
  invited, and offers "Set Up My Gym" → `/gym-setup` for a new owner
- Gym setup wizard (`/gym-setup`) — 4 steps (basics → spaces → class types →
  review); creates the gym, adopts the re-signed token it returns, sets
  GymContext, then configures spaces and class types. Wired up 2026-08-10
  (previously an orphan route). Steps 2 and 3 require at least one entry each
  (see `docs/DECISIONS.md` → Minimum Gym Configuration); covered by
  `__tests__/gym-setup.test.tsx` (2026-08-11). Responsive `adapt` pass 2026-08-11
  (Impeccable Phase 4): the wizard now draws its own header — the navigator's had
  no back target and sent a deep-linked owner to the athlete surface. The closing
  screen offers "Create Your First Class" (primary) and "Go to My Gym" (quiet):
  owners may coach their own classes, so a coachless new gym can schedule
  immediately (see `docs/DECISIONS.md` → Owners as Coaches)
- Dev bootstrap — three tappable user cards (Owner, Coach, Athlete) with instant login

## Local Environment

- Backend: NestJS on port 3000 (requires `JWT_SECRET` in `backend/.env`)
- Frontend: Expo web on port 8081
- Database: PostgreSQL (seeded with test users: owner@, coach@, athlete@example.com / password123)
- Designs: `/designs/auth-screens.pen`, `/designs/athlete-screens.pen`, `/designs/gym-owner-screens.pen`, `/designs/coach-screens.pen`

## Verified Working Flows (Athlete MVP)

✅ View class schedule (redesigned with Pencil specs: header, date separators, class cards, status badges)  
✅ View class details (redesigned: back nav, meta info with icons, capacity progress bar, programming section)  
✅ Book a class  
✅ View My Bookings (redesigned: toggle filters, booking cards, empty state with Browse Schedule button)  
✅ Cancel booking  
✅ State persists across reload (dev)  
✅ GymContext persists gym ID after login (fixed: athletes now see their gym's classes)

## Verified Working Flows (Gym Owner MVP)

✅ Schedule Dashboard loads with week view  
✅ Week navigation shows classes with correct times  
✅ Coaches screen loads coaches from API  
✅ Invite Coach modal submits and refreshes list  
✅ Sidebar navigation: Schedule ↔ Coaches  
✅ Disabled nav items are muted and non-interactive  

## Verified Working Flows (Coach MVP)

✅ My Assigned Classes screen loads with real coach-scoped data  
✅ Class Details & Programming screen renders class info and fetches existing WOD  
✅ WOD programming can be added and edited via POST  
✅ Mark Attendance screen loads real booked athletes from API  
✅ Navigation: My Classes → Class Details → Mark Attendance  
✅ All 3 CRITICAL cross-tenant class access bugs fixed (gymId scoping on programming, attendance, transition handlers)

## All Active Endpoints

✅ POST /api/auth/login (public — issues JWT)  
✅ POST /api/gyms (any authenticated user)  
✅ POST /gym-configuration/spaces (owner)  
✅ POST /gym-configuration/class-types (owner)  
✅ POST /api/gyms/:gymId/classes (owner)  
✅ POST /api/gyms/:gymId/classes/recurring (owner — generate a recurring class series)  
✅ POST /api/gyms/:gymId/configuration/coaches (owner)  
✅ GET /api/gyms/:gymId/configuration/coaches (owner)  
✅ GET /api/gyms/:gymId/schedule (owner)  
✅ GET /api/gyms/:gymId/coach/classes (coach)  
✅ GET /api/gyms/:gymId/classes/:classId/programming (athlete w/ active membership, coach, or owner)  
✅ POST /api/gyms/:gymId/classes/:classId/programming (coach)  
✅ GET /api/gyms/:gymId/classes/:classId/bookings (coach or owner)  
✅ POST /api/gyms/:gymId/classes/:classId/attendance (coach)  
✅ GET /api/gyms/:gymId/classes/:classId/results (coach or owner — full roster)  
✅ GET /api/gyms/:gymId/classes/:classId/results/me (athlete/coach/owner — caller's own result only)  
✅ POST /api/gyms/:gymId/classes/:classId/transition (coach or owner)  

## Invite Endpoints (Task #1 Complete)

✅ POST /api/gyms/:gymId/invites (owner/coach — creates invite, sends email, returns token + link)
✅ GET /api/invites/:inviteToken (public — validates invite, returns gym name + status)
✅ POST /api/invites/:inviteToken/accept (public — creates membership, returns gym + athlete)

## Known Non-Goals (for now)

- No payments/billing
- No analytics dashboard
- No admin panel

## Deferred Follow-Ups (planned, not yet scheduled)

- **Recurring Class Series — B2 (Series Management):** edit/cancel a series,
  "this & following" cascade, and the UI for it. B1 (create-only) ships the
  `ClassSeries` breadcrumb so B2 needs no migration. See
  `epics/RECURRING_CLASSES_EPIC.md` (Excluded section) — deferred until an owner
  asks for it.

## Verified Working Flows (Waitlist)

✅ Schedule — full class cards show "Full · Waitlist Open" in orange  
✅ Class Details — "JOIN WAITLIST" button at capacity (State A)  
✅ Class Details — "WAITLIST #N – You are #N in line" + "LEAVE WAITLIST" when on waitlist (State B)  
✅ My Bookings — waitlisted cards show "WAITLISTED #N" badge, cancel label shows "Leave Waitlist"  
✅ `waitlistPosition` returned by GET /api/me/bookings and wired into all UI states  

## Verification Complete (2026-05-03)

✅ All endpoints tested and working  
✅ Frontend auth flow works end-to-end  
✅ Dev bootstrap ready for quick testing  
✅ Session persistence working  

Test credentials:
- athlete@example.com / password123
- coach@example.com / password123
- owner@example.com / password123

Resume token: c157441a-ad5b-46b0-b7eb-a0df12c3d445
