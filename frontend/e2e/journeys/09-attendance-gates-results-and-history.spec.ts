/**
 * Journeys 9 + 10, merged — attendance decides who may log, and a logged result
 * travels to the athlete's history and to the coach's roster.
 *
 * They are one journey because they are one chain with a single precondition
 * that is expensive to build twice: a class walked to `completed` with real
 * attendance on it. Splitting them would mean seeding the same four-actor
 * lifecycle twice to assert two halves of the same sentence — "A was present, so
 * A's result exists, and everyone who should see it does".
 *
 * The chain, and the rule behind each link:
 *
 *  - Attendance can only be marked at `in_progress` or `completed`
 *    (`MarkAttendance`), so the coach walks the class there first.
 *  - A result requires the class `completed`, the athlete marked PRESENT, and a
 *    loggable class type (`LogResult`). A and B are identical in every respect
 *    except the one toggle the coach flipped — same class, same booking, same
 *    plan — so anything that separates them separates on attendance and nothing
 *    else. That is the gate, stated as an experiment with a control.
 *  - The result then has to arrive on two other screens, fetched independently:
 *    the athlete's Training History (`/athletes/me/history`) and the coach's
 *    results roster on the class. A write that only satisfied the screen that
 *    made it would pass a shallower test.
 *
 * "Absence does not promote" is pinned here too, per DECISIONS.md: C is
 * waitlisted and stays waitlisted. Marking B absent frees a seat in the sense
 * that a body is missing, and it must NOT free one in the sense the booking
 * system means — `MarkAttendance` performs no booking mutations at all. This is
 * checked in the database on purpose: at `completed` the athlete UI does not
 * distinguish a never-promoted waitlist row, which is a finding recorded in the
 * epic rather than something this journey can read off a screen.
 *
 * Known product gap this journey documents rather than asserts away: the athlete
 * API exposes no attendance flag (`UserBookingItemDto` has none), so my-bookings
 * derives "You attended" and its LOG RESULT button from the class state alone.
 * B — marked absent — is therefore OFFERED the action and refused only on
 * submit. The journey asserts today's truth (B is refused, and B gets no result)
 * and names the gap in a comment where B presses the button.
 */
import { type Page } from '@playwright/test';
import { expect, newActorPage, test } from '../fixtures';
import { loginAs, fillStable, visibleTestId } from '../helpers/auth';
import { bookableDay } from '../helpers/dates';
import { countBookings, seedBooking, seedClass, seedGym } from '../helpers/seed';

/** 225 seconds, which the app renders as a clock — see formatResultValue. */
const RESULT_SECONDS = '225';
const RESULT_DISPLAY = '03:45';

/**
 * Advances the class one lifecycle step from the coach's control and waits for
 * the chip to say so.
 *
 * The coach, not the owner: `ManuallyTransitionClassState` requires
 * `coachUserId === userId`. The confirm handler is registered before the click
 * because `showConfirm` is a real `window.confirm` on web and Playwright
 * dismisses unhandled dialogs.
 */
async function advanceState(coach: Page, expectedLabel: string): Promise<void> {
  const transitionBtn = coach.getByTestId('class-transition-btn');
  await expect(transitionBtn).toBeVisible({ timeout: 20_000 });
  coach.once('dialog', (dialog) => void dialog.accept());
  await transitionBtn.click();
  await expect(transitionBtn).toHaveText(new RegExp(expectedLabel, 'i'), { timeout: 20_000 });
}

/** The athlete's Past bookings, where a completed class offers LOG RESULT. */
async function openPastBookings(athlete: Page): Promise<void> {
  await athlete.goto('/my-bookings');
  await visibleTestId(athlete, 'bookings-toggle-past').click();
}

test('attendance decides who can log a result, and the result reaches history and the coach', async ({
  page,
  browser,
}) => {
  // Three athletes: two booked into a capacity-2 class and one waitlisted behind
  // them, so the promotion invariant has something to be violated with.
  const gym = await seedGym('j9-attendance-gates-results', 3);
  const [athleteA, athleteB, athleteC] = gym.athletes;

  const day = bookableDay();
  const cls = await seedClass({ gym, date: day, time: '07:00:00', capacity: 2 });

  await seedBooking(cls, athleteA, 'booked', 1);
  await seedBooking(cls, athleteB, 'booked', 2);
  await seedBooking(cls, athleteC, 'waitlisted', 3);

  // ── The coach runs the class ───────────────────────────────────────────────
  await loginAs(page, gym.coach);
  await page.goto(`/class-management?classId=${cls.id}`);
  await expect(page.getByTestId('class-transition-btn')).toHaveText(/Published/i, {
    timeout: 20_000,
  });
  await advanceState(page, 'Booking Closed');
  await advanceState(page, 'In Progress');

  // Attendance from the coach's own screens — their class list, their class,
  // their attendance sheet. Everyone starts marked Present, so ONE toggle is
  // the whole difference between A and B.
  await page.goto('/coach-classes');
  await page.getByTestId(`coach-class-view-btn-${cls.id}`).click();
  await page.getByTestId('mark-attendance-nav-btn').click();

  const bToggle = page.getByTestId(`athlete-toggle-btn-${athleteB.id}`);
  await expect(bToggle).toHaveText(/Present/, { timeout: 20_000 });
  await bToggle.click();
  await expect(bToggle).toHaveText(/Absent/);
  // A is untouched, and asserted so: if the sheet defaulted differently, or the
  // toggle moved the wrong row, the experiment has no control.
  await expect(page.getByTestId(`athlete-toggle-btn-${athleteA.id}`)).toHaveText(/Present/);

  await page.getByTestId('submit-attendance-btn').click();
  await expect(page.getByText('Attendance submitted successfully.')).toBeVisible({
    timeout: 20_000,
  });

  // ── Absence does not promote ───────────────────────────────────────────────
  // B being absent leaves the class one body short and must not move C's
  // booking: MarkAttendance performs no booking mutations (DECISIONS.md).
  expect(
    await countBookings(cls, 'waitlisted'),
    `C was promoted off the waitlist by an ABSENCE. Attendance must not touch bookings — ` +
      `a no-show does not free a seat, and the waitlist is inert past 'published'.`,
  ).toBe(1);
  expect(await countBookings(cls, 'booked')).toBe(2);

  await page.goto(`/class-management?classId=${cls.id}`);
  await advanceState(page, 'Completed');

  const aActor = await newActorPage(browser);
  const bActor = await newActorPage(browser);
  try {
    const a = aActor.page;
    const b = bActor.page;

    // ── A was present, so A can log ─────────────────────────────────────────
    await loginAs(a, athleteA);
    await openPastBookings(a);
    await a.getByTestId(`log-result-btn-${cls.id}`).click();

    await fillStable(a.getByTestId('log-results-value-input'), RESULT_SECONDS);
    await a.getByTestId('log-results-save-btn').click();

    // Saving returns the athlete to where they came from; no error is shown on
    // the way out.
    await expect(a.getByTestId('log-results-error')).toHaveCount(0);
    await expect(a.getByTestId('log-results-save-btn')).toHaveCount(0, { timeout: 20_000 });

    // ── …and it lands in Training History, which is a different fetch ───────
    await a.goto('/training-history');
    const historyCard = a.getByTestId(`training-history-card-${cls.id}`);
    await expect(historyCard).toBeVisible({ timeout: 20_000 });
    await expect(historyCard).toContainText(RESULT_DISPLAY);
    // The class is in history AS A LOGGED one — the screen's own words for the
    // opposite case, so a result that failed to attach would be visible here.
    await expect(historyCard).not.toContainText('Not Logged');

    // ── B was absent, so B is refused ───────────────────────────────────────
    await loginAs(b, athleteB);
    await openPastBookings(b);

    // B is OFFERED the action: the athlete API exposes no attendance flag, so
    // my-bookings cannot know B was absent. Today the refusal happens on submit
    // — asserted below — and the offer itself is the recorded gap.
    await b.getByTestId(`log-result-btn-${cls.id}`).click();
    await fillStable(b.getByTestId('log-results-value-input'), RESULT_SECONDS);
    await b.getByTestId('log-results-save-btn').click();

    // The refusal is the client's generic 403 copy, not the server's reason.
    // `LogResult` throws "Athlete was not marked present for this class", but
    // `api-client` deliberately replaces server messages by status so developer
    // strings and ids never reach an athlete — so B is told *no*, and not *why*.
    // Asserting the generic text pins today's real behaviour; the missing
    // explanation is a recorded finding, not something to assume away here.
    await expect(b.getByTestId('log-results-error')).toContainText(
      'You do not have permission to do that.',
      { timeout: 20_000 },
    );
    await expect(b.getByTestId('log-results-save-btn')).toBeVisible();

    // And B's history is empty — Training History is *attended* classes
    // (`getPresentAttendanceByUserAndGym`), so an absence removes the class from
    // it entirely rather than listing it unlogged. The screen's own empty state
    // is the positive anchor: the list rendered, and B is not in it.
    await b.goto('/training-history');
    await expect(b.getByText('No attended classes yet')).toBeVisible({ timeout: 20_000 });
    await expect(b.getByTestId(`training-history-card-${cls.id}`)).toHaveCount(0);

    // ── The coach sees A's result on the class, and only A's ────────────────
    // Scoped to the Results panel: on desktop the Bookings roster is on screen
    // at the same time and carries BOTH names, so an unscoped name check would
    // pass no matter what the results contain.
    await page.goto(`/class-management?classId=${cls.id}`);
    const resultsPanel = page.getByTestId('results-panel');
    await expect(resultsPanel).toContainText(athleteA.name, { timeout: 20_000 });
    await expect(resultsPanel).toContainText(`${RESULT_DISPLAY} min`);
    await expect(resultsPanel).toContainText('1 logged');
    // B booked the class and shows on the roster, but never logged: the coach's
    // results are the people who trained, not the people who signed up.
    await expect(resultsPanel).not.toContainText(athleteB.name);

    // ── It survives a reload for the athlete who logged it ──────────────────
    await a.reload();
    await expect(a.getByTestId(`training-history-card-${cls.id}`)).toContainText(RESULT_DISPLAY, {
      timeout: 20_000,
    });
  } finally {
    await aActor.close();
    await bActor.close();
  }
});
