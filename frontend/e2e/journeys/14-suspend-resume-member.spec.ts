/**
 * Journey 14 — the owner suspends a member, and the member stops being one.
 *
 * Suspension is the only lever in the MVP that revokes access to a gym the
 * athlete still belongs to, and it is driven entirely from the owner's UI. So
 * both halves are driven through the product: the owner presses the button, and
 * a SEPARATE browser context — the athlete's own live session — is the thing
 * that has to change. Nothing here is asserted from the seed.
 *
 * The reverse direction is what makes it a journey rather than a check. A
 * suspension that also destroyed the membership, the plan, or the eligibility
 * that plan carries would look identical while suspended; only resuming tells
 * "access withheld" apart from "access broken". Hence the third claim is a
 * BOOKING, not a sighting: the write path has to come back too.
 *
 * On what the suspended athlete sees: `getActiveGymMembershipByUserAndGym`
 * filters on `status = 'active'`, so the schedule request is REFUSED (403)
 * rather than answered with an empty list. The athlete is therefore shown the
 * generic permission line, which is also what an expired plan produces — the
 * anchor for the absence, and a finding recorded in the epic rather than a
 * behaviour this journey invents an opinion about.
 */
import { expect, newActorPage, test } from '../fixtures';
import { loginAs } from '../helpers/auth';
import {
  bookClassAsAthlete,
  openAthleteSchedule,
  openMemberPanel,
  openOwnerSection,
} from '../helpers/actions';
import { expectClassNotVisibleToAthlete, expectClassOnAthleteDay } from '../helpers/assert';
import { bookableDay } from '../helpers/dates';
import { countBookings, seedClass, seedGym } from '../helpers/seed';

/**
 * The line `utils/api-client.ts` maps every 403 to, regardless of which rule
 * refused. Asserted verbatim for the same reason journey 3 does: if the copy is
 * ever made specific, that should be a deliberate edit here.
 */
const REFUSAL_COPY = 'You do not have permission to do that.';

test('suspending a member revokes their access, and resuming gives it back', async ({
  page,
  browser,
}) => {
  const gym = await seedGym('j14-suspend-resume-member');
  const athlete = gym.athletes[0];
  const day = bookableDay();
  const cls = await seedClass({ gym, date: day, capacity: 8 });

  const actor = await newActorPage(browser);
  try {
    // ── The athlete is a member in good standing ──────────────────────────────
    // The control half comes FIRST here, unlike journey 3: the suspension has to
    // be shown to remove something that was demonstrably there.
    await loginAs(actor.page, athlete);
    await openAthleteSchedule(actor.page);
    await expectClassOnAthleteDay(actor.page, cls.id, day);

    // ── The owner suspends them ───────────────────────────────────────────────
    await loginAs(page, gym.owner);
    await openOwnerSection(page, 'members');
    await openMemberPanel(page, athlete.gymMembershipId);

    await page.getByTestId('member-suspend-btn').click();
    // The control flips to its opposite, which is the panel's own report that the
    // status write resolved — not that it was merely sent.
    await expect(page.getByTestId('member-resume-btn')).toBeVisible({ timeout: 20_000 });

    // ── …and the athlete's live session loses the gym ─────────────────────────
    await actor.page.reload();
    await expect(actor.page.getByTestId('schedule-error')).toHaveText(REFUSAL_COPY, {
      timeout: 20_000,
    });
    await expectClassNotVisibleToAthlete(actor.page, cls.id, { testId: 'schedule-error' });

    // A stale card or a deep link is refused too: the class is gone from every
    // route, not just absent from one list.
    await actor.page.goto(`/class-details?classId=${cls.id}`);
    await expect(actor.page.getByTestId('class-details-error')).toHaveText(REFUSAL_COPY, {
      timeout: 20_000,
    });
    await expect(actor.page.getByTestId('book-btn')).toHaveCount(0);

    expect(
      await countBookings(cls, 'booked'),
      `A suspended member's session produced a booking on ${day}. Suspension is checked when the ` +
        `active gym membership is resolved, so a booking here means the write path resolved the ` +
        `membership without its status.`,
    ).toBe(0);

    // ── The owner resumes them ────────────────────────────────────────────────
    await page.getByTestId('member-resume-btn').click();
    await expect(page.getByTestId('member-suspend-btn')).toBeVisible({ timeout: 20_000 });

    // ── …and everything comes back, booking included ──────────────────────────
    // The plan and the eligibility it carries survived the suspension: this
    // athlete can act again, not merely look.
    await actor.page.goto('/schedule');
    await expectClassOnAthleteDay(actor.page, cls.id, day);
    await bookClassAsAthlete(actor.page, cls.id);

    expect(
      await countBookings(cls, 'booked'),
      `The athlete's booking after being resumed did not reach the database, so "the button ` +
        `worked" was the whole of the claim.`,
    ).toBe(1);
  } finally {
    await actor.close();
  }
});
