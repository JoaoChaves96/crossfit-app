/**
 * UI flows more than one journey performs.
 *
 * The rule for what belongs here: a sequence of clicks that is *incidental* to
 * the journey asserting it. Journey 1 tests that creating a class works, so it
 * owns that flow's assertions — but journeys 5, 7 and 9 all need a class to
 * exist and do not care how the form behaves, so the mechanics live here once.
 *
 * These functions navigate and act. They do not assert outcomes: that is
 * assert.ts, and keeping the split means a journey's failure message always
 * points at the journey's own claim.
 */
import { expect, type Locator, type Page } from '@playwright/test';
import { fillStable, tab } from './auth';
import type { CalendarDay } from './dates';

// ── Primitives ───────────────────────────────────────────────────────────────

/**
 * Sets a Clean Ink DateTimeField (web renders a real `<input type="date">`).
 *
 * `fill()`, not `fillStable()`: a date input is not a controlled RN TextInput,
 * it takes a whole `YYYY-MM-DD` value at once, and typing character by character
 * makes the browser interpret partial input. The value is read back because a
 * malformed day is silently dropped by the input rather than rejected.
 */
export async function fillDateField(page: Page, testId: string, day: CalendarDay): Promise<void> {
  const input = page.getByTestId(testId);
  await input.fill(day);
  await expect(input).toHaveValue(day);
}

/** Sets a time field (`<input type="time">`) from `HH:MM`. */
export async function fillTimeField(page: Page, testId: string, time: string): Promise<void> {
  const input = page.getByTestId(testId);
  await input.fill(time);
  await expect(input).toHaveValue(time);
}

/**
 * Picks an option in a Clean Ink SelectField by its visible label.
 *
 * The rows carry no testIDs, so they are matched by text — and the trigger
 * displays the *selected* label with that same text, which would make a bare
 * `getByText` ambiguous. Two things resolve that: the search is scoped to the
 * field's own wrapper, and an already-selected value returns without opening
 * anything.
 */
export async function selectOption(page: Page, testId: string, label: string): Promise<void> {
  const trigger = page.getByTestId(testId);
  await expect(trigger).toBeVisible();

  if ((await trigger.innerText()).trim() === label) return;

  await trigger.click();

  // The menu (desktop) and the trigger share a parent wrapper; the mobile sheet
  // is a Modal, so fall back to the page when the scoped lookup finds nothing.
  const wrapper = trigger.locator('xpath=..');
  const scoped = wrapper.getByText(label, { exact: true });
  const option = (await scoped.count()) > 0 ? scoped.first() : page.getByText(label, { exact: true }).first();

  await option.click();
  await expect(trigger).toContainText(label);
}

// ── Owner flows ──────────────────────────────────────────────────────────────

export interface CreateClassInput {
  date: CalendarDay;
  /** `HH:MM`. */
  time?: string;
  classTypeName: string;
  coachName: string;
  spaceName: string;
  capacity?: number;
}

/**
 * Creates a single class through the owner's form and returns to the dashboard.
 *
 * Deliberately drives the real form rather than seeding SQL: this is the path an
 * owner takes, and it is the write side of the calendar-date seam.
 */
export async function createClassViaForm(page: Page, input: CreateClassInput): Promise<void> {
  const { date, time = '09:00', classTypeName, coachName, spaceName, capacity } = input;

  await page.getByTestId('create-class-btn').first().click();
  await expect(page.getByTestId('create-class-save-btn')).toBeVisible();

  // Single-class mode is the default, but a recurring series writes different
  // rows entirely, so it is stated rather than assumed.
  const singleMode = page.getByTestId('create-class-mode-single');
  if (await singleMode.isVisible()) await singleMode.click();

  await fillDateField(page, 'create-class-date-input', date);
  await fillTimeField(page, 'create-class-time-input', time);

  await selectOption(page, 'create-class-class-type-picker', classTypeName);
  await selectOption(page, 'create-class-coach-picker', coachName);
  await selectOption(page, 'create-class-space-picker', spaceName);

  if (capacity !== undefined) {
    await fillStable(page.getByTestId('create-class-capacity-input'), String(capacity));
  }

  await page.getByTestId('create-class-save-btn').click();

  // The form leaves on success. Waiting for the dashboard's own control — rather
  // than for the form to vanish — also proves the navigation completed.
  await expect(page.getByTestId('create-class-btn').first()).toBeVisible({ timeout: 20_000 });
}

/**
 * Scrolls the owner dashboard's week view to the week containing `day`.
 *
 * The dashboard opens on the current week, and fixtures are dated a few days
 * out, so the target is often one week forward. This walks forward a bounded
 * number of weeks and fails with the days it did see — never silently gives up,
 * which is the behaviour that let the old suite skip itself.
 */
export async function showWeekContaining(page: Page, day: CalendarDay): Promise<Locator> {
  const column = page.getByTestId(`day-column-${day}`);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await column.count() > 0) {
      await expect(column).toBeVisible();
      return column;
    }
    await page.getByTestId('week-nav-next-btn').first().click();
    await page.waitForTimeout(250);
  }

  const visibleColumns = await page.getByTestId(/^day-column-/).all();
  const labels = await Promise.all(
    visibleColumns.map((c) => c.getAttribute('data-testid')),
  );
  throw new Error(
    `Could not reach the week containing ${day} on the owner dashboard after 3 forward steps. ` +
      `Columns visible: ${labels.join(', ') || '(none)'}.`,
  );
}

// ── Athlete flows ────────────────────────────────────────────────────────────

/** Opens the athlete's schedule tab. */
export async function openAthleteSchedule(page: Page): Promise<void> {
  await tab(page, 'tab-schedule').click();
  await expect(page).toHaveURL(/schedule/);
}

/**
 * Books a class from the athlete's side: open the card, confirm on the detail
 * screen, and wait for the button to stop being a booking button.
 *
 * The card press and the "Book Class" button both route to class-details, so
 * this takes the card route — the same one a real athlete takes.
 */
export async function bookClassAsAthlete(page: Page, classId: string): Promise<void> {
  await page.getByTestId(`athlete-class-card-${classId}`).click();

  const bookBtn = page.getByTestId('book-btn');
  await expect(bookBtn).toBeVisible();
  await bookBtn.click();

  // Booking replaces the action with a cancel control; waiting on that is what
  // proves the write was accepted rather than merely requested.
  await expect(page.getByTestId('cancel-booking-btn')).toBeVisible({ timeout: 20_000 });
}
