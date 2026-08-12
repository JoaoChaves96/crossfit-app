import { expect, Page } from '@playwright/test';

/** Anyone `seedGym()` created: owner, coach or athlete. */
export interface Credentials {
  email: string;
  password: string;
}

/**
 * Logs in as a seeded user by navigating to /login, filling credentials,
 * submitting, and waiting for the post-login redirect to settle.
 *
 * Takes the user rather than a role name on purpose. Fixed global accounts
 * (`owner@example.com`) forced one shared gym, which is what made the previous
 * suite order-dependent; every actor now belongs to exactly one journey's gym.
 */
export async function loginAs(page: Page, user: Credentials): Promise<void> {
  const { email, password } = user;

  await page.goto('/login');

  const emailInput = page.getByTestId('login-email-input');
  const passwordInput = page.getByTestId('login-password-input');

  // Expo Web hydrates the SPA after the `load` event. If we fill immediately,
  // the <input> exists but React hasn't attached its onChangeText handler yet,
  // so the value is set on the DOM but never lands in component state — React
  // then resets the field to empty on hydration. `fillStable` retries the fill
  // until the value actually sticks, making login robust to the hydration race.
  await fillStable(emailInput, email);
  await fillStable(passwordInput, password);

  await page.getByTestId('login-submit-btn').click();

  // Wait for the redirect away from /login to confirm authentication succeeded
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
}

/**
 * Resolves a navigation tab by its testID, pinned to the VISIBLE copy.
 *
 * Two reasons the visibility filter is load-bearing, not defensive:
 *
 *  - expo-router's <Tabs> renders the tab bar twice on web (an active and an
 *    inactive layer), so `getByTestId('tab-*')` matches two elements and trips
 *    Playwright strict mode.
 *  - The athlete has two navigation bars sharing one testID namespace: the
 *    bottom tab bar, which `(tabs)/_layout.tsx` sets to `display: none` on
 *    desktop, and DesktopTopNav, which is absent on mobile. At the 1280px
 *    viewport this suite runs at, only the top nav is real — clicking the hidden
 *    bottom tab hangs until the test times out rather than failing fast.
 */
export function tab(page: Page, name: string) {
  return page.getByTestId(name).filter({ visible: true });
}

/**
 * Returns to the (tabs) navigator from a pushed detail route (e.g. class-details).
 *
 * class-details is opened via router.push and lives OUTSIDE the (tabs) group, so
 * while it is on screen the bottom tab bar is not rendered at all — every
 * `tab-*` testID resolves to a `visible:false` element and `tab()` matches zero
 * interactable nodes. Before tapping any bottom tab after visiting a detail
 * screen, go back to the tabs layout and wait for the tab bar to reappear.
 */
export async function backToTabs(page: Page): Promise<void> {
  await page.goBack();
  await tab(page, 'tab-schedule').waitFor({ state: 'visible', timeout: 10_000 });
}

/**
 * Types a value into a React Native Web <TextInput> so it lands in React state.
 *
 * These inputs are *controlled* (value={state} + onChangeText). Playwright's
 * `.fill()` sets the DOM value and fires a single synthetic `input` event, but
 * during Expo Web's post-load hydration the onChangeText handler may not be
 * attached yet — the DOM value is set while React state stays empty, and a
 * `toHaveValue` check passes against the DOM value even though the component
 * never saw the change (so the form submits blank). `pressSequentially` types
 * real per-character key events, which RN Web reliably forwards to
 * onChangeText. We retry until React state (reflected back into value=) matches.
 */
export async function fillStable(
  locator: ReturnType<Page['getByTestId']>,
  value: string,
): Promise<void> {
  await expect(async () => {
    await locator.click();
    await locator.press('ControlOrMeta+a');
    await locator.press('Delete');
    await locator.pressSequentially(value);
    await expect(locator).toHaveValue(value, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}
