/**
 * The `test` every journey imports.
 *
 * Identical to Playwright's, plus one guarantee: a page cannot talk to any API
 * but the e2e one.
 *
 * Import from here, never from '@playwright/test' directly — that is what keeps
 * the guarantee from being opt-in.
 */
import { test as base, expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { e2eApiUrl } from './env';

/**
 * Reroutes every `/api` request to this run's API, whatever origin the bundle
 * was built to call. See `e2eApiUrl()` for which origin that is per target.
 *
 * This is a pin, not a guard, and it is deliberate. The app's API base is
 * inlined into the bundle from `EXPO_PUBLIC_API_BASE_URL`, and Expo resolves
 * that from .env FILES in preference to the environment — verified by
 * experiment, not just by reading @expo/env: with `.env.local` present (it
 * points at a LAN address for device testing), exporting the variable to the
 * dev server does NOT change the bundle, even with Metro's cache cleared. Test
 * mode would skip `.env.local`, but `NODE_ENV=test` stops babel-preset-expo
 * injecting EXPO_ROUTER_APP_ROOT and every bundle fails.
 *
 * So the base URL is treated as what it is — infrastructure, not behaviour —
 * and fixed here. Two things follow, both wanted:
 *
 *  - It cannot silently break. Any origin that is not the e2e API is rewritten,
 *    so a machine whose `.env.local` says something else still runs correctly.
 *  - A write can never reach the DEV database over HTTP, which a SQL-level
 *    guard could not prevent. That database holds hand-seeded manual-test
 *    scenarios no script can rebuild.
 *
 * Only cross-origin `/api` calls are intercepted; Metro's bundle traffic is
 * untouched. A rewrite is deliberately SILENT and does not fail the test: the
 * bundle's base URL varies by machine (`.env.local`), so a rewrite is the normal
 * case here rather than a signal. What must never happen is a request REACHING
 * another origin, and that is what this makes impossible.
 */
function pinApiOrigin(page: Page): void {
  const allowed = e2eApiUrl();
  void page.route(
    (url) => url.pathname.startsWith('/api') && url.origin !== allowed,
    (route) => {
      const original = new URL(route.request().url());
      return route.continue({
        url: `${allowed}${original.pathname}${original.search}`,
      });
    },
  );
}

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    pinApiOrigin(page);
    await use(page);
  },
});

/**
 * A second actor's page, in its own browser context.
 *
 * Multi-role journeys need one actor to act and another to see the consequence.
 * A fresh context — rather than logging out and back in — gives each actor their
 * own storage, so a token from one cannot leak into the other's requests, and
 * the two views can be compared side by side rather than in sequence.
 *
 * The caller owns the returned context and should close it. Carries the same
 * API pin as the default page.
 */
export async function newActorPage(browser: Browser): Promise<{
  page: Page;
  close: () => Promise<void>;
}> {
  const context = await browser.newContext();
  const page = await context.newPage();
  pinApiOrigin(page);

  return { page, close: () => context.close() };
}

export { expect };
