/**
 * Journey 13 — Owner creates a weekly series → N classes land on the CORRECT N days.
 *
 * The one journey where the calendar-date seam has the most room to hide. A
 * single class is one date the owner typed and one date rendered back; a series
 * is a date range and a set of weekday NUMBERS expanded into days by code, so a
 * shift can come from the rule, from the write, or from the read, and each shows
 * up as "the classes are all one day early" rather than as an error.
 *
 * Three claims, in the order they can fail:
 *
 *  1. The rule produced the right DAYS — read back as `to_char` calendar days,
 *     and no extra day (`readGymClassDays`, not four `findClassByDate` calls:
 *     "on the right days" and "and nowhere else" are different assertions).
 *  2. The owner SEES a card on each of those columns, across the two weeks the
 *     series spans. A series that renders correctly only in the current week
 *     would prove very little, so the range deliberately crosses a boundary.
 *  3. Re-submitting the identical rule creates NOTHING. `expandOccurrences`
 *     skips past and exact-duplicate occurrences silently, and the notice is the
 *     only surface that says so — an owner who repeats a series must not quietly
 *     double every class.
 *
 * Note on where the count is asserted: on success the form calls `router.back()`
 * and the notice is never shown, so `created` is only ever legible on screen in
 * the created-nothing case. Claim 3 is therefore also the only assertion the
 * notice itself gets.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { loginAs, visibleTestId } from '../helpers/auth';
import { fillDateField, fillTimeField, selectOption, showWeekContaining } from '../helpers/actions';
import { expectClassInDayColumn } from '../helpers/assert';
import { daysFromToday, weekdayNumber, type CalendarDay } from '../helpers/dates';
import { findClassByDate, readGymClassDays, seedGym, type SeededGym } from '../helpers/seed';

/**
 * Fills the recurring half of the create-class form and submits.
 *
 * Lives in the spec rather than in `actions.ts`: journey 13 is the only journey
 * that creates a series, and it is this flow's own assertions that the journey
 * is made of. It returns nothing — what happened next is the journey's claim,
 * not this function's.
 */
async function submitSeries(
  page: Page,
  gym: SeededGym,
  rule: { startDate: CalendarDay; endDate: CalendarDay; weekdays: number[]; time: string },
): Promise<void> {
  // The visible copy: arriving at the dashboard a second time leaves the first
  // instance mounted but hidden, and the hidden button can never be pressed.
  await visibleTestId(page, 'create-class-btn').click();
  await expect(page.getByTestId('create-class-save-btn')).toBeVisible();

  await page.getByTestId('create-class-mode-recurring').click();
  // Start/end date fields only exist in recurring mode, so their appearance is
  // what proves the mode actually switched.
  await expect(page.getByTestId('create-class-start-date-input')).toBeVisible();

  await fillDateField(page, 'create-class-start-date-input', rule.startDate);
  await fillDateField(page, 'create-class-end-date-input', rule.endDate);
  await fillTimeField(page, 'create-class-time-input', rule.time);

  // The chips carry no value to read back, and their selected state is not the
  // journey's claim: a chip that failed to register produces the wrong DAYS,
  // which is what the assertions downstream are for.
  for (const weekday of rule.weekdays) {
    await page.getByTestId(`create-class-weekday-${weekday}`).click();
  }

  await selectOption(page, 'create-class-class-type-picker', gym.classTypes.crossfit.name);
  await selectOption(page, 'create-class-coach-picker', gym.coach.name);
  await selectOption(page, 'create-class-space-picker', gym.space.name);

  // Capacity is left empty on purpose: the series should inherit the space's
  // base capacity, and an explicit number here would hide it.
  await page.getByTestId('create-class-save-btn').click();
}

test('owner creates a weekly series and every occurrence lands on the right day', async ({
  page,
}) => {
  const gym = await seedGym('j13-recurring-series');

  // Two weekdays, and a range that catches each of them TWICE — the second
  // occurrence of the first weekday is 7 days on, which is what puts the series
  // across a week boundary on the dashboard.
  const first = daysFromToday(3);
  const second = daysFromToday(5);
  const startDate = first;
  const endDate = daysFromToday(12);
  const weekdays = [weekdayNumber(first), weekdayNumber(second)];
  const expectedDays = [first, second, daysFromToday(10), daysFromToday(12)].sort();
  const time = '09:00';

  await loginAs(page, gym.owner);
  await expect(page).toHaveURL(/schedule-dashboard/);

  await submitSeries(page, gym, { startDate, endDate, weekdays, time });

  // Success returns to the dashboard. Waiting on its own control is what proves
  // the create call resolved rather than silently failed on the form.
  await expect(page.getByTestId('create-class-save-btn')).toHaveCount(0, { timeout: 20_000 });

  // ── Claim 1: the right days, and no others ────────────────────────────────
  expect(await readGymClassDays(gym)).toEqual(expectedDays);

  // ── Claim 2: the owner sees a card on each of those columns ───────────────
  // Ascending, so the week walk is always forwards from where the dashboard sits.
  for (const day of expectedDays) {
    const cls = await findClassByDate(gym, day);
    await showWeekContaining(page, day);
    await expectClassInDayColumn(page, cls.id, day);
  }

  // ── Claim 3: the same rule again creates nothing ──────────────────────────
  // Back to the current week first: the form is reached from the dashboard, and
  // leaving the view two weeks out is state the next step should not inherit.
  // A reload rather than a `goto`, which would re-run the token rehydrate the
  // dashboard is already past (that race is journey 15's subject, not this one).
  await page.reload();
  await submitSeries(page, gym, { startDate, endDate, weekdays, time });

  const notice = page.getByTestId('create-class-recurring-notice');
  await expect(notice).toBeVisible({ timeout: 20_000 });
  await expect(notice).toContainText('No classes were created');
  await expect(notice).toContainText(`${expectedDays.length} skipped (already scheduled)`);

  // The owner is kept on the form to adjust the rule — and, the load-bearing
  // half, nothing was written.
  await expect(page.getByTestId('create-class-save-btn')).toBeVisible();
  expect(await readGymClassDays(gym)).toEqual(expectedDays);
});
