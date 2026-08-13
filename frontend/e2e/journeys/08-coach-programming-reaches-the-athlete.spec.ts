/**
 * Journey 8 — what the coach writes is what the athlete reads.
 *
 * The coach and the athlete never share a screen, a fetch, or a component here:
 * the coach writes on `coach-class-details` (their own list → their own class),
 * the athlete reads `class-details`, and the only thing joining them is the
 * stored programming. That is the whole subject — one person's text arriving
 * verbatim on another person's screen, in a different session.
 *
 * Verbatim matters more than it looks. `DECISIONS.md` → "Programming Content
 * Shape" keeps the WOD as ONE opaque string the coach typed, deliberately not a
 * parsed structure, so a multi-line workout must survive the round trip with its
 * lines intact. A journey asserting a single short word would pass over a save
 * that trimmed, re-flowed or collapsed the body.
 *
 * Three claims, in order:
 *
 *  1. Before the coach writes, the athlete is told there is nothing — the app's
 *     own empty state, not a blank region. This is the anchor the later
 *     assertions are read against: it proves the athlete's programming section
 *     renders at all, so seeing the WOD afterwards is arrival rather than luck.
 *  2. The coach saves and the athlete, on a plain reload, reads the exact text.
 *  3. The coach EDITS it, and the athlete reads the new text and no longer the
 *     old. The overwrite half is what an append-instead-of-replace bug or a
 *     cached first response would fail, and it is the same shape as the stale
 *     derivation that journey 6 found on the cancel path.
 *
 * The athlete here is booked into the class, which is the case that matters
 * (they are reading it to prepare), but nothing in the product gates programming
 * on holding a booking — that is journey 2's visibility rule, not this one's.
 */
import { type Page } from '@playwright/test';
import { expect, newActorPage, test } from '../fixtures';
import { loginAs, fillStable } from '../helpers/auth';
import { bookableDay } from '../helpers/dates';
import { seedBooking, seedClass, seedGym } from '../helpers/seed';

const FIRST_WOD = [
  'A) 3 rounds for time:',
  '  400m run',
  '  21 kettlebell swings 24/16kg',
  'B) then 10 minutes of skill work',
].join('\n');

const SECOND_WOD = [
  'A) 5 rounds for time:',
  '  500m row',
  '  15 burpees over the bar',
].join('\n');

/** Opens the athlete's view of the class from the schedule they browse. */
async function openClassAsAthlete(athlete: Page, classId: string): Promise<void> {
  await athlete.goto('/schedule');
  const card = athlete.getByTestId(`athlete-class-card-${classId}`);
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.click();
  await expect(athlete.getByTestId('class-details-title')).toBeVisible({ timeout: 15_000 });
}

/**
 * Types a WOD into the coach's form and saves it.
 *
 * `fillStable` rather than `.fill()`: the input is controlled, and Expo Web's
 * hydration race means a DOM-only value never reaches React state — the save
 * would then post the PREVIOUS content and the journey would pass on the edit
 * step while proving nothing. Waiting on the `Saved` marker before returning is
 * what makes the athlete's next read a read of a completed write.
 */
async function saveProgramming(coach: Page, wod: string): Promise<void> {
  await fillStable(coach.getByTestId('programming-wod-input'), wod);
  await coach.getByTestId('programming-save-btn').click();
  await expect(coach.getByText('Saved')).toBeVisible({ timeout: 20_000 });
}

test('the WOD a coach saves is the WOD the booked athlete reads', async ({ page, browser }) => {
  const gym = await seedGym('j8-coach-programming-reaches-the-athlete');
  const [athlete] = gym.athletes;

  const day = bookableDay();
  const cls = await seedClass({ gym, date: day, time: '18:00:00', capacity: 10 });

  // Precondition — the athlete holds a spot, which is why they are reading the
  // programming at all. Booking is journey 1's subject.
  await seedBooking(cls, athlete);

  const athleteActor = await newActorPage(browser);
  try {
    const a = athleteActor.page;

    // ── Nothing posted yet, said in the app's own words ─────────────────────
    await loginAs(a, athlete);
    await openClassAsAthlete(a, cls.id);
    await expect(a.getByText(/No programming has been posted for this class yet/)).toBeVisible({
      timeout: 15_000,
    });

    // ── The coach writes it, from their own list ────────────────────────────
    // Through `coach-classes`, not by URL: `coach-class-details` takes the class
    // it displays from route params, so the list is the only real way in — and
    // it is the path the coach actually uses.
    await loginAs(page, gym.coach);
    await page.getByTestId(`coach-class-view-btn-${cls.id}`).click();
    await expect(page.getByTestId('programming-wod-input')).toBeVisible({ timeout: 20_000 });

    await saveProgramming(page, FIRST_WOD);
    // The coach's own screen echoes the stored content back, so a save that
    // returned nothing usable is caught here rather than blamed on the athlete.
    await expect(page.getByTestId('programming-wod-content')).toContainText(
      '21 kettlebell swings 24/16kg',
    );

    // ── The athlete reads it — every line, unchanged ────────────────────────
    await a.reload();
    const programming = a.getByText(/3 rounds for time/);
    await expect(programming).toBeVisible({ timeout: 20_000 });
    for (const line of FIRST_WOD.split('\n')) {
      await expect(a.getByText(line.trim(), { exact: false }).first()).toBeVisible();
    }

    // ── The coach changes their mind ────────────────────────────────────────
    await saveProgramming(page, SECOND_WOD);

    await a.reload();
    await expect(a.getByText(/5 rounds for time/)).toBeVisible({ timeout: 20_000 });
    await expect(a.getByText(/500m row/)).toBeVisible();
    // Replaced, not appended, and not served from the first response: the run
    // and the swings are gone from the athlete's screen entirely.
    await expect(a.getByText(/400m run/)).toHaveCount(0);
    await expect(a.getByText(/kettlebell swings/)).toHaveCount(0);

    // ── And it is the stored value, not a session artefact ──────────────────
    // The coach comes back through their list in a fresh page state; what they
    // see is what the athlete sees.
    await page.goto('/coach-classes');
    await page.getByTestId(`coach-class-view-btn-${cls.id}`).click();
    await expect(page.getByTestId('programming-wod-content')).toContainText('15 burpees over the bar');
    await expect(page.getByTestId('programming-wod-content')).not.toContainText('kettlebell');
  } finally {
    await athleteActor.close();
  }
});
