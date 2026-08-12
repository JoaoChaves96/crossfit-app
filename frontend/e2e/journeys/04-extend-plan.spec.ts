/**
 * Journey 4 — Owner extends a member's plan.
 *
 * Owner → members → a member → `+1 cycle` twice → save → the panel dismisses,
 * the row's expiry shows the two-cycle date, and it survives a reload. Then the
 * auto-renew toggle, which this journey absorbs rather than being given one of
 * its own.
 *
 * Both halves of the fix in 7fb4c79 are pinned here, and neither was visible to
 * a unit test on its own:
 *
 *  - `+1 cycle` computed from `member.expiresAt` — the SERVER value, which does
 *    not move until a save round-trips — so every press after the first
 *    recomputed the same date. Only a real round trip shows that the button is
 *    additive, so the two presses below assert the TWO-cycle date; the one-cycle
 *    date is precisely the bug.
 *  - Saving left the panel open, which on mobile put the sheet over the very row
 *    that had just changed. A save that wrote something now dismisses, so the
 *    dismissal is itself evidence the write was accepted: a failed save keeps the
 *    panel open with the error, and a nothing-to-write press keeps it open with
 *    the quiet "Saved" text.
 *
 * The expected expiry is never read back from the app. It is derived from the
 * seeded plan's billing cycle (`Unlimited` is monthly) with `monthlyCycle()`
 * below, so a client that renewed by the wrong interval — or that shifted the
 * calendar day through a local-time Date — fails rather than agreeing with
 * itself.
 */
import { expect, test } from '../fixtures';
import { loginAs } from '../helpers/auth';
import { openMemberPanel, openOwnerSection } from '../helpers/actions';
import { daysFromToday, type CalendarDay } from '../helpers/dates';
import { readActivePlan, seedGym, setPlanExpiry } from '../helpers/seed';

/**
 * The 15th of the month `cyclesAhead` monthly cycles from a fixed future month.
 *
 * Three properties make this the right shape for this journey:
 *
 *  - **Mid-month**, so one monthly cycle is unambiguously "same day, next
 *    month". The production renewal clamps to the last day of a short month
 *    (Jan 31 → Feb 28), and a test that had to model clamping would be
 *    re-implementing the code it is checking.
 *  - **String arithmetic on a month index**, never a `Date` and never a local
 *    getter. Node keeps the machine's zone while the browser is pinned to
 *    America/New_York, so a locally computed expiry is the exact class of bug
 *    this harness exists to catch.
 *  - **Always future.** Anchored on `daysFromToday(45)`, the 15th of that month
 *    is at least ~two weeks out, so it clears both the backend's
 *    must-be-in-the-future guard and the 7-day "expiring" window that would
 *    change the row's status chip.
 */
function monthlyCycle(cyclesAhead: number): CalendarDay {
  const [year, month] = daysFromToday(45).split('-').map(Number);
  const monthIndex = year * 12 + (month - 1) + cyclesAhead;
  const y = String(Math.floor(monthIndex / 12)).padStart(4, '0');
  const m = String((monthIndex % 12) + 1).padStart(2, '0');
  return `${y}-${m}-15`;
}

/**
 * The day as the members table prints it (`May 15, 2027`).
 *
 * Formatted in UTC to match `formatExpiry` in app/members.tsx: `expiresAt` marks
 * the last day a plan covers, so the owner must be shown the day they set
 * regardless of the viewer's zone. Reading it in the browser's negative-offset
 * zone would print the day before.
 */
function expiryLabel(day: CalendarDay): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

test("owner extends a member's plan by two cycles and turns auto-renew off", async ({ page }) => {
  const gym = await seedGym('j4-extend-plan');
  const member = gym.athletes[0];

  const seeded = monthlyCycle(0);
  const oneCycle = monthlyCycle(1);
  const twoCycles = monthlyCycle(2);

  // Noon UTC, not midnight: `expiresAt` is a `timestamp` column, so the value
  // makes a local-zone round trip through the backend. Noon keeps the calendar
  // day the same under any host offset, which means a day that shifts is the
  // app's doing and not the fixture's.
  await setPlanExpiry(member, new Date(`${seeded}T12:00:00.000Z`));

  // ── The owner opens the member the seed set up ─────────────────────────────
  await loginAs(page, gym.owner);
  await openOwnerSection(page, 'members');

  const expiryCell = page.getByTestId(`member-row-${member.gymMembershipId}-expires`);
  await expect(expiryCell).toHaveText(expiryLabel(seeded), { timeout: 20_000 });

  await openMemberPanel(page, member.gymMembershipId);

  // The plan has to have loaded before `+1 cycle` can do anything: the button
  // needs the held plan's billingCycle and is disabled until the plans request
  // returns. Waiting on the label rather than on the button's enabled state also
  // states which plan's cycle the dates below are derived from.
  await expect(page.getByTestId('member-plan-select')).toContainText(gym.plans.unlimited.name);

  // ── Two presses must add two cycles, not one ──────────────────────────────
  const expiryInput = page.getByTestId('member-expiry-input');
  await expect(expiryInput).toHaveValue(seeded);

  await page.getByTestId('member-add-cycle-btn').click();
  await expect(expiryInput).toHaveValue(oneCycle);

  await page.getByTestId('member-add-cycle-btn').click();
  await expect(expiryInput).toHaveValue(twoCycles);

  // ── Saving writes, and dismisses ──────────────────────────────────────────
  await page.getByTestId('member-save-btn').click();

  // The panel is gone entirely, not merely hidden — and because a rejected save
  // stays open with its error, this also says the backend accepted the date.
  await expect(page.getByTestId('member-save-btn')).toHaveCount(0, { timeout: 20_000 });

  // The list refetched behind the panel and now reports the compounded date, so
  // the second press reached the server rather than only the input.
  await expect(expiryCell).toHaveText(expiryLabel(twoCycles), { timeout: 20_000 });

  // ── …and it survived the round trip, not just the render ──────────────────
  await page.reload();
  await expect(expiryCell).toHaveText(expiryLabel(twoCycles), { timeout: 20_000 });

  // ── Auto-renew, from the same panel ───────────────────────────────────────
  await openMemberPanel(page, member.gymMembershipId);

  // Reopening re-seeds the draft from the server, so the stored value is what
  // the owner is now editing — the persistence claim above, from the write side.
  await expect(expiryInput).toHaveValue(twoCycles);

  expect((await readActivePlan(member)).autoRoll).toBe(true);

  await page.getByTestId('member-auto-roll-toggle').click();
  await page.getByTestId('member-save-btn').click();
  await expect(page.getByTestId('member-save-btn')).toHaveCount(0, { timeout: 20_000 });

  expect((await readActivePlan(member)).autoRoll).toBe(false);

  // Turning auto-renew off must not have moved the expiry: the save issues one
  // request per changed field, and a panel that re-sent everything it held would
  // rewrite the date the owner just set.
  await expect(expiryCell).toHaveText(expiryLabel(twoCycles), { timeout: 20_000 });
});
