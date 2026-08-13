/**
 * Journey 6 — a cancellation frees the spot for whoever asks next.
 *
 * The sibling of journey 5, and deliberately not the same claim. There, a
 * cancellation was CLAIMED by a waitlist and the seat moved to a named athlete.
 * Here nobody is waiting: the seat has to go back into the pool, be counted as
 * free by the owner, and be bookable by an athlete who was refused it minutes
 * earlier. A build that only ever frees a seat via the promotion path passes
 * journey 5 and fails this one.
 *
 * Capacity 1 is what makes every assertion two-sided. Full means B is offered a
 * waitlist instead of a booking, so "the spot is free again" is not a number
 * nobody reads — it is the difference between JOIN WAITLIST and BOOK CLASS on
 * B's own screen.
 *
 * Three actors in three contexts, because the point is that one athlete's action
 * changes what a different athlete and the owner see:
 *
 *  - the OWNER's count is read before and after, from the dashboard rather than
 *    the database, and after a reload — the path that had no refetch at all
 *    until 7e605e4;
 *  - B is refused first and books second, with no action in between of their own;
 *  - A's own screen returns to offering the booking, which says the seat was
 *    released rather than merely detached from A.
 *
 * The final database read is the anti-duplication check: one booked row, no
 * waitlist row invented by a promotion that had nobody to promote, and A's
 * booking still present as `cancelled`. A seat that is freed by DELETING the row
 * would satisfy every on-screen assertion above and lose the history the results
 * and attendance screens are built on.
 */
import { expect, newActorPage, test } from '../fixtures';
import { loginAs } from '../helpers/auth';
import { openAthleteSchedule, showWeekContaining } from '../helpers/actions';
import { expectClassOnAthleteDay, expectOwnerBookingCount } from '../helpers/assert';
import { bookableDay } from '../helpers/dates';
import { countBookings, seedBooking, seedClass, seedGym } from '../helpers/seed';

test('a cancellation returns the spot to the pool, and the next athlete can take it', async ({
  page,
  browser,
}) => {
  const gym = await seedGym('j6-cancel-frees-the-spot');
  const [athleteA, athleteB] = gym.athletes;

  const day = bookableDay();
  const cls = await seedClass({ gym, date: day, time: '09:00:00', capacity: 1 });

  // Precondition only — A holds the single spot. Booking through the UI is
  // journey 1's subject; this journey's subject is giving it up.
  await seedBooking(cls, athleteA);

  // ── The owner sees the class full ─────────────────────────────────────────
  await loginAs(page, gym.owner);
  await showWeekContaining(page, day);
  await expectOwnerBookingCount(page, cls.id, 1, 1);

  const bActor = await newActorPage(browser);
  const aActor = await newActorPage(browser);
  try {
    const b = bActor.page;
    const a = aActor.page;

    // ── B is refused the booking while A holds it ───────────────────────────
    await loginAs(b, athleteB);
    await openAthleteSchedule(b);
    await expectClassOnAthleteDay(b, cls.id, day);
    await b.getByTestId(`athlete-class-card-${cls.id}`).click();

    // One testID serves both actions, so the LABEL is the assertion: a full
    // class offers the waitlist and never the booking.
    await expect(b.getByTestId('book-btn')).toHaveText(/JOIN WAITLIST/i);
    await expect(b.getByText(/Class is full/).first()).toBeVisible();

    // B stays put. Joining the waitlist is journey 5's path, and taking it here
    // would make the promotion — not the freed seat — the reason B ends up
    // booked.
    expect(await countBookings(cls, 'waitlisted')).toBe(0);

    // ── A gives the spot up ─────────────────────────────────────────────────
    await loginAs(a, athleteA);
    await openAthleteSchedule(a);
    await a.getByTestId(`athlete-class-card-${cls.id}`).click();

    const cancelBooking = a.getByTestId('cancel-booking-btn');
    await expect(cancelBooking).toBeVisible();

    // `showConfirm` is a real window.confirm on web, and Playwright DISMISSES
    // unhandled dialogs — without this the click takes the "Keep Booking"
    // branch and the journey fails for the wrong reason.
    a.once('dialog', (dialog) => void dialog.accept());
    await cancelBooking.click();

    // A's own screen offers the booking back: the seat was released to the
    // class, not merely unlinked from A.
    await expect(cancelBooking).toHaveCount(0, { timeout: 20_000 });
    await expect(a.getByTestId('book-btn')).toHaveText(/BOOK CLASS/i, { timeout: 20_000 });

    expect(await countBookings(cls, 'booked')).toBe(0);
    expect(
      await countBookings(cls, 'cancelled'),
      `A's booking is gone from the class entirely. A cancelled booking must survive as a ` +
        `'cancelled' row: attendance and results are built on booking history, and a deleted ` +
        `row frees the seat while silently erasing that A was ever in the class.`,
    ).toBe(1);

    // ── The owner's count falls, without the owner doing anything ───────────
    await page.reload();
    await showWeekContaining(page, day);
    await expectOwnerBookingCount(page, cls.id, 0, 1);

    // ── …and B, refused a moment ago, can now book ──────────────────────────
    // A reload is B's refetch: the cancellation happened in another session, so
    // nothing pushes it here. B is still on the class-details route.
    await b.reload();
    const bookBtn = b.getByTestId('book-btn');
    await expect(bookBtn).toHaveText(/BOOK CLASS/i, { timeout: 20_000 });
    await bookBtn.click();

    await expect(b.getByTestId('cancel-booking-btn')).toBeVisible({ timeout: 20_000 });
    await expect(b.getByText(/BOOKED\s*[–—-]\s*Confirmed/).first()).toBeVisible();

    // A was not quietly re-booked into the seat B just took.
    await a.reload();
    await expect(a.getByTestId('book-btn')).toHaveText(/JOIN WAITLIST/i, { timeout: 20_000 });
    await expect(a.getByTestId('cancel-booking-btn')).toHaveCount(0);
  } finally {
    await aActor.close();
    await bActor.close();
  }

  // The seat was reissued, not duplicated: one holder, nobody waiting, and A's
  // cancellation still on the record.
  expect(await countBookings(cls, 'booked')).toBe(1);
  expect(await countBookings(cls, 'waitlisted')).toBe(0);
  expect(await countBookings(cls, 'cancelled')).toBe(1);

  await page.reload();
  await showWeekContaining(page, day);
  await expectOwnerBookingCount(page, cls.id, 1, 1);
});
