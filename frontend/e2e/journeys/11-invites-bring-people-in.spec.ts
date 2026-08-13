/**
 * Journey 11 — an invite turns an outsider into someone who can work in the gym.
 *
 * The whole chain in one test, because the value is in the chain: the owner
 * invites an address that has NO ACCOUNT, the link the UI showed is the link
 * that works, registering through it lands the invitee back on acceptance, and
 * accepting makes them a coach who can immediately operate — no re-login, which
 * is the part the re-signed token buys.
 *
 * The token is read off the screen rather than out of the database: that string
 * is the owner's only delivery mechanism until an email service exists, so it
 * is the seam worth testing.
 */
import { expect, newActorPage, test } from '../fixtures';
import { loginAs, fillStable, visibleTestId } from '../helpers/auth';
import { createClassViaForm, openOwnerSection } from '../helpers/actions';
import { bookableDay } from '../helpers/dates';
import { seedGym, withDb } from '../helpers/seed';

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

/**
 * An address no account exists for.
 *
 * `seedUser` cannot supply this — it registers the account, which is precisely
 * the state this journey needs to NOT exist. The pid and the timestamp keep two
 * runs against the same database from colliding on the users table's unique
 * email once the invitee registers.
 */
function unregisteredEmail(): string {
  return `newcoach-${process.pid}-${Date.now()}@e2e.test`;
}

/**
 * The user id behind an email, once that email has an account.
 *
 * Read from the database because the id only comes into existence when the
 * invitee registers — mid-test, through the UI — and the owner's roster
 * addresses its rows by it (`coach-view-<userId>`). Matching the row on text
 * instead would need a `.first()` on an email the pending row also carried.
 */
async function readUserIdByEmail(email: string): Promise<string> {
  return withDb(async (db) => {
    const res = await db.query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [email]);
    if (res.rowCount !== 1) {
      throw new Error(
        `[j11] Expected exactly one user for ${email}, found ${res.rowCount}. ` +
          `Registering through the invite link is what creates it.`,
      );
    }
    return res.rows[0].id;
  });
}

/**
 * The class the owner just assigned to this coach.
 *
 * Read between creating the class and asserting the coach can see it, so the two
 * causes of an empty coach list are told apart: the form never wrote a row, or it
 * wrote one the coach cannot reach. Without this split, one assertion carries the
 * blame for both — which is what made an observed intermittent failure here
 * impossible to read.
 */
async function readAssignedClassId(gymId: string, coachUserId: string): Promise<string> {
  return withDb(async (db) => {
    const res = await db.query<{ id: string }>(
      `SELECT id FROM classes
       WHERE "gymId" = $1 AND "coachUserId" = $2 AND "deletedAt" IS NULL`,
      [gymId, coachUserId],
    );
    if (res.rowCount !== 1) {
      throw new Error(
        `[j11] Expected exactly one class assigned to the new coach, found ${res.rowCount}. ` +
          `The owner's create-class form is what writes it, so this failing means creation ` +
          `did not happen — not that the coach cannot see their class.`,
      );
    }
    return res.rows[0].id;
  });
}

test('an invited stranger registers, accepts, and works as a coach', async ({ page, browser }) => {
  const gym = await seedGym('j11-invite-coach');
  const inviteeEmail = unregisteredEmail();
  const inviteeName = `Nia Ferreira ${process.pid}`;

  await loginAs(page, gym.owner);
  await openOwnerSection(page, 'coaches');

  // The gym starts with exactly one coach, and the invited address is nowhere on
  // the screen. Asserted before the invite so everything that follows is the
  // invite's doing rather than the fixture's.
  await expect(page.getByText(gym.coach.email)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(inviteeEmail)).toHaveCount(0);

  // ── The owner invites an address with no account ──────────────────────────
  await page.getByTestId('invite-coach-btn').click();
  await fillStable(page.getByTestId('invite-coach-email-input'), inviteeEmail);
  await page.getByTestId('modal-confirm-btn').click();

  // The link the owner would send, read off the screen — no email is delivered,
  // so this string is the whole mechanism. Taking the token from the database
  // instead would skip it.
  const linkText = page.getByTestId('coach-invite-link-text');
  await expect(linkText).toBeVisible({ timeout: 20_000 });
  const inviteToken = tokenFromLink((await linkText.innerText()) ?? '');

  // The confirm button is now 'Done'; closing the modal uncovers the roster.
  await page.getByTestId('modal-confirm-btn').click();
  await expect(linkText).toHaveCount(0);

  // ── Nobody is a coach yet ─────────────────────────────────────────────────
  // A pending row for this token is the positive anchor; the roster still
  // holding exactly one coach row is the absence that matters. An owner cannot
  // make someone staff unilaterally any more.
  await expect(page.getByTestId(`pending-invite-row-${inviteToken}`)).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId(/^coach-view-/)).toHaveCount(1);

  const inviteeActor = await newActorPage(browser);
  try {
    const coach = inviteeActor.page;

    // ── The invitee opens the link, signed out and account-less ─────────────
    await coach.goto(`/invite/${inviteToken}`);

    // Both facts came from the token alone: nothing else told this browser which
    // gym, which role, or which address.
    await expect(coach.getByText(`Coach at ${gym.name} on CrossFit Box`)).toBeVisible({
      timeout: 20_000,
    });
    await expect(coach.getByText(inviteeEmail)).toBeVisible();

    // ── …is sent to register, with the invited address fixed ───────────────
    await coach.getByTestId('invite-join-btn').click();
    await expect(coach).toHaveURL(/register/, { timeout: 20_000 });
    // Prefilled from the invite, not typed: an invite accepted by a different
    // address than it was issued to would be a different person joining.
    await expect(coach.getByTestId('register-email-input')).toHaveValue(inviteeEmail);

    await fillStable(coach.getByTestId('register-name-input'), inviteeName);
    await fillStable(coach.getByTestId('register-password-input'), 'password123');
    await coach.getByTestId('register-submit-btn').click();

    // ── …and is returned to acceptance to finish the job ───────────────────
    // Pinned to the visible copy: registering was a pushed route over the
    // acceptance screen, so the first instance is still mounted underneath.
    await expect(coach).toHaveURL(new RegExp(`invite/${inviteToken}`), { timeout: 20_000 });
    const joinBtn = visibleTestId(coach, 'invite-join-btn');
    await expect(joinBtn).toBeVisible({ timeout: 20_000 });
    await joinBtn.click();

    // The coach's own home, reached with NO login step anywhere in this test.
    // That absence is the re-signed token under test: the token this browser
    // arrived with carried no gym and no role.
    await expect(coach).toHaveURL(/coach-classes/, { timeout: 20_000 });

    // ── The owner now has a coach, not an invitee ─────────────────────────
    // Reloaded rather than re-navigated through the sidebar: the sidebar pushes
    // a second copy of the screen and leaves the first mounted, so the stale
    // pending row would satisfy the very assertion that says it is gone.
    await page.reload();
    const inviteeUserId = await readUserIdByEmail(inviteeEmail);
    const coachRow = page.getByTestId(`coach-view-${inviteeUserId}`);
    await expect(coachRow).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(inviteeName)).toBeVisible();
    await expect(page.getByTestId(`pending-invite-row-${inviteToken}`)).toHaveCount(0);

    // ── …and can put them on a class ─────────────────────────────────────
    // The picker only offers active coaches of this gym, so choosing them by the
    // name they registered under is itself the assignability claim.
    const day = bookableDay();
    // Sidebar key, not route: the Schedule item points at `/schedule-dashboard`.
    await openOwnerSection(page, 'schedule');
    await createClassViaForm(page, {
      date: day,
      time: '06:30',
      classTypeName: gym.classTypes.crossfit.name,
      coachName: inviteeName,
      spaceName: gym.space.name,
      capacity: 6,
    });

    // ── …and the assignment reaches them ────────────────────────────────
    // Creation is confirmed before switching browsers, so an empty list below is
    // unambiguously the coach's side of it.
    const classId = await readAssignedClassId(gym.id, inviteeUserId);

    await coach.goto('/coach-classes');
    // Named by id, so this asserts the coach sees THAT class and not merely some
    // row; the regex count then rules out extras.
    const row = coach.getByTestId(`coach-class-row-${classId}`);
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(coach.getByTestId(/^coach-class-row-/)).toHaveCount(1);
    await expect(row).toContainText(gym.classTypes.crossfit.name);

    await coach.getByTestId(`coach-class-view-btn-${classId}`).click();
    // Programming is a coach-only surface, so its presence is the permission
    // check: they are not merely listed, they are operating as this class's coach.
    await expect(coach.getByTestId('programming-wod-input')).toBeVisible({ timeout: 20_000 });

    // …and they can actually WRITE, which is the part that needs the re-signed
    // token. Seeing the form proves nothing about the claims: the coach class
    // list is authorized from `gym_staff` in the database and mounts no
    // GymOwnershipGuard, so it works with the stale registration token too.
    // Saving posts to /api/gyms/:gymId/classes/:classId/programming, which does
    // mount that guard and compares the route's gym against the token's own
    // `gymId` claim — null on a token minted before acceptance. Without the
    // re-sign this is a 403 and the `Saved` marker never appears.
    // `fillStable` rather than `.fill()`: the input is controlled and a DOM-only
    // value never reaches React state, so the save would post the previous
    // content and pass while proving nothing (journey 8 hit exactly that).
    await fillStable(coach.getByTestId('programming-wod-input'), '21-15-9 thrusters');
    await coach.getByTestId('programming-save-btn').click();
    await expect(coach.getByText('Saved')).toBeVisible({ timeout: 20_000 });

    // ── The token is spent ──────────────────────────────────────────────
    // An acceptance link that still works after acceptance is a link that can be
    // passed on. Re-opening it now reports the invite as used, by name.
    await coach.goto(`/invite/${inviteToken}`);
    await expect(coach.getByText('This invite has already been accepted')).toBeVisible({
      timeout: 20_000,
    });
    await expect(coach.getByTestId('invite-join-btn')).toHaveCount(0);
  } finally {
    await inviteeActor.close();
  }
});
