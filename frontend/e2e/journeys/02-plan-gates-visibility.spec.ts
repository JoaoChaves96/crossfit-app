/**
 * Journey 2 — a plan's class types gate what the athlete can see.
 *
 * The Visibility Rule (CLAUDE.md, PRODUCT.md): an athlete may see a class only
 * if they belong to the gym AND their active plan covers the class's type. It is
 * the product's most important invariant, and the only invariant whose failure
 * mode is silent — a leaked class looks exactly like a class the athlete was
 * meant to have.
 *
 * The journey therefore asserts a DIFFERENCE, not a state: the same Strength
 * class, in the same gym, on the same day, seen by the same athlete, is absent
 * on the restricted plan and present on the unrestricted one. Nothing here can
 * pass without the plan switch having happened, and nothing here can pass on an
 * empty schedule:
 *
 *  - the owner sees BOTH classes first, so "Strength is missing" cannot mean
 *    "Strength was never created";
 *  - the athlete's CrossFit class is asserted alongside every Strength absence,
 *    so "Strength is missing" cannot mean "the schedule never loaded";
 *  - the switch is driven through the owner's own members screen, so the
 *    frontend↔backend contract for plan assignment is under test too, and the
 *    athlete's new view is a consequence of another actor's action rather than
 *    of a SQL write the app never saw.
 *
 * The athlete's plan is downgraded in the fixture instead of on screen: an
 * excluding plan is this journey's PRECONDITION, and preconditions are seeded
 * cheaply so a broken members screen fails the assertion it belongs to.
 */
import { expect, newActorPage, test } from '../fixtures';
import { loginAs } from '../helpers/auth';
import {
  openAthleteSchedule,
  openMemberPanel,
  openOwnerSection,
  selectOption,
  showWeekContaining,
} from '../helpers/actions';
import {
  expectClassInDayColumn,
  expectClassNotVisibleToAthlete,
  expectClassOnAthleteDay,
} from '../helpers/assert';
import { bookableDay } from '../helpers/dates';
import { assignPlan, seedClass, seedGym } from '../helpers/seed';

test('a plan excluding a class type hides it from the athlete until the owner switches plans', async ({
  page,
  browser,
}) => {
  const gym = await seedGym('j2-plan-gates-visibility');
  const athlete = gym.athletes[0];

  // Both classes on one day: same gym, same day, same athlete — so the only
  // difference between the visible one and the hidden one is the class type,
  // which is exactly the variable under test.
  const day = bookableDay();
  const crossfitClass = await seedClass({
    gym,
    date: day,
    time: '09:00:00',
    classTypeId: gym.classTypes.crossfit.id,
  });
  const strengthClass = await seedClass({
    gym,
    date: day,
    time: '18:00:00',
    classTypeId: gym.classTypes.strength.id,
    loggable: false,
  });

  // The precondition: the athlete is on the plan that covers CrossFit only.
  // `seedGym` puts everyone on Unlimited, which would make the negative half
  // vacuously false rather than fail.
  await assignPlan(athlete, gym.plans.crossfitOnly);

  // ── The owner sees both classes ───────────────────────────────────────────
  // The owner's dashboard applies no plan filter, so this is what establishes
  // that the Strength class genuinely exists and renders. Without it, every
  // absence asserted below would also be satisfied by a class that was never
  // written.
  await loginAs(page, gym.owner);
  await expect(page).toHaveURL(/schedule-dashboard/);

  await showWeekContaining(page, day);
  await expectClassInDayColumn(page, crossfitClass.id, day);
  await expectClassInDayColumn(page, strengthClass.id, day);

  const athleteActor = await newActorPage(browser);
  try {
    // ── The athlete on the restricted plan sees CrossFit and not Strength ───
    await loginAs(athleteActor.page, athlete);
    await openAthleteSchedule(athleteActor.page);

    await expectClassOnAthleteDay(athleteActor.page, crossfitClass.id, day);
    await expectClassNotVisibleToAthlete(athleteActor.page, strengthClass.id, {
      visibleClassId: crossfitClass.id,
    });

    // A second, independent reading of the same fact. The type-filter rail is
    // built from the class types present in the fetched payload plus a canonical
    // set that does NOT include Strength, so a Strength chip exists only if a
    // Strength class reached the client. This catches a class that was filtered
    // out of the rendered list but not out of the response.
    await expect(athleteActor.page.getByTestId('schedule-chip-Strength')).toHaveCount(0);

    // ── The owner switches the athlete to the plan that includes Strength ────
    await openOwnerSection(page, 'members');

    // The members list keys its rows by gym_membership id, which is what the
    // plan-assignment endpoint takes.
    const row = page.getByTestId(`member-row-${athlete.gymMembershipId}`);
    await expect(row).toContainText(gym.plans.crossfitOnly.name);
    await openMemberPanel(page, athlete.gymMembershipId);

    await selectOption(page, 'member-plan-select', gym.plans.unlimited.name);
    await page.getByTestId('member-save-btn').click();

    // The panel dismisses on a successful write and the list refetches, so the
    // owner's own row is the confirmation — asserted from the server's answer,
    // not from the draft the owner just typed.
    await expect(row).toContainText(gym.plans.unlimited.name, { timeout: 20_000 });

    // …and it was persisted rather than held in the list's state.
    await page.reload();
    await expect(row).toContainText(gym.plans.unlimited.name, { timeout: 20_000 });

    // ── The athlete now sees the Strength class ─────────────────────────────
    // The reload is the athlete's fresh fetch: they took no action, and the
    // change reaches them purely because the owner's write changed what the
    // Visibility Rule admits.
    await athleteActor.page.reload();

    await expectClassOnAthleteDay(athleteActor.page, strengthClass.id, day);
    await expect(athleteActor.page.getByTestId('schedule-chip-Strength')).toHaveCount(1);

    // The wider plan added a class type; it did not cost the athlete the one
    // they already had.
    await expectClassOnAthleteDay(athleteActor.page, crossfitClass.id, day);
  } finally {
    await athleteActor.close();
  }
});
