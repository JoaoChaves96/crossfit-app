/**
 * Journey 5 — Waitlist promotion.
 *
 * A capacity-1 class with athlete A holding the only spot and athlete B on the
 * waitlist. A cancels; the backend promotes B inside that same request and emits
 * `waitlist.promoted`. The journey asserts BOTH halves of that, from B's side of
 * the glass: B's own screen flips from "you are #1 in line" to "BOOKED —
 * Confirmed", and B is told about it.
 *
 * This is the most complex state transition in the product and until now was
 * only ever verified by hand — which is exactly the shape Playwright exists for:
 * one actor acts, in their own browser context, and a different actor sees the
 * consequence. No supertest can see the second half, because the promotion is a
 * side effect of A's request that only ever surfaces in B's session.
 *
 * Two negatives carry as much weight as the positives, and both would fail a
 * build where the promotion silently never fired:
 *
 *  - before A cancels, B is NOT confirmed and has NO notification badge (a
 *    waitlisted booking deliberately emits no event, so the badge appearing
 *    later can only have come from the promotion);
 *  - after it, B's "leave waitlist" control and the "#N in line" copy are gone
 *    rather than merely joined by a booked state.
 *
 * Timing note: the promotion itself is synchronous within A's cancel request, so
 * B's first refetch must already show it — asserted with a single reload and no
 * tolerance. The notification is written by an event listener AFTER that response
 * returns, so it is polled with reload-and-retry rather than slept on.
 */
import { expect, newActorPage, test } from '../fixtures';
import { loginAs, visibleTestId } from '../helpers/auth';
import { openAthleteSchedule } from '../helpers/actions';
import { expectClassOnAthleteDay } from '../helpers/assert';
import { bookableDay } from '../helpers/dates';
import { countBookings, seedBooking, seedClass, seedGym } from '../helpers/seed';

test('a cancellation promotes the waitlisted athlete, who sees it and is told about it', async ({
  page,
  browser,
}) => {
  const gym = await seedGym('j5-waitlist-promotion');
  const [athleteA, athleteB] = gym.athletes;

  const day = bookableDay();
  const cls = await seedClass({ gym, date: day, time: '09:00:00', capacity: 1 });

  // Precondition only — "someone else already took the last spot". Booking is
  // journey 1's subject; here A's held spot is just the shape of the fixture.
  await seedBooking(cls, athleteA);

  const bActor = await newActorPage(browser);
  try {
    const b = bActor.page;

    // ── B joins the waitlist through the app ──────────────────────────────────
    // Driven through the UI rather than seeded: the waitlist is this journey's
    // subject, so the "full → join waitlist → #1 in line" path is asserted, not
    // assumed. The card press is the route a real athlete takes.
    await loginAs(b, athleteB);
    await openAthleteSchedule(b);
    await expectClassOnAthleteDay(b, cls.id, day);
    await b.getByTestId(`athlete-class-card-${cls.id}`).click();

    // The same testID serves "book" and "join waitlist"; the label is what says
    // the class read as full, so it is asserted before the click.
    const joinWaitlist = b.getByTestId('book-btn');
    await expect(joinWaitlist).toBeVisible();
    await expect(joinWaitlist).toHaveText(/JOIN WAITLIST/i);
    await joinWaitlist.click();

    await expect(b.getByTestId('leave-waitlist-btn')).toBeVisible({ timeout: 20_000 });
    await expect(b.getByText(/You are #1 in line/).first()).toBeVisible();

    // The negatives that make the later assertions mean something: B holds no
    // confirmed spot, and nothing has been announced to B yet. A waitlisted
    // booking emits no event, so an empty badge here is the correct state and
    // the only thing that can fill it is the promotion.
    await expect(b.getByTestId('cancel-booking-btn')).toHaveCount(0);
    await expect(visibleTestId(b, 'notification-bell')).toBeVisible();
    await expect(b.getByTestId('notification-badge')).toHaveCount(0);

    expect(await countBookings(cls, 'waitlisted')).toBe(1);

    // ── A gives the spot up ───────────────────────────────────────────────────
    await loginAs(page, athleteA);
    await openAthleteSchedule(page);
    await page.getByTestId(`athlete-class-card-${cls.id}`).click();

    const cancelBooking = page.getByTestId('cancel-booking-btn');
    await expect(cancelBooking).toBeVisible();

    // Cancellation confirms through `showConfirm`, which on web is a real
    // window.confirm. Playwright DISMISSES dialogs when nothing handles them, so
    // without this the click would take the "Keep Booking" branch and the rest of
    // the journey would fail for the wrong reason.
    page.once('dialog', (dialog) => void dialog.accept());
    await cancelBooking.click();

    // A's own action landed: the cancel control is gone from A's screen.
    await expect(cancelBooking).toHaveCount(0, { timeout: 20_000 });

    // ── B sees the promotion ──────────────────────────────────────────────────
    // A reload is B's refetch: the promotion happened in another session, so
    // nothing pushes it into this one. One reload, no retry — promotion is
    // synchronous inside A's request, so anything later than B's very next fetch
    // is a defect and not a race.
    await b.reload();
    await expect(b.getByTestId('cancel-booking-btn')).toBeVisible({ timeout: 20_000 });
    await expect(b.getByText(/BOOKED\s*[–—-]\s*Confirmed/).first()).toBeVisible();

    // …and B's waitlist state is gone, not merely accompanied by a booked one.
    await expect(b.getByTestId('leave-waitlist-btn')).toHaveCount(0);
    await expect(b.getByText(/in line/)).toHaveCount(0);

    // ── B is told ─────────────────────────────────────────────────────────────
    // The notification is written by a listener on `waitlist.promoted`, after
    // A's cancel response was already sent, so its arrival is genuinely racy
    // against B's next fetch. Polled by reloading until the shared badge counts
    // it — no fixed sleep, and it can only ever pass by the count actually
    // reaching 1.
    await expect(async () => {
      await b.reload();
      await expect(visibleTestId(b, 'notification-badge')).toHaveText('1', {
        timeout: 5_000,
      });
    }).toPass({ timeout: 30_000 });

    // That reload is also the persistence check: the promotion is still B's
    // state on a second fresh load, so it was written and not held in a screen.
    await expect(b.getByTestId('cancel-booking-btn')).toBeVisible({ timeout: 20_000 });

    await visibleTestId(b, 'notification-bell').click();
    await expect(b.getByTestId('notifications-screen')).toBeVisible({ timeout: 20_000 });

    // Pinned to THIS class, not just "a notification exists": the body names the
    // class type and the day the class sits on.
    const promotion = b.getByTestId(/^notification-item-/).filter({ hasText: "You're In!" });
    await expect(promotion).toHaveCount(1);
    await expect(promotion).toContainText(gym.classTypes.crossfit.name);
    await expect(promotion).toContainText(day);
    // Delivered unread — B is being told, not shown something they had seen.
    await expect(promotion.getByTestId(/^notification-unread-/)).toHaveCount(1);
  } finally {
    await bActor.close();
  }

  // The seat moved rather than being duplicated or lost: the class is full again
  // and the waitlist is empty.
  expect(await countBookings(cls, 'booked')).toBe(1);
  expect(await countBookings(cls, 'waitlisted')).toBe(0);
});
