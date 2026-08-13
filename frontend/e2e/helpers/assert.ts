/**
 * The outcome assertions journeys share.
 *
 * Each one states a fact about what an actor can see, and fails with enough
 * context to tell a defect from a flake. That matters most for the date
 * assertions: "the card is missing" and "the card is one column to the left"
 * are the same failure to `toBeVisible()`, and only the second is the seam this
 * suite was built to catch.
 */
import { expect, type Page } from '@playwright/test';
import { addDays, type CalendarDay } from './dates';

/**
 * The owner's dashboard shows the class in the column for `day` — and in no
 * other column.
 *
 * The negative half is the point. A class rendered one day early still satisfies
 * "the card exists somewhere on the dashboard", which is exactly how a
 * UTC-vs-local defect hides. When the card turns up in a neighbouring column the
 * error says so, because that is a data-integrity bug and not a slow render.
 */
export async function expectClassInDayColumn(
  page: Page,
  classId: string,
  day: CalendarDay,
): Promise<void> {
  const card = page.getByTestId(`class-card-${classId}`);
  const correctColumn = page.getByTestId(`day-column-${day}`);

  await expect(card.first()).toBeVisible({ timeout: 15_000 });

  const inCorrectColumn = correctColumn.getByTestId(`class-card-${classId}`);
  if ((await inCorrectColumn.count()) === 0) {
    const neighbours = [addDays(day, -1), addDays(day, 1)];
    for (const neighbour of neighbours) {
      const strayed = page
        .getByTestId(`day-column-${neighbour}`)
        .getByTestId(`class-card-${classId}`);
      if ((await strayed.count()) > 0) {
        throw new Error(
          `Class ${classId} was created for ${day} but the owner's dashboard renders it under ` +
            `${neighbour}. This is the calendar-date seam, not a flake: a bare 'YYYY-MM-DD' ` +
            `parsed with new Date() becomes UTC midnight, and reading it back with local ` +
            `getters shifts the day west of UTC. Compare with utils/datetime.ts, which parses ` +
            `these strings without ever constructing a UTC instant.`,
        );
      }
    }
  }

  await expect(inCorrectColumn).toHaveCount(1);
}

/**
 * The athlete's schedule lists the class under the heading for `day`.
 *
 * The other half of the "same date on both sides" claim. The athlete groups by
 * the raw date string, so this catches a shift introduced anywhere between the
 * owner's form and the athlete's list.
 */
export async function expectClassOnAthleteDay(
  page: Page,
  classId: string,
  day: CalendarDay,
): Promise<void> {
  await expect(page.getByTestId(`athlete-class-card-${classId}`)).toBeVisible({ timeout: 15_000 });

  const section = page.getByTestId(`day-section-${day}`);
  if ((await section.count()) === 0) {
    const headings = await page.getByTestId(/^day-section-/).all();
    const days = await Promise.all(headings.map((h) => h.getAttribute('data-testid')));
    throw new Error(
      `The athlete's schedule shows class ${classId} but has no section for ${day}. ` +
        `Sections present: ${days.join(', ') || '(none)'}. A section one day either side ` +
        `of ${day} is the calendar-date seam.`,
    );
  }

  await expect(section).toBeVisible();
}

/**
 * Proof that the screen an absence is about is actually on screen.
 *
 * Either another class the athlete IS allowed to see, or a testID that says the
 * screen reached a settled state of its own (`schedule-error` when the whole
 * schedule was refused).
 */
export type AbsenceAnchor = { visibleClassId: string } | { testId: string };

/**
 * The athlete cannot see this class at all — the negative of the visibility rule.
 *
 * The anchor is REQUIRED, and it is the whole point of the helper. `toHaveCount(0)`
 * is satisfied just as well by a schedule that has not rendered yet as by one that
 * correctly withheld the class, so an unanchored absence is a test that passes on
 * an empty DOM. Both current callers happened to assert a positive first; making
 * it a parameter means the next journey cannot forget, and Tier 2 is almost
 * entirely absences.
 */
export async function expectClassNotVisibleToAthlete(
  page: Page,
  classId: string,
  anchor: AbsenceAnchor,
): Promise<void> {
  if ('visibleClassId' in anchor) {
    await expect(page.getByTestId(`athlete-class-card-${anchor.visibleClassId}`)).toBeVisible({
      timeout: 15_000,
    });
  } else {
    await expect(page.getByTestId(anchor.testId)).toBeVisible({ timeout: 15_000 });
  }

  await expect(page.getByTestId(`athlete-class-card-${classId}`)).toHaveCount(0);
}

/**
 * The owner's card reports `booked/capacity`.
 *
 * Asserted from what the owner actually reads on screen, not from a row count:
 * a booking that exists but never reaches the dashboard is the bug this catches.
 */
export async function expectOwnerBookingCount(
  page: Page,
  classId: string,
  booked: number,
  capacity: number,
): Promise<void> {
  await expect(page.getByTestId(`class-card-${classId}-spots`)).toHaveText(
    `${booked}/${capacity} spots`,
    { timeout: 15_000 },
  );
}
