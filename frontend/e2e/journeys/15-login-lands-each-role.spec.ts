/**
 * Journey 15 — Login lands each role on its own home; logout clears the session.
 *
 * One journey, three roles, in one browser context because that is what makes
 * the second half meaningful: each role's logout is what returns the page to
 * /login for the next role's login, so a logout that only changed the route
 * would be caught by the login that follows it.
 *
 * Each landing is asserted twice over — by URL *and* by a control only that
 * role's home renders. A URL alone passes on a screen that rendered an error
 * state, which is precisely the failure this journey should catch: three roles
 * whose homes all "load" and one of them showing nothing.
 *
 * Two claims beyond the landing itself:
 *
 *  - **The session survives a reload.** Each role refreshes on its own home and
 *    must still be there. The token lives in localStorage and is read back
 *    asynchronously, so on a refresh the router briefly knows nothing about the
 *    user — the race that put an authenticated athlete on /login (fixed in the
 *    app-resume/token batch) is only visible on a real page load.
 *  - **Logout clears storage, not just the route.** After logging out, a RELOAD
 *    must still show /login. `router.replace('/login')` alone satisfies "we are
 *    on the login screen"; only the refresh distinguishes that from a token
 *    still sitting in storage waiting to be rehydrated.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { loginAs, tab, visibleTestId } from '../helpers/auth';
import { seedClass, seedGym } from '../helpers/seed';

/**
 * The session is gone, not merely navigated away from.
 *
 * Asserted after EVERY logout rather than once at the end, and the reload is the
 * reason. `router.replace('/login')` satisfies "we are on the login screen" even
 * with the token still in storage — and a token that survived would then be
 * rehydrated on the next page load and redirect the *following* login away from
 * the form. That surfaces as "could not type into the email field", which reads
 * like a hydration flake and names nothing. Checked here, the same defect fails
 * on the claim it actually breaks.
 */
/**
 * Reloads a signed-in screen and asserts the app never passed THROUGH /login.
 *
 * The "never" is the whole assertion, and it needs the navigation history rather
 * than a URL check, because the race is self-healing: the root guard bounces an
 * apparently-signed-out visitor to /login, and login's own already-authenticated
 * guard then bounces them back to their role home. The URL settles correctly
 * either way, so `toHaveURL` passes with the guard in `app/_layout.tsx` deleted —
 * verified, not assumed. What the user sees is a flash of the login screen on
 * every refresh, and the only place that is visible is the path history.
 */
async function expectReloadKeepsSession(page: Page, home: RegExp): Promise<void> {
  const visited: string[] = [];
  const record = (frame: { url(): string; parentFrame(): unknown }) => {
    if (frame.parentFrame() === null) visited.push(new URL(frame.url()).pathname);
  };
  page.on('framenavigated', record);
  try {
    await page.reload();
    await expect(page).toHaveURL(home);
  } finally {
    page.off('framenavigated', record);
  }

  expect(
    visited.filter((p) => p.includes('login')),
    `Reloading a signed-in screen routed through ${visited.join(' → ')}. ` +
      `The token is read from storage asynchronously, so a guard that treats ` +
      `"still loading" as "signed out" sends the user to /login and only lands them ` +
      `back home once the token arrives — a login flash on every refresh. ` +
      `See the auth.isLoading guard in app/_layout.tsx.`,
  ).toEqual([]);
}

async function expectSignedOut(page: Page): Promise<void> {
  await expect(page).toHaveURL(/login/);
  await page.reload();
  await expect(page).toHaveURL(/login/);
  await expect(page.getByTestId('login-submit-btn')).toBeVisible({ timeout: 20_000 });
}

test('each role lands on its own home, survives a reload, and logout clears the session', async ({
  page,
}) => {
  const gym = await seedGym('j15-login-lands-each-role');
  // The athlete's home is a list, so its anchor has to be something on it: a
  // published class they are eligible for. `seedGym` puts every athlete on the
  // plan that covers both class types.
  const cls = await seedClass({ gym });

  // ── The owner ─────────────────────────────────────────────────────────────
  await loginAs(page, gym.owner);
  await expect(page).toHaveURL(/schedule-dashboard/);
  await expect(visibleTestId(page, 'create-class-btn')).toBeVisible();

  await expectReloadKeepsSession(page, /schedule-dashboard/);
  await expect(visibleTestId(page, 'create-class-btn')).toBeVisible({ timeout: 20_000 });

  await visibleTestId(page, 'nav-logout').click();
  await expectSignedOut(page);

  // ── The coach ─────────────────────────────────────────────────────────────
  await loginAs(page, gym.coach);
  await expect(page).toHaveURL(/coach-classes/);
  await expect(visibleTestId(page, 'coach-class-list')).toBeVisible();

  await expectReloadKeepsSession(page, /coach-classes/);
  await expect(visibleTestId(page, 'coach-class-list')).toBeVisible({ timeout: 20_000 });

  await visibleTestId(page, 'nav-logout').click();
  await expectSignedOut(page);

  // ── The athlete ───────────────────────────────────────────────────────────
  await loginAs(page, gym.athletes[0]);
  await expect(page).toHaveURL(/schedule/);
  await expect(page.getByTestId(`athlete-class-card-${cls.id}`)).toBeVisible({ timeout: 20_000 });

  await expectReloadKeepsSession(page, /schedule/);
  await expect(page.getByTestId(`athlete-class-card-${cls.id}`)).toBeVisible({ timeout: 20_000 });

  // The athlete signs out from their profile rather than a sidebar — the only
  // role whose logout is not in the nav.
  await tab(page, 'tab-profile').click();
  await expect(page).toHaveURL(/profile/);
  await visibleTestId(page, 'profile-logout-btn').click();
  await expectSignedOut(page);

  // The entry route agrees: with no session, `/` forwards to login rather
  // than to whichever home the last user had.
  await page.goto('/');
  await expect(page).toHaveURL(/login/);
  await expect(page.getByTestId('login-submit-btn')).toBeVisible({ timeout: 20_000 });
});
