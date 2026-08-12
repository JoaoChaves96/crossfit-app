/**
 * Journey 1 — Owner creates a class → athlete books it → owner sees the count rise.
 *
 * The spine of the product, and the exemplar for every other journey: seed a
 * gym, drive real screens as real actors, and end on an assertion that state
 * changed.
 *
 * The load-bearing claim is that BOTH sides name the SAME calendar day. A class
 * created for a Friday must render under Friday for the owner and under Friday
 * for the athlete. Nothing below asserts a widget exists; each step asserts a
 * day, a count, or a state that could only be true if the write happened.
 *
 * Why that matters here specifically: `scheduledDate` is a `@Column('date')` —
 * a calendar day with no instant. Round-tripping it through `new Date()` yields
 * UTC midnight, and reading that back with local getters lands a day early west
 * of UTC. The backend seam of exactly this shape was fixed in 8829f75, and the
 * browser is the only place the whole round trip is visible at once. The suite
 * pins the browser to America/New_York so the defect cannot hide behind a UTC
 * machine.
 */
import { expect, newActorPage, test } from '../fixtures';
import { loginAs } from '../helpers/auth';
import {
  bookClassAsAthlete,
  createClassViaForm,
  openAthleteSchedule,
  showWeekContaining,
} from '../helpers/actions';
import {
  expectClassInDayColumn,
  expectClassOnAthleteDay,
  expectOwnerBookingCount,
} from '../helpers/assert';
import { bookableDay } from '../helpers/dates';
import { countBookings, findClassByDate, seedGym } from '../helpers/seed';

test('owner creates a class, athlete books it, and the owner sees the count rise', async ({
  page,
  browser,
}) => {
  const gym = await seedGym('j1-create-book-count');
  const athlete = gym.athletes[0];

  // Three days out: far enough that no booking cutoff or lifecycle transition
  // has passed, close enough to stay inside the dashboard's reachable weeks.
  const day = bookableDay();
  const capacity = 8;

  // ── The owner creates a class for a specific day ──────────────────────────
  await loginAs(page, gym.owner);
  await expect(page).toHaveURL(/schedule-dashboard/);

  await createClassViaForm(page, {
    date: day,
    time: '09:00',
    classTypeName: gym.classTypes.crossfit.name,
    coachName: gym.coach.name,
    spaceName: gym.space.name,
    capacity,
  });

  // Resolve the id from the database rather than scraping the DOM: it also
  // proves the row was stored on the day the owner picked. `findClassByDate`
  // throws with the days it did find, so a one-day shift names itself.
  const created = await findClassByDate(gym, day);
  expect(created.date).toBe(day);

  // ── …and sees it in that day's column, and nowhere else ──────────────────
  const column = await showWeekContaining(page, day);
  await expect(column).toBeVisible();
  await expectClassInDayColumn(page, created.id, day);
  await expectOwnerBookingCount(page, created.id, 0, capacity);

  // ── The athlete sees the same class on the same day, and books it ─────────
  const athleteActor = await newActorPage(browser);
  try {
    await loginAs(athleteActor.page, athlete);
    await openAthleteSchedule(athleteActor.page);

    await expectClassOnAthleteDay(athleteActor.page, created.id, day);
    await bookClassAsAthlete(athleteActor.page, created.id);

    // The booking survives a reload, so it was persisted rather than held in
    // component state.
    await athleteActor.page.reload();
    await expect(athleteActor.page.getByTestId('cancel-booking-btn')).toBeVisible({
      timeout: 20_000,
    });
  } finally {
    await athleteActor.close();
  }

  expect(await countBookings(created, 'booked')).toBe(1);

  // ── The owner's count rises without any action of theirs ──────────────────
  await page.reload();
  await showWeekContaining(page, day);
  await expectOwnerBookingCount(page, created.id, 1, capacity);
});
