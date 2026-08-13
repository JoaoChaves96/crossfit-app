/**
 * Journey 12 — Config → consequence.
 *
 * The owner adds a space and a class type in settings, and both become things the
 * rest of the product can be built out of. Configuration screens are the easiest
 * place in an app for a write to succeed and reach nothing: the row appears, the
 * owner believes the gym is configured, and the picker that should offer it was
 * reading a list fetched before the row existed.
 *
 * So the journey never asserts "the row is there" on its own. Each write is
 * followed to the place it is supposed to matter:
 *
 *  - the space's row renders under the id the SERVER assigned it (proof the list
 *    refetched rather than replaying what was typed), and it is then offered in
 *    create-class;
 *  - the class type is offered in create-class too — and that is where its claim
 *    stops. A brand-new type belongs to no membership plan, so the Visibility
 *    Rule hides it from every athlete; there is nothing further to observe
 *    without inventing a plan the owner never made.
 *  - the space's CAPACITY is enforced on a class created in it. The capacity
 *    field on the form is left EMPTY on purpose: `CreateClassHandler` resolves
 *    `capacity ?? space.baseCapacity`, so a number typed there would test the
 *    form and prove nothing about the space. Annex holds one athlete, and the
 *    second one is offered the waitlist instead of a booking.
 */
import type { Page } from '@playwright/test';
import { expect, newActorPage, test } from '../fixtures';
import { loginAs, fillStable, visibleTestId } from '../helpers/auth';
import {
  bookClassAsAthlete,
  createClassViaForm,
  openAthleteSchedule,
  openOwnerSection,
  showWeekContaining,
} from '../helpers/actions';
import { expectClassOnAthleteDay, expectOwnerBookingCount } from '../helpers/assert';
import { bookableDay } from '../helpers/dates';
import {
  findClassByDate,
  readClassTypeByName,
  readSpaceByName,
  seedGym,
} from '../helpers/seed';

const SPACE_NAME = 'Annex';
const CLASS_TYPE_NAME = 'Gymnastics';

/**
 * Opens a picker, asserts the label is among its options, and closes it again.
 *
 * The option lookup is scoped to the field's own wrapper because the trigger
 * renders the SELECTED label with the same text — an unscoped `getByText` would
 * pass on a picker that never opened. Closing is a second press on the trigger:
 * the desktop menu is an absolutely-positioned overlay with no Escape handler,
 * so one left open covers the row below it.
 */
async function expectOffered(page: Page, pickerTestId: string, label: string): Promise<void> {
  const trigger = page.getByTestId(pickerTestId);
  const option = trigger.locator('xpath=..').getByText(label, { exact: true });

  await trigger.click();
  await expect(option).toBeVisible();
  await trigger.click();
  await expect(option).toHaveCount(0);
}

test('a new space and class type reach create-class, and the space caps the class', async ({
  page,
  browser,
}) => {
  const gym = await seedGym('j12-config-consequence');
  const [athleteA, athleteB] = gym.athletes;
  const day = bookableDay();

  await loginAs(page, gym.owner);
  await expect(page).toHaveURL(/schedule-dashboard/);

  // ── The owner adds a space that holds exactly one athlete ─────────────────
  await openOwnerSection(page, 'settings');

  await visibleTestId(page, 'settings-tab-spaces').click();
  await visibleTestId(page, 'add-space-btn').click();
  await fillStable(page.getByTestId('space-name-input'), SPACE_NAME);
  await fillStable(page.getByTestId('space-capacity-input'), '1');
  await page.getByTestId('space-form-save-btn').click();

  // The form closes back to the list; waiting on the list's own control is what
  // proves the save resolved rather than merely being submitted.
  await expect(visibleTestId(page, 'add-space-btn')).toBeVisible({ timeout: 20_000 });

  const space = await readSpaceByName(gym, SPACE_NAME);
  expect(space.baseCapacity).toBe(1);
  // Keyed by the server's id: the list is showing what came back, not what was typed.
  await expect(page.getByTestId(`space-edit-btn-${space.id}`)).toBeVisible({ timeout: 20_000 });

  // ── …and a class type ─────────────────────────────────────────────────────
  await visibleTestId(page, 'settings-tab-class-types').click();
  await visibleTestId(page, 'add-class-type-btn').click();
  await fillStable(page.getByTestId('class-type-name-input'), CLASS_TYPE_NAME);
  await page.getByTestId('class-type-form-save-btn').click();
  await expect(visibleTestId(page, 'add-class-type-btn')).toBeVisible({ timeout: 20_000 });

  const classType = await readClassTypeByName(gym, CLASS_TYPE_NAME);
  await expect(page.getByTestId(`class-type-edit-btn-${classType.id}`)).toBeVisible({
    timeout: 20_000,
  });

  // ── Both are offered where they are meant to be used ──────────────────────
  await page.getByTestId('sidebar-nav-schedule').click();
  await expect(page).toHaveURL(/schedule-dashboard/);

  await visibleTestId(page, 'create-class-btn').click();
  await expect(page.getByTestId('create-class-save-btn')).toBeVisible();

  // The class type's whole claim: it is in the picker. Checked by opening the
  // menu and reading it there — scoped to the field's own wrapper, because the
  // trigger renders the selected label with the same text.
  // Each menu is closed again by pressing its own trigger — the toggle the UI
  // actually offers. There is no Escape handler on the desktop register, and the
  // open menu is an absolutely-positioned overlay that covers the rows beneath
  // it, so a menu left open swallows the next picker's click.
  await expectOffered(page, 'create-class-class-type-picker', CLASS_TYPE_NAME);
  await expectOffered(page, 'create-class-space-picker', SPACE_NAME);

  // Back to a single dashboard before the second half. Navigating settings →
  // schedule through the sidebar PUSHES a dashboard rather than returning to the
  // one login landed on, so the grid is mounted twice — and `showWeekContaining`
  // asks for exactly one `day-column-<day>`, which two mounted copies can never
  // satisfy. The reload collapses the stack; it is housekeeping, not a claim.
  await page.goBack();
  await page.reload();
  await expect(visibleTestId(page, 'create-class-btn')).toBeVisible({ timeout: 20_000 });

  // ── A class in Annex, with no capacity of its own ─────────────────────────
  await createClassViaForm(page, {
    date: day,
    time: '09:00',
    classTypeName: gym.classTypes.crossfit.name,
    coachName: gym.coach.name,
    spaceName: SPACE_NAME,
    // capacity deliberately omitted — see the header.
  });

  const cls = await findClassByDate(gym, day);

  // The inherited capacity, read off the owner's own card: one spot, not the
  // 20-spot default the seeded space carries.
  await showWeekContaining(page, day);
  await expectOwnerBookingCount(page, cls.id, 0, space.baseCapacity);

  // ── …and it is enforced ───────────────────────────────────────────────────
  const aActor = await newActorPage(browser);
  try {
    await loginAs(aActor.page, athleteA);
    await openAthleteSchedule(aActor.page);
    await expectClassOnAthleteDay(aActor.page, cls.id, day);
    await bookClassAsAthlete(aActor.page, cls.id);
  } finally {
    await aActor.close();
  }

  const bActor = await newActorPage(browser);
  try {
    await loginAs(bActor.page, athleteB);
    await openAthleteSchedule(bActor.page);
    await bActor.page.getByTestId(`athlete-class-card-${cls.id}`).click();

    // One athlete filled the space. The label is the assertion: the same control
    // serves booking and joining the waitlist, and it only reads JOIN WAITLIST if
    // the class resolved its capacity from Annex.
    const action = bActor.page.getByTestId('book-btn');
    await expect(action).toBeVisible();
    await expect(action).toHaveText(/JOIN WAITLIST/i);
  } finally {
    await bActor.close();
  }

  // The owner sees the space full at its own capacity, not at a default.
  await page.reload();
  await showWeekContaining(page, day);
  await expectOwnerBookingCount(page, cls.id, 1, space.baseCapacity);
});
