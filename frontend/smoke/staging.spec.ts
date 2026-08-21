/**
 * Post-deploy smoke test: does the DEPLOYED app actually work?
 *
 * The 15 journeys in e2e/ prove the CODE works. They cannot prove the deployed
 * ARTIFACT works, because they never build or upload one — everything between
 * "tests pass" and "the app works at a URL" is invisible to them: the Pages
 * upload, the API origin baked into the bundle, CORS, the certificate, the
 * release-command migration.
 *
 * That gap has already cost a session. Fonts landed under
 * `dist/assets/node_modules/`, Cloudflare Pages silently skips any path with a
 * `node_modules` segment, and because `_redirects` ends in `/* /index.html 200`
 * every `.ttf` came back as 200 WITH HTML — so nothing 404'd. `useFonts` never
 * resolved and the app rendered an empty `#root` forever. The local suite was
 * 15/15 green throughout, and structurally could not have been otherwise.
 *
 * So the four checks below are not a thin version of the journeys. They are the
 * assertions the journeys cannot make, in the order the failures actually
 * happened.
 *
 * Deliberately READ-ONLY and unauthenticated: it writes nothing, needs no
 * seeded user, and never opens a database connection. That is what lets it run
 * against staging's own API without going anywhere near `boxops_staging`'s data
 * — the reason it needs none of the ephemeral-database machinery in
 * `docs/superpowers/plans/2026-08-21-staging-phases-4-6.md` Task 9.
 *
 * Imports from '@playwright/test' directly, NOT from e2e/fixtures.ts. That
 * module's `pinApiOrigin()` rewrites every `/api` call to `e2eApiUrl()`, which
 * off the remote target is `http://localhost:3001` — it would silently redirect
 * this suite away from the deployment it exists to check.
 */
import { expect, test } from '@playwright/test';

/** Assets whose content type is worth checking. The blank-page bug was `.ttf`. */
const ASSET_PATTERN = /\.(ttf|otf|woff2?|png|jpg|jpeg|svg)(\?|$)/i;

/** The four faces `app/_layout.tsx` gates first paint on. */
const FONT_FAMILIES = [
  'HankenGrotesk_400Regular',
  'HankenGrotesk_500Medium',
  'HankenGrotesk_600SemiBold',
  'HankenGrotesk_700Bold',
];

test.describe('deployed staging', () => {
  test('renders the login screen with its fonts, serves every asset as itself, and reaches the API', async ({
    page,
  }) => {
    // ---- collect evidence during the real page load ----------------------

    /** Assets served with an HTML content type — i.e. never uploaded. */
    const htmlAssets: string[] = [];
    page.on('response', (response) => {
      const url = response.url();
      if (!ASSET_PATTERN.test(url)) return;
      const type = response.headers()['content-type'] ?? '';
      if (type.includes('text/html')) htmlAssets.push(`${url} -> ${type}`);
    });

    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      // `OTS parsing error: invalid sfntVersion: 1008813135` was the ONLY clue
      // the blank page gave — 1008813135 is the ASCII of `<!DO`, the start of
      // the HTML that came back in place of a font. Console errors are cheap to
      // collect and that one was worth a whole session.
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));

    await page.goto('/', { waitUntil: 'networkidle' });

    // ---- 1. the app actually rendered ------------------------------------

    // The specific failure was an empty #root, not an exception: React mounted
    // fine and returned null from the font gate. So assert on visible content,
    // which is the only thing that distinguishes the two.
    await expect(page.getByTestId('login-email-input')).toBeVisible();
    await expect(page.getByTestId('login-submit-btn')).toBeVisible();

    // ---- 2. every asset was served as itself, not as the SPA fallback -----

    // Checked BEFORE the font assertion, because this is the root cause and the
    // font check is the symptom. When both break, the useful error is this one.
    expect(
      htmlAssets,
      'Assets served as text/html were never uploaded to Pages — the `/* /index.html 200` ' +
        'rewrite answers 200 for a missing file, so a status code proves nothing. ' +
        'Check for a `node_modules` segment in the exported paths.',
    ).toEqual([]);

    // ---- 3. the fonts parsed, not merely arrived --------------------------

    // The FontFace entries, NOT document.fonts.check(). check() is unusable
    // here and measurably so: against live staging
    // `check('16px "TotallyNotARealFont"')` returns TRUE, because an unknown
    // family resolves to a fallback and the browser reports nothing left to
    // load. It would therefore have PASSED for a font that was never registered
    // — the inverse of what this check is for.
    //
    // The registry is unambiguous instead. A font served as HTML (the blank-page
    // bug) fails OTS parsing, so its FontFace lands in `error`. That is the
    // signature worth asserting on.
    const faces = await page.evaluate(async () => {
      await document.fonts.ready;
      // `forEach` rather than Array.from/spread: FontFaceSet is setlike and does
      // expose forEach, but it is only *iterable* under the `dom.iterable` lib,
      // which this project does not enable. Widening tsconfig for one assertion
      // would be the tail wagging the dog.
      const collected: { family: string; status: string }[] = [];
      document.fonts.forEach((face) => {
        collected.push({ family: face.family, status: face.status });
      });
      return collected;
    });

    expect(
      faces.filter((face) => face.status === 'error'),
      'Fonts that failed to parse — a font served as HTML lands here (OTS parsing error)',
    ).toEqual([]);

    // Registered, which is what proves the bundle wired them up at all.
    const registered = faces.map((face) => face.family);
    for (const family of FONT_FAMILIES) {
      expect(registered, `${family} is not registered with the document`).toContain(family);
    }

    // `unloaded` is NOT a failure: a face is fetched on first use, and the login
    // screen renders no medium-weight text, so HankenGrotesk_500Medium is
    // legitimately unloaded here. Requiring all four would fail on a copy
    // change. But the regular face IS used, so its being loaded proves a real
    // .ttf was fetched and parsed end to end.
    expect(
      faces.find((face) => face.family === 'HankenGrotesk_400Regular')?.status,
      'The regular face is used by this screen, so it must have loaded',
    ).toBe('loaded');

    // ---- 4. a real in-page request reaches the real API ------------------

    // A deliberately-wrong password, submitted through the UI, so the request
    // is a genuine cross-origin fetch from the deployed bundle. That puts DNS,
    // the certificate, the CORS preflight and the origin baked into the bundle
    // all in the path at once.
    //
    // The two branches in app/login.tsx are what make this a real assertion:
    // a 401 renders "Wrong email or password", while a rejected fetch becomes
    // ApiError(0) and renders "Something went wrong". So the SPECIFIC message
    // distinguishes "the API answered" from "the API was unreachable" —
    // asserting merely that some error appeared would pass in both cases, which
    // is the failure worth catching.
    await page.getByTestId('login-email-input').fill('nobody@smoke.invalid');
    await page.getByTestId('login-password-input').fill('definitely-not-the-password');
    await page.getByTestId('login-submit-btn').click();

    await expect(
      page.getByText('Wrong email or password. Please try again.'),
    ).toBeVisible();
    await expect(
      page.getByText('Something went wrong. Please try again.'),
      'The bundle could not reach the API at all — CORS, DNS, the certificate, or ' +
        'the origin baked in at build time.',
    ).toBeHidden();

    // ---- console last: a real failure above is the better error ----------

    // Narrow allow-list, not a disabled check: the point is to catch a NEW
    // error, and two known ones would otherwise make this permanently red.
    // Anything not matched here fails the deploy.
    const expectedConsoleNoise: readonly { pattern: RegExp; why: string }[] = [
      {
        // Caused by check 4 above, on purpose. Asserting "no console errors"
        // while deliberately provoking a 401 would be incoherent.
        pattern: /status of 401/,
        why: "this test's own deliberate wrong-password request",
      },
      {
        // Hydration mismatch between the prerendered HTML and the first client
        // render. Pre-existing on staging and unrelated to deployment health —
        // the app renders and works. Tracked as debt rather than silenced: if
        // it is ever fixed, delete this entry so a regression is caught again.
        pattern: /Minified React error #418/,
        why: 'known static-export hydration mismatch, pre-existing',
      },
    ];

    const unexpectedErrors = consoleErrors.filter(
      (error) => !expectedConsoleNoise.some(({ pattern }) => pattern.test(error)),
    );
    expect(unexpectedErrors, 'Unexpected console errors on the deployed app').toEqual([]);
  });
});
