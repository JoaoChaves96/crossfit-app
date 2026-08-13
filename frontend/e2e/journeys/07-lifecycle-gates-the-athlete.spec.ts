/**
 * Journey 7 — the class lifecycle decides what the athlete may do.
 *
 * `published → booking_closed → in_progress → completed`, walked one step at a
 * time by the class's assigned coach, with both athletes re-read after every
 * step. The claim is not that a chip label changed: it is that a state stored on
 * the class in one session removes an ACTION from two other people's screens.
 *
 * Who drives it, and why it is the coach: the manual transition endpoint accepts
 * the `coach` and `owner` roles, but the handler then requires
 * `classEntity.coachUserId === userId` — so the only actor who can advance a
 * class is the coach assigned to it. The owner sees the same control and gets a
 * 403 from it (recorded in the epic; not this journey's subject). The automatic
 * `published → booking_closed` path is the lifecycle scheduler, which the e2e
 * backend runs with disabled precisely so a test can own the state.
 *
 * The two-sided shape at every step, because "the athlete can't act" is only
 * meaningful against an athlete who could a moment ago:
 *
 *  - A holds a booking. A must keep it — visibly, as `BOOKED – Confirmed` — while
 *    losing the ability to give it up. A booking that silently disappeared at
 *    booking_closed, or a Cancel that stays on screen and only fails when pressed,
 *    both read as "closed" to a shallower assertion.
 *  - B holds nothing and must not be able to start. Same class, same screen, the
 *    opposite half of the gate.
 *
 * `my-bookings` is asserted alongside `class-details` on purpose: they derive the
 * athlete's affordances independently, from different fetches, and at the time
 * this journey was written only class-details gated Cancel on the lifecycle.
 * my-bookings hid it at `in_progress` only, so at `booking_closed` it offered a
 * Cancel whose sole outcome was an error toast.
 *
 * The last step is the one that adds something rather than removing it: at
 * `completed` the booking leaves Upcoming, lands in Past as `ATTENDED`, and
 * offers LOG RESULT. Journeys 9 and 10 take it from there — here it only has to
 * appear, and only at `completed`.
 */
import { type Page } from '@playwright/test';
import { expect, newActorPage, test } from '../fixtures';
import { loginAs, visibleTestId } from '../helpers/auth';
import { bookableDay } from '../helpers/dates';
import { seedBooking, seedClass, seedGym } from '../helpers/seed';

/**
 * Advances the class one state via the coach's own control and waits for the
 * chip to say so.
 *
 * `showConfirm` is a real `window.confirm` on web and Playwright DISMISSES
 * unhandled dialogs, so the handler is registered before the click — without it
 * the press takes the Cancel branch and nothing happens at all. Asserting the
 * new label before returning means the athlete assertions that follow are read
 * against a class that has actually moved, not against a request in flight.
 */
async function advanceState(coach: Page, expectedLabel: string): Promise<void> {
  const transitionBtn = coach.getByTestId('class-transition-btn');
  await expect(transitionBtn).toBeVisible();

  coach.once('dialog', (dialog) => void dialog.accept());
  await transitionBtn.click();

  await expect(transitionBtn).toHaveText(new RegExp(expectedLabel, 'i'), { timeout: 20_000 });
}

/**
 * Opens the class as an athlete, from the schedule they actually browse.
 *
 * By URL rather than by tapping the tab: this journey re-reads the same class
 * four times from wherever the athlete happens to be — a pushed class-details
 * route, or the bookings tab — and `tab-*` chrome differs between those. The
 * subject here is the class screen's content, not how one arrives at it
 * (journey 1 owns the card route).
 */
async function openClassAsAthlete(athlete: Page, classId: string): Promise<void> {
  await athlete.goto('/schedule');
  const card = athlete.getByTestId(`athlete-class-card-${classId}`);
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.click();
}

test('the class lifecycle removes the athlete’s actions one state at a time', async ({
  page,
  browser,
}) => {
  const gym = await seedGym('j7-lifecycle-gates-the-athlete');
  const [athleteA, athleteB] = gym.athletes;

  const day = bookableDay();
  const cls = await seedClass({ gym, date: day, time: '09:00:00', capacity: 5 });

  // Precondition — A already holds a spot. Booking through the UI is journey 1's
  // subject; this journey's subject is what happens to that spot as the class
  // advances.
  await seedBooking(cls, athleteA);

  // The coach drives the lifecycle. `class-management` is reached by URL because
  // the transition control lives only on that screen and the coach's own
  // navigation does not lead to it — see the epic's note on that gap.
  await loginAs(page, gym.coach);
  await page.goto(`/class-management?classId=${cls.id}`);
  const transitionBtn = page.getByTestId('class-transition-btn');
  await expect(transitionBtn).toHaveText(/Published/i, { timeout: 20_000 });

  const aActor = await newActorPage(browser);
  const bActor = await newActorPage(browser);
  try {
    const a = aActor.page;
    const b = bActor.page;

    // ── While published: A can give the spot up, B can take one ─────────────
    await loginAs(a, athleteA);
    await openClassAsAthlete(a, cls.id);
    await expect(a.getByTestId('cancel-booking-btn')).toBeVisible();
    await expect(a.getByText(/BOOKED\s*[–—-]\s*Confirmed/).first()).toBeVisible();

    await loginAs(b, athleteB);
    await openClassAsAthlete(b, cls.id);
    await expect(b.getByTestId('book-btn')).toHaveText(/BOOK CLASS/i);

    // A's other surface offers the cancellation too — the one the athlete is
    // most likely to use, since it needs no navigation into the class.
    await openMyBookings(a);
    await expect(a.getByTestId(`booking-card-${cls.id}`)).toBeVisible({ timeout: 15_000 });
    await expect(a.getByTestId(`booking-cancel-btn-${cls.id}`)).toBeVisible();

    // ── booking_closed: both athletes lose their action, A keeps the spot ────
    await advanceState(page, 'Booking Closed');

    await openClassAsAthlete(a, cls.id);
    // The positive first: the screen rendered AND A is still booked. Only then
    // does the absence of the control mean "cancelling is closed" rather than
    // "nothing loaded" or "the booking vanished".
    await expect(a.getByText(/BOOKED\s*[–—-]\s*Confirmed/).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(a.getByTestId('cancel-booking-btn')).toHaveCount(0);
    await expect(a.getByTestId('leave-waitlist-btn')).toHaveCount(0);

    await openMyBookings(a);
    const card = a.getByTestId(`booking-card-${cls.id}`);
    await expect(card).toBeVisible({ timeout: 15_000 });
    // Still an upcoming booking, and still visibly held…
    await expect(card.getByText(/BOOKED/)).toBeVisible();
    // …but with nothing to press. `CancelBooking` refuses every state past
    // `published` permanently, so a Cancel here could only ever produce an error.
    await expect(a.getByTestId(`booking-cancel-btn-${cls.id}`)).toHaveCount(0);

    // B is refused the start of the flow, on a screen that demonstrably loaded.
    await openClassAsAthlete(b, cls.id);
    await expect(b.getByTestId('class-details-title')).toHaveText(gym.classTypes.crossfit.name, {
      timeout: 15_000,
    });
    await expect(b.getByTestId('book-btn')).toHaveCount(0);

    // ── in_progress: unchanged for A and B, and the class says so ────────────
    await advanceState(page, 'In Progress');

    await openMyBookings(a);
    const inProgressCard = a.getByTestId(`booking-card-${cls.id}`);
    await expect(inProgressCard).toBeVisible({ timeout: 15_000 });
    await expect(inProgressCard.getByText(/IN PROGRESS/)).toBeVisible();
    await expect(a.getByTestId(`booking-cancel-btn-${cls.id}`)).toHaveCount(0);

    await openClassAsAthlete(a, cls.id);
    await expect(a.getByText(/BOOKED\s*[–—-]\s*Confirmed/).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(a.getByTestId('cancel-booking-btn')).toHaveCount(0);

    await openClassAsAthlete(b, cls.id);
    await expect(b.getByTestId('class-details-title')).toBeVisible({ timeout: 15_000 });
    await expect(b.getByTestId('book-btn')).toHaveCount(0);

    // ── completed: the one step that GIVES the athlete something ────────────
    await advanceState(page, 'Completed');

    await openMyBookings(a);
    // The booking has left Upcoming — asserted from the Past tab's own content
    // rather than by counting nothing on Upcoming.
    await expect(a.getByTestId(`booking-card-${cls.id}`)).toHaveCount(0, { timeout: 15_000 });
    await visibleTestId(a, 'bookings-toggle-past').click();

    const pastCard = a.getByTestId(`booking-card-${cls.id}`);
    await expect(pastCard).toBeVisible({ timeout: 15_000 });
    await expect(pastCard.getByText(/ATTENDED/)).toBeVisible();
    await expect(a.getByTestId(`log-result-btn-${cls.id}`)).toBeVisible();

    // B, who never booked, has no history to log against — the completed class
    // is not simply open to everyone once it is over.
    await openMyBookings(b);
    await visibleTestId(b, 'bookings-toggle-past').click();
    await expect(b.getByTestId(`booking-card-${cls.id}`)).toHaveCount(0);

    // And it survives a reload: the affordance follows the stored state, not a
    // client-side flag set by the transition that happened elsewhere.
    await a.reload();
    await visibleTestId(a, 'bookings-toggle-past').click();
    await expect(a.getByTestId(`log-result-btn-${cls.id}`)).toBeVisible({ timeout: 20_000 });
  } finally {
    await aActor.close();
    await bActor.close();
  }
});

/** The athlete's bookings tab, from wherever they currently are. */
async function openMyBookings(athlete: Page): Promise<void> {
  await athlete.goto('/my-bookings');
  await visibleTestId(athlete, 'bookings-toggle-upcoming').waitFor({
    state: 'visible',
    timeout: 15_000,
  });
}
