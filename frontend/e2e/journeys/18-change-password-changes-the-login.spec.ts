/**
 * Journey 18 — Changing the password changes what gets you back in.
 *
 * The point of this journey is the pair of logins at the end. Everything before
 * them — the profile section opening, the fields filling, the confirmation line
 * appearing — is what the component test in `__tests__/change-password.test.tsx`
 * already covers against a mocked client. What only a real stack can prove is
 * that the new hash was written to the row the login path reads: the old
 * password must stop working and the new one must start, in that order, against
 * a server that was never restarted in between.
 *
 * Two claims that come along for free, and are asserted rather than assumed:
 *
 *  - **The session in hand survives the change.** No token is reissued and
 *    nothing is revoked, so the athlete stays on their profile after updating —
 *    which is why the logout below is an explicit step rather than a redirect
 *    the app performed for us. If the change ever started invalidating sessions,
 *    the confirmation assertion would fail on a page that had bounced to /login.
 *  - **A wrong current password reports as a wrong current password.** The
 *    backend answers 400 there (401 is reserved for missing or invalid *auth*),
 *    and the section maps exactly that status to one sentence. A regression that
 *    made the endpoint 401 would sign the user out mid-form instead of telling
 *    them they mistyped, so the message is checked through the real response.
 *
 * The rejected login is asserted by URL. The login screen has no error testID —
 * a failed sign-in simply stays put — so "still on /login with the form visible"
 * is the strongest available statement that the old password no longer works.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { fillStable, loginAs, tab, visibleTestId } from '../helpers/auth';
import { seedGym } from '../helpers/seed';

const OLD_PASSWORD = 'password123';
const NEW_PASSWORD = 'newpassword456';

/** Opens SECURITY's collapsed form and fills all three fields. */
async function fillChangePassword(
  page: Page,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await visibleTestId(page, 'change-password-open-btn').click();
  await fillStable(page.getByTestId('change-password-current-input'), currentPassword);
  await fillStable(page.getByTestId('change-password-new-input'), newPassword);
  await fillStable(page.getByTestId('change-password-confirm-input'), newPassword);
}

/**
 * Submits credentials and asserts the app did NOT let them in.
 *
 * Deliberately not `loginAs`: that helper waits for the redirect away from
 * /login and would time out here with a message about navigation rather than
 * about the password, naming the wrong failure.
 */
async function expectLoginRejected(
  page: Page,
  user: { email: string },
  password: string,
): Promise<void> {
  await page.goto('/login');
  await fillStable(page.getByTestId('login-email-input'), user.email);
  await fillStable(page.getByTestId('login-password-input'), password);
  await page.getByTestId('login-submit-btn').click();

  // The submit is a real round-trip, so give it time to have redirected if the
  // credentials had been accepted — asserting the URL immediately would pass
  // against a login that was merely still in flight.
  await page.waitForTimeout(3_000);
  await expect(page).toHaveURL(/login/);
  await expect(page.getByTestId('login-submit-btn')).toBeVisible();
}

test('an athlete changes their password and it is the new one that signs them back in', async ({
  page,
}) => {
  const gym = await seedGym('j18-change-password', 1);
  const athlete = gym.athletes[0];

  await loginAs(page, athlete);
  await tab(page, 'tab-profile').click();
  await expect(page).toHaveURL(/profile/);

  // ── A wrong current password is reported, not acted on ────────────────────
  await fillChangePassword(page, 'not-my-password', NEW_PASSWORD);
  await visibleTestId(page, 'change-password-submit-btn').click();
  await expect(page.getByTestId('change-password-error')).toHaveText(
    'That current password is not right.',
  );
  // Still signed in: the rejection was a 400 about the field, not a 401 about
  // the session.
  await expect(page).toHaveURL(/profile/);
  await visibleTestId(page, 'change-password-cancel-btn').click();

  // ── The real change ───────────────────────────────────────────────────────
  await fillChangePassword(page, OLD_PASSWORD, NEW_PASSWORD);
  await visibleTestId(page, 'change-password-submit-btn').click();

  // The form collapses back to its trigger and confirms in quiet meta text —
  // there is no success role in this system, so this line IS the confirmation.
  await expect(page.getByTestId('change-password-confirmation')).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(/profile/);

  // ── What now gets the athlete back in ─────────────────────────────────────
  await visibleTestId(page, 'profile-logout-btn').click();
  await expect(page).toHaveURL(/login/);

  await expectLoginRejected(page, athlete, OLD_PASSWORD);

  await loginAs(page, { email: athlete.email, password: NEW_PASSWORD });
  await expect(page).toHaveURL(/schedule/);
  await tab(page, 'tab-profile').click();
  await expect(page).toHaveURL(/profile/);
  await expect(visibleTestId(page, 'change-password-open-btn')).toBeVisible();
});
