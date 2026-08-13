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
import { fillStable, tab, visibleTestId } from './auth';
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

  // Pinned to the VISIBLE copy: reaching the dashboard through the sidebar
  // pushes a second instance of the screen, leaving the earlier one mounted but
  // hidden — and `.first()` would then wait forever on a button nobody can press.
  await visibleTestId(page, 'create-class-btn').click();
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
  await expect(visibleTestId(page, 'create-class-btn')).toBeVisible({ timeout: 20_000 });
}

/** The calendar days the owner dashboard currently has columns for. */
async function renderedWeekDays(page: Page): Promise<CalendarDay[]> {
  const columns = await page.getByTestId(/^day-column-/).all();
  const testIds = await Promise.all(columns.map((c) => c.getAttribute('data-testid')));
  return testIds
    .map((id) => id?.replace('day-column-', ''))
    .filter((d): d is CalendarDay => !!d)
    .sort();
}

/**
 * Moves the owner dashboard's week view to the week containing `day`.
 *
 * The dashboard opens on the current week and walks in whichever direction the
 * target lies — forward for a bookable class a few days out, BACKWARD for the
 * completed classes the attendance and result journeys need. A one-directional
 * walk would simply never reach a `pastDay()` fixture, and would blame the date.
 *
 * Direction is read off the grid rather than computed here: Node keeps the
 * machine's zone while the browser is pinned elsewhere, so "which week is the
 * dashboard on" is a question only the dashboard can answer. Bounded either way,
 * and it fails with the days it did see — never silently gives up, which is the
 * behaviour that let the old suite skip itself.
 *
 * "Is the target week on screen?" must be a RETRYING question, not a reading. A
 * bare `count()` returns 0 both when the week is elsewhere and when the grid has
 * not rendered — and after `page.reload()` the grid renders, then Expo Router's
 * client boot tears the tree down and renders it again, so any single reading can
 * land in that gap. Observed: a `toBeVisible` on the grid passed, and the very
 * next `count()` in the same tick saw an empty DOM. The walk then advanced three
 * weeks past a column that was already there and blamed the fixture's date.
 *
 * So each week gets its own bounded wait for the column to APPEAR, and only a
 * week that genuinely does not contain the day moves the view.
 */
export async function showWeekContaining(page: Page, day: CalendarDay): Promise<Locator> {
  const column = page.getByTestId(`day-column-${day}`);
  const MAX_STEPS = 3;
  const seen: CalendarDay[] = [];

  for (let step = 0; step <= MAX_STEPS; step += 1) {
    try {
      await expect(column).toHaveCount(1, { timeout: 8_000 });
      await expect(column).toBeVisible();
      return column;
    } catch {
      // Not this week — or not yet rendered, which the wait above has now ruled
      // out. Moving the view is safe.
    }

    if (step === MAX_STEPS) break;

    const rendered = await renderedWeekDays(page);
    seen.push(...rendered);

    // An empty grid says nothing about direction; assume the common case
    // (a fixture dated forwards) rather than stalling.
    const forwards = rendered.length === 0 || day > rendered[rendered.length - 1];
    if (!forwards && day > rendered[0]) {
      throw new Error(
        `The owner dashboard is showing the week that contains ${day} ` +
          `(${rendered[0]}–${rendered[rendered.length - 1]}) but has no column for it. ` +
          `That is a missing column, not a navigation problem.`,
      );
    }

    await visibleTestId(page, forwards ? 'week-nav-next-btn' : 'week-nav-prev-btn').click();
    await page.waitForTimeout(250);
  }

  const rendered = await renderedWeekDays(page);
  throw new Error(
    `Could not reach the week containing ${day} on the owner dashboard within ${MAX_STEPS} steps. ` +
      `Columns now visible: ${rendered.join(', ') || '(none)'}. ` +
      `Columns seen along the way: ${seen.join(', ') || '(none)'}.`,
  );
}

/**
 * Opens an owner section from the sidebar and waits for the route to settle.
 *
 * `key` is the sidebar item's key (`members`, `coaches`, `gym-settings`), which
 * `OwnerSidebar` templates into `nav-${key}` — so a section renamed in one place
 * fails here loudly rather than in whichever journey happened to use it.
 */
export async function openOwnerSection(page: Page, key: string): Promise<void> {
  await visibleTestId(page, `nav-${key}`).click();
  await expect(page).toHaveURL(new RegExp(key));
}

/**
 * Opens a member's detail panel from the members list.
 *
 * Keyed by gym_membership id, not user id: that is what the rows carry and what
 * the plan-assignment and expiry endpoints take.
 *
 * Waits on the panel's save control rather than on the panel container, because
 * a panel that opened but whose plans request has not returned cannot yet be
 * acted on — and the wait is not an assertion, so a journey whose SUBJECT is the
 * panel still makes its own claims about what it contains.
 */
export async function openMemberPanel(page: Page, gymMembershipId: string): Promise<void> {
  await page.getByTestId(`member-row-${gymMembershipId}`).click();
  await expect(page.getByTestId('member-save-btn')).toBeVisible({ timeout: 20_000 });
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
