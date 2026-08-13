/**
 * Journey 11 — an invite turns an outsider into someone who can work in the gym.
 *
 * The epic asks for one journey: "owner invites → coach opens the invite link
 * and accepts → appears active → is assignable as coach on a new class". Reading
 * the product, that sentence spans TWO mechanisms that do not meet:
 *
 *  - **Inviting a coach** (`InviteCoachHandler`, owner's Coaches screen) has no
 *    token, no link and no acceptance step at all. It writes a `gym_staff` row
 *    with `status = 'active'` immediately; the email is a TODO in the handler.
 *  - **The token-in-URL flow** (`InviteService` → `/invite/<token>` → accept)
 *    creates a `gym_membership` — an ATHLETE. There is no coach-role invite
 *    token anywhere in the schema.
 *
 * So a single test matching the epic's wording could only be written by
 * inventing behaviour. Instead each real mechanism gets the test the epic wanted
 * it to have, and the mismatch is recorded in the epic as a finding.
 *
 *  1. **The coach invite** — owner invites an existing account by email; that
 *     person becomes an active coach, is offered by the class form's coach
 *     picker, and — the part no unit test reaches — can then open the class from
 *     their own Coach Classes screen. "Assignable" is only worth asserting if
 *     the assignment actually reaches the assignee.
 *  2. **The athlete invite link** — owner generates the link, and the token is
 *     taken from the LINK THE UI SHOWED, not from the database, because the
 *     token travelling correctly through that string is the seam under test.
 *     The invitee opens the URL, reads who invited them, joins, and shows up in
 *     the owner's member list.
 *
 * Both invitees are pre-registered accounts (`seedUser`). That is deliberate for
 * the coach case: inviting an address with no account creates a `pending` user
 * with a random 32-byte password nobody holds, so a brand-new coach cannot log
 * in — a gap recorded in the epic rather than papered over here.
 */
import { expect, newActorPage, test } from '../fixtures';
import { loginAs, fillStable, visibleTestId } from '../helpers/auth';
import { createClassViaForm, openOwnerSection } from '../helpers/actions';
import { bookableDay } from '../helpers/dates';
import { seedGym, seedUser } from '../helpers/seed';

/**
 * The token out of a generated invite link.
 *
 * The link is absolute and built from the backend's `FRONTEND_URL` — in e2e that
 * is production's host, which the suite must never open. Taking the token and
 * navigating relative keeps the request on the pinned local origin while still
 * proving the token in the string is the one that works.
 */
function tokenFromLink(link: string): string {
  const token = link.trim().split('/invite/')[1];
  if (!token) {
    throw new Error(`[j11] Invite link did not contain an /invite/<token> path: "${link}"`);
  }
  return token;
}

test('an invited coach becomes assignable, and the class reaches them', async ({
  page,
  browser,
}) => {
  const gym = await seedGym('j11-invite-coach');
  // A real account the gym has never heard of — the state an invite exists to
  // change. Their name is what the coach picker will have to offer.
  const newCoach = await seedUser('newcoach', 'Dana Reyes');

  await loginAs(page, gym.owner);
  await openOwnerSection(page, 'coaches');

  // The gym starts with exactly one coach, and it is not Dana. Asserted before
  // the invite so the row appearing later is the invite's doing.
  await expect(page.getByText(gym.coach.email)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(newCoach.email)).toHaveCount(0);

  // ── The owner invites them by email ───────────────────────────────────────
  await page.getByTestId('invite-coach-btn').click();
  await fillStable(page.getByTestId('invite-coach-email-input'), newCoach.email);
  await page.getByTestId('modal-confirm-btn').click();

  // Active immediately: there is no pending state for a coach invite. The row
  // carries the *existing* account's name, which is how we know the handler
  // matched the email to Dana instead of creating a second placeholder user.
  const coachRow = page.getByTestId(`coach-view-${newCoach.id}`);
  await expect(coachRow).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(newCoach.email)).toBeVisible();
  await expect(page.getByText(newCoach.name)).toBeVisible();
  await coachRow.click();
  await expect(page.getByText('Disable')).toBeVisible();

  // ── …and can now put them on a class ─────────────────────────────────────
  // The picker only offers active coaches of this gym, so choosing Dana by name
  // is itself the assignability claim — `selectOption` fails if she is not there.
  const day = bookableDay();
  // Sidebar key, not route: the Schedule item points at `/schedule-dashboard`.
  await openOwnerSection(page, 'schedule');
  await createClassViaForm(page, {
    date: day,
    time: '06:30',
    classTypeName: gym.classTypes.crossfit.name,
    coachName: newCoach.name,
    spaceName: gym.space.name,
    capacity: 6,
  });

  // ── …and the assignment reaches Dana herself ─────────────────────────────
  // A separate session, a separate role, a separate screen: the class the owner
  // just created is on the new coach's own list, and she can open it. This is
  // the half that proves the invite produced a working coach and not just a row.
  const coachActor = await newActorPage(browser);
  try {
    const coach = coachActor.page;
    await loginAs(coach, newCoach);
    await coach.goto('/coach-classes');

    const row = coach.getByTestId(/^coach-class-row-/);
    await expect(row).toHaveCount(1, { timeout: 20_000 });
    await expect(row).toContainText(gym.classTypes.crossfit.name);

    await coach.getByTestId(/^coach-class-view-btn-/).click();
    // Programming is a coach-only surface, so its presence is the permission
    // check: Dana is not merely listed, she is operating as this class's coach.
    await expect(coach.getByTestId('programming-wod-input')).toBeVisible({ timeout: 20_000 });
  } finally {
    await coachActor.close();
  }
});

test('the invite link the owner generates is the link that joins the gym', async ({
  page,
  browser,
}) => {
  const gym = await seedGym('j11-invite-athlete');
  const invitee = await seedUser('invitee', 'Sam Okafor');

  await loginAs(page, gym.owner);
  await openOwnerSection(page, 'invites');

  await page.getByTestId('create-invite-btn').click();
  await fillStable(page.getByTestId('invite-email-input'), invitee.email);
  await page.getByTestId('invite-send-btn').click();

  // The link is read off the screen — the owner's only way to pass it on, since
  // the invite email is not implemented. Reading it from the database instead
  // would skip the string the owner would actually send.
  const linkText = page.getByTestId('invite-link-text');
  await expect(linkText).toBeVisible({ timeout: 20_000 });
  const inviteToken = tokenFromLink((await linkText.innerText()) ?? '');

  const inviteeActor = await newActorPage(browser);
  try {
    const s = inviteeActor.page;
    await loginAs(s, invitee);

    // ── The invitee opens the link ──────────────────────────────────────────
    await s.goto(`/invite/${inviteToken}`);

    // The screen states who is inviting whom before offering the action, and
    // those facts came from the token alone — nothing else identified the gym.
    await expect(s.getByText("You've been invited!")).toBeVisible({ timeout: 20_000 });
    await expect(s.getByText(`Join ${gym.name} on CrossFit Box`)).toBeVisible();
    await expect(s.getByText(invitee.email)).toBeVisible();
    await expect(s.getByText(`${gym.owner.name} (Gym Owner)`)).toBeVisible();

    // ── …and joins ─────────────────────────────────────────────────────────
    await s.getByTestId('invite-join-btn').click();
    // Accepting lands them inside the app as a member of that gym; the schedule
    // tab is the app's own confirmation that they now have a gym context at all.
    await expect(s).toHaveURL(/schedule/, { timeout: 20_000 });
    await expect(visibleTestId(s, 'tab-schedule')).toBeVisible();

    // ── The token is spent ─────────────────────────────────────────────────
    // A join link that still works after joining is a join link that can be
    // shared. Re-opening it now reports the invite as used, by name.
    await s.goto(`/invite/${inviteToken}`);
    await expect(s.getByText('This invite has already been accepted')).toBeVisible({
      timeout: 20_000,
    });
    await expect(s.getByTestId('invite-join-btn')).toHaveCount(0);

    // ── And the owner sees a member, not an invitee ─────────────────────────
    await openOwnerSection(page, 'members');
    await fillStable(page.getByTestId('members-search-input'), invitee.email);
    // The list, filtered to the search, holds exactly one person and it is Sam.
    // Addressed by row rather than by text: the mobile card and the desktop row
    // are both mounted, so a bare email lookup matches twice and says nothing
    // about which list it found them in.
    const memberRow = page.getByTestId(/^member-row-[0-9a-f-]{36}$/);
    await expect(memberRow).toHaveCount(1, { timeout: 20_000 });
    await expect(memberRow).toContainText(invitee.name);
    await expect(memberRow).toContainText(invitee.email);
  } finally {
    await inviteeActor.close();
  }
});
