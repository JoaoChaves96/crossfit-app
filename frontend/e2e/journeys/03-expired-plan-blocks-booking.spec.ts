/**
 * Journey 3 — an expired plan blocks booking.
 *
 * The athlete, the class and the gym are all fine; the only thing wrong is the
 * date on the athlete's plan. The journey therefore runs the SAME athlete
 * against the SAME class twice — once with the plan expired, once with it
 * current — so the refusal cannot be attributed to a broken fixture, a
 * mis-stated class or the visibility rule. Only `expiresAt` changes between the
 * two halves, and the outcome flips.
 *
 * The boundary is the point, and it is narrower than it looks. What 8829f75
 * removed was an accidental one-day grace period: the lapse check compared
 * CALENDAR DAYS, so a plan was covered for the whole of its expiry day. The only
 * fixture that separates that from the correct instant comparison is a plan that
 * lapsed EARLIER TODAY — expired by the clock, current by the calendar.
 *
 * Every longer lapse is useless here. "Yesterday, same time of day" reads as
 * expired under both comparisons, and so does last week: this journey was
 * originally written with a 24-hour lapse and stayed green with the grace period
 * mutated back in. `pastDay()` is not used for the same reason.
 *
 * The instant is built from the server-local start of day because that is the
 * calendar the backend's check would use, and Node here shares the backend's
 * zone while the browser is pinned elsewhere.
 *
 * Each half ends on a row count rather than on a disabled control: "no book
 * button" and "the booking was written anyway" look identical on screen.
 */
import { expect, test } from '../fixtures';
import { loginAs } from '../helpers/auth';
import { bookClassAsAthlete, openAthleteSchedule } from '../helpers/actions';
import {
  expectClassNotVisibleToAthlete,
  expectClassOnAthleteDay,
} from '../helpers/assert';
import { bookableDay } from '../helpers/dates';
import {
  countBookings,
  seedClass,
  seedGym,
  setPlanAutoRoll,
  setPlanExpiry,
} from '../helpers/seed';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One second past midnight today, in the zone the backend runs in.
 *
 * Past as an instant, today as a calendar day — the one shape that tells the two
 * comparisons apart. Node and the backend are the same host, so `setHours`
 * lands on the same local day the backend's own `new Date()` would.
 */
function lapsedEarlierToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 1, 0);
  return d;
}

/**
 * The copy the athlete actually gets. `utils/api-client.ts` maps every 403 to
 * this one line rather than passing the server's message through, so the
 * refusal the athlete reads names no cutoff and no plan. Asserted verbatim so
 * that improving it — which USER_JOURNEYS.md's "the cutoff is stated" arguably
 * asks for — is a deliberate change to this journey rather than a silent one.
 */
const REFUSAL_COPY = 'You do not have permission to do that.';

test('an athlete whose plan lapsed earlier today cannot book, and can once it is current', async ({
  page,
}) => {
  const gym = await seedGym('j3-expired-plan-blocks-booking');
  const athlete = gym.athletes[0];

  // A published CrossFit class three days out: covered by the athlete's plan,
  // well clear of any cutoff, and identical in both halves of the journey.
  const day = bookableDay();
  const cls = await seedClass({ gym, date: day, capacity: 8 });

  // ── The plan lapsed earlier today, and nothing else is wrong ──────────────
  // Expired by the clock, current by the calendar — see the header.
  await setPlanExpiry(athlete, lapsedEarlierToday());
  // Without this the plan is not expired at all: see `setPlanAutoRoll`.
  await setPlanAutoRoll(athlete, false);

  await loginAs(page, athlete);
  await openAthleteSchedule(page);

  // The whole schedule is refused, not merely this class — the athlete is told
  // something, then shown no classes at all.
  await expect(page.getByTestId('schedule-error')).toHaveText(REFUSAL_COPY, {
    timeout: 20_000,
  });
  // Anchored on the refusal the athlete was just shown: this screen has no class
  // the athlete may see, so the error IS the proof that it rendered.
  await expectClassNotVisibleToAthlete(page, cls.id, { testId: 'schedule-error' });

  // Opening the class directly, as a deep link or a stale card would: there is
  // no booking control on any route, not just no card to press.
  await page.goto(`/class-details?classId=${cls.id}`);
  await expect(page.getByTestId('class-details-error')).toHaveText(REFUSAL_COPY, {
    timeout: 20_000,
  });
  await expect(page.getByTestId('book-btn')).toHaveCount(0);

  expect(
    await countBookings(cls, 'booked'),
    `A plan that lapsed at ${lapsedEarlierToday().toISOString()} still produced a booking on ${day}. ` +
      `That is the one-day grace period removed in 8829f75 — the expiry day treated as covered — not a flake.`,
  ).toBe(0);

  // ── The same athlete, the same class, a current plan ──────────────────────
  // The control half. Without it, a refusal caused by a broken fixture would
  // read as the rule working.
  await setPlanExpiry(athlete, new Date(Date.now() + 30 * ONE_DAY_MS));

  await page.goto('/schedule');
  await expectClassOnAthleteDay(page, cls.id, day);
  await bookClassAsAthlete(page, cls.id);

  expect(await countBookings(cls, 'booked')).toBe(1);
});
