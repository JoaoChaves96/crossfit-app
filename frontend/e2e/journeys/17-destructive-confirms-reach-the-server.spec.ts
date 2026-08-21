/**
 * Journey 17 — a destructive confirm is answered, and the answer is obeyed.
 *
 * This journey exists because of a bug, and the bug is worth stating precisely so
 * the assertions read as deliberate rather than paranoid.
 *
 * `react-native-web`'s `Alert` export is `class Alert { static alert() {} }` — an
 * empty method. Every settings screen that guarded a destructive action with
 * `Alert.alert(...)` therefore did *nothing at all* on web: no dialog, no
 * request, no console error, and a list that looked unchanged for the honest
 * reason that nothing had changed. An owner could not delete a space, delete a
 * class type, archive a plan or disable a coach, and was told nothing about why.
 *
 * Nothing in the suite caught it. Journey 12 creates a space and a class type and
 * follows each to the picker it should reach — but it never deletes anything, and
 * the jest suites drive the confirm's `onPress` callback directly, which is the
 * one part that was never broken. The gap was not "no test for delete"; it was
 * "no test that presses the button a person presses".
 *
 * So the claim here is deliberately narrow and behavioural: **pressing a
 * destructive control raises a real dialog, and the answer given to that dialog
 * decides whether the server is called.** Three properties, each of which the
 * old code failed:
 *
 *  - a dialog is RAISED. `answerConfirm` fails if none appears, so the no-op
 *    Alert cannot pass by doing nothing quietly.
 *  - DISMISS means no. The row survives and the database is untouched — which
 *    also rules out the opposite regression, a confirm wired to delete first and
 *    ask afterwards.
 *  - ACCEPT means yes, and the write reaches the database.
 *
 * Every outcome is read from Postgres, not just from the list. Spaces and class
 * types are SOFT-deleted, so "gone" is `deletedAt` being stamped; a coach is
 * disabled by flipping `gym_staff.status`. A disappearing row proves the client
 * re-rendered, which is exactly the thing that was never in doubt.
 *
 * The coach case is last and is not redundant: it is the one the bug was found
 * on, and it is asymmetric in a way that let the bug hide. Enable calls
 * `onChangeStatus` directly with no confirm at all, so on web an owner could
 * re-enable a coach but never disable one — half the feature worked, which is
 * why nobody read it as broken.
 */
import type { Dialog, Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { loginAs, visibleTestId } from '../helpers/auth';
import { openOwnerSection } from '../helpers/actions';
import {
  readClassTypeDeletedAt,
  readCoachStaffStatus,
  readSpaceDeletedAt,
  seedGym,
} from '../helpers/seed';

/**
 * How long to wait for the confirm dialog. Short on purpose: the dialog is
 * raised synchronously by `window.confirm` inside the press handler, so it is
 * either there almost immediately or the code never asked for it. A generous
 * timeout here would only slow down the failure this journey is built to catch.
 */
const DIALOG_TIMEOUT_MS = 5_000;

/**
 * Presses something that should confirm, answers the dialog, and returns the
 * message it showed.
 *
 * The listener is registered BEFORE `act()` runs, because `window.confirm`
 * blocks the page's JS until it is answered — attaching afterwards would
 * deadlock. It is removed in a `finally` so a timeout cannot leave a stray
 * handler to swallow the next assertion's dialog.
 *
 * Note what happens without this helper: Playwright auto-DISMISSES dialogs when
 * no listener is attached, so a test that merely clicked Delete and expected the
 * row to vanish would fail against correct code. Answering explicitly is not
 * ceremony; it is the only way to express "the owner said yes".
 */
async function answerConfirm(
  page: Page,
  outcome: 'accept' | 'dismiss',
  act: () => Promise<void>,
): Promise<string> {
  let listener: ((dialog: Dialog) => void) | undefined;

  const answered = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `No confirm dialog appeared within ${DIALOG_TIMEOUT_MS}ms. The control was ` +
            `pressed and nothing asked the owner anything — which is exactly what ` +
            `react-native-web's no-op Alert did. Check that the screen calls ` +
            `showConfirm from utils/alert and not Alert.alert from react-native.`,
        ),
      );
    }, DIALOG_TIMEOUT_MS);

    listener = (dialog: Dialog) => {
      clearTimeout(timer);
      const message = dialog.message();
      const reply = outcome === 'accept' ? dialog.accept() : dialog.dismiss();
      reply.then(() => resolve(message), reject);
    };

    page.once('dialog', listener);
  });

  try {
    await act();
    return await answered;
  } finally {
    if (listener) page.off('dialog', listener);
  }
}

test('a destructive confirm is raised, and dismissing or accepting it decides the write', async ({
  page,
}) => {
  const gym = await seedGym('j17-destructive-confirms');

  await loginAs(page, gym.owner);
  await expect(page).toHaveURL(/schedule-dashboard/);

  await openOwnerSection(page, 'settings');
  await visibleTestId(page, 'settings-tab-spaces').click();

  const spaceRow = page.getByTestId(`space-edit-btn-${gym.space.id}`);
  const spaceDelete = page.getByTestId(`space-delete-btn-${gym.space.id}`);
  await expect(spaceRow).toBeVisible({ timeout: 20_000 });

  // ── Dismiss means no ──────────────────────────────────────────────────────
  // The message is asserted, not just the dialog's existence: a confirm that
  // appears but names the wrong thing is its own bug, and the space's name is
  // the only part of it the owner uses to decide.
  const dismissed = await answerConfirm(page, 'dismiss', async () => {
    await spaceDelete.click();
  });
  expect(dismissed).toContain(gym.space.name);

  // Still listed, and — the part that matters — still live in the database.
  await expect(spaceRow).toBeVisible();
  expect(await readSpaceDeletedAt(gym.space.id)).toBeNull();

  // ── Accept means yes ──────────────────────────────────────────────────────
  const accepted = await answerConfirm(page, 'accept', async () => {
    await spaceDelete.click();
  });
  expect(accepted).toContain(gym.space.name);

  // The row goes because the list refetched; `deletedAt` is what says the server
  // agreed. Both are asserted because either alone has a passing failure mode.
  await expect(spaceRow).toHaveCount(0, { timeout: 20_000 });
  expect(await readSpaceDeletedAt(gym.space.id)).not.toBeNull();

  // ── The same contract on a second screen ──────────────────────────────────
  // Repeated on class types rather than trusting one screen to speak for the
  // rest: the six broken confirms were six independent copies of the same
  // mistake, so one fixed screen is no evidence about another.
  await visibleTestId(page, 'settings-tab-class-types').click();

  const strength = gym.classTypes.strength;
  const typeRow = page.getByTestId(`class-type-edit-btn-${strength.id}`);
  const typeDelete = page.getByTestId(`class-type-delete-btn-${strength.id}`);
  await expect(typeRow).toBeVisible({ timeout: 20_000 });

  const typeMessage = await answerConfirm(page, 'accept', async () => {
    await typeDelete.click();
  });
  expect(typeMessage).toContain(strength.name);

  await expect(typeRow).toHaveCount(0, { timeout: 20_000 });
  expect(await readClassTypeDeletedAt(strength.id)).not.toBeNull();

  // ── The coach case the bug was found on ───────────────────────────────────
  // Not `openOwnerSection`: that helper drives `OwnerSidebar`'s `nav-<key>`, and
  // gym-settings ships its own copy of the shell (`SettingsSidebar`, testIDs
  // `sidebar-nav-<key>`, and a shorter item list). Leaving the settings screen
  // therefore has to speak that screen's language.
  await visibleTestId(page, 'sidebar-nav-coaches').click();
  await expect(page).toHaveURL(/coaches/);

  // The detail panel is opened the way an owner opens it. Disable lives only
  // inside the panel (and inside the mobile card), never on the row itself.
  await visibleTestId(page, `coach-view-${gym.coach.id}`).click();

  const disable = visibleTestId(page, 'coach-disable-btn');
  await expect(disable).toBeVisible({ timeout: 20_000 });
  expect(await readCoachStaffStatus(gym)).toBe('active');

  const coachMessage = await answerConfirm(page, 'accept', async () => {
    await disable.click();
  });
  expect(coachMessage).toContain(gym.coach.name);

  // `PATCH .../configuration/coaches/:coachUserId` was never the broken part —
  // it returned 200 the whole time when called directly. The claim is that
  // pressing Disable now reaches it.
  await expect(async () => {
    expect(await readCoachStaffStatus(gym)).toBe('inactive');
  }).toPass({ timeout: 20_000 });

  // And the panel offers the way back, which is how the asymmetry that hid the
  // bug reads once the confirm works: Enable has no confirm by design.
  await expect(visibleTestId(page, 'coach-enable-btn')).toBeVisible({ timeout: 20_000 });
});
