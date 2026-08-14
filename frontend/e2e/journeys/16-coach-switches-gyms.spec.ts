/**
 * Journey 16 — a coach staffed at two gyms can work in both.
 *
 * DATA_MODEL.md:105 grants multi-gym staffing to coaches and gym_staff stores
 * it, but the JWT carries exactly one gymId and GymOwnershipGuard compares it
 * to the route — so before the switcher, every gym but the oldest answered 403
 * in every session, forever. The switch is the whole subject: the class this
 * coach can see BEFORE switching is gym A's, and gym B's only afterwards.
 */
import { randomUUID } from 'crypto';
import { expect, test } from '../fixtures';
import { fillStable, loginAs } from '../helpers/auth';
import { seedClass, seedGym, withDb } from '../helpers/seed';

const WOD = '5 rounds: 10 pull-ups, 20 air squats';

/**
 * A class type with a gym-unique name, inserted directly.
 *
 * `seedGym` names every gym's class types 'CrossFit' and 'Strength'
 * identically in both gyms, so a name-based absence assertion between two
 * seeded gyms would be vacuous in either direction — both gyms have both
 * names. This journey needs a name that exists in exactly one gym.
 */
async function seedNamedClassType(gymId: string, name: string): Promise<{ id: string }> {
  const id = randomUUID();
  await withDb(async (db) => {
    await db.query(
      `INSERT INTO class_types (id, "gymId", name, "resultMetrics", loggable) VALUES ($1, $2, $3, 'none', false)`,
      [id, gymId, name],
    );
  });
  return { id };
}

/**
 * Staffs a user at a gym they are not already staff at, with an explicit
 * `assignedAt`.
 *
 * The explicit timestamp is required, not tidiness: `resolveGymContext`
 * (DECISIONS.md:189) picks the oldest active staff row by `assignedAt` to
 * decide a login's default gym, and a bare `NOW()` could tie — or even
 * precede — gym A's own row, which would make the login-lands-at-gym-A
 * assumption this journey depends on flaky rather than guaranteed.
 */
async function staffAt(
  gymId: string,
  userId: string,
  role: string,
  assignedAt: Date,
): Promise<void> {
  await withDb(async (db) => {
    await db.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt") VALUES ($1, $2, $3, $4, 'active', $5)`,
      [randomUUID(), gymId, userId, role, assignedAt],
    );
  });
}

test('a coach staffed at two gyms reaches both', async ({ page }) => {
  const gymA = await seedGym('j16-gym-a');
  const gymB = await seedGym('j16-gym-b');

  // Gym A's coach is also staffed at gym B, assigned well after gym A's own
  // staff row (both written at seed time, effectively "now") — so on login
  // the default context stays gym A.
  await staffAt(gymB.id, gymA.coach.id, 'coach', new Date(Date.now() + 60_000));

  const typeA = await seedNamedClassType(gymA.id, 'Gym A Only Type');
  const typeB = await seedNamedClassType(gymB.id, 'Gym B Only Type');

  const classA = await seedClass({ gym: gymA, classTypeId: typeA.id });
  const classB = await seedClass({ gym: gymB, classTypeId: typeB.id });
  // seedClass always assigns gym.coach.id as the coach; gym B's class must
  // instead be coached by gym A's coach — the actor who switches — because
  // /coach-classes filters by the token's own userId, not by gym.
  await withDb(async (db) => {
    await db.query(`UPDATE classes SET "coachUserId" = $1 WHERE id = $2`, [
      gymA.coach.id,
      classB.id,
    ]);
  });

  await loginAs(page, gymA.coach);
  await page.goto('/coach-classes');

  // ── Before switching: gym A's class, and only gym A's ────────────────────
  const rowA = page.getByTestId(`coach-class-row-${classA.id}`);
  await expect(rowA).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId(/^coach-class-row-/)).toHaveCount(1);
  await expect(rowA).toContainText('Gym A Only Type');
  await expect(page.getByText('Gym B Only Type')).toHaveCount(0);

  // ── Switch to gym B ───────────────────────────────────────────────────────
  // The option's own testID, not the `gym-switcher` wrapper: for two gyms that
  // wrapper's only child is a full-width SegmentedToggle whose two `flex: 1`
  // segments abut, so the wrapper's bounding-box centre lands on the seam
  // between them and which segment receives the click turns on sub-pixel
  // rounding. Same reason this file uses `fillStable` over `.fill()`.
  await page.getByTestId(`gym-switcher-option-${gymB.id}`).click();

  // ── After switching: gym B's class, and only gym B's — same shape of
  // assertion, inverted, which is the proof ────────────────────────────────
  const rowB = page.getByTestId(`coach-class-row-${classB.id}`);
  await expect(rowB).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId(/^coach-class-row-/)).toHaveCount(1);
  await expect(rowB).toContainText('Gym B Only Type');
  await expect(page.getByText('Gym A Only Type')).toHaveCount(0);

  // ── The choice survives a reload: currentGymId persists, and the stored
  // token is the re-signed one ─────────────────────────────────────────────
  await page.reload();
  const rowBAfterReload = page.getByTestId(`coach-class-row-${classB.id}`);
  await expect(rowBAfterReload).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId(/^coach-class-row-/)).toHaveCount(1);
  await expect(rowBAfterReload).toContainText('Gym B Only Type');

  // ── …and they can WRITE at gym B, which is the part the re-sign buys ─────
  // Everything above this line passes with the token re-sign deleted from
  // `switchGym`, and this journey originally ended here — measured, not
  // assumed. `coach-classes.controller.ts:19` mounts only
  // `JwtAuthGuard, RolesGuard` and no `GymOwnershipGuard`, and the query scopes
  // by the route's gymId param plus the token's userId — so gym B's list reads
  // fine through gym A's stale token the moment `currentGymId` changes the URL.
  // Switching the local id alone is enough to make every read above green.
  //
  // Saving programming posts to /api/gyms/:gymId/classes/:classId/programming,
  // which DOES mount `GymOwnershipGuard` and compares the route's gym against
  // the token's own `gymId` claim. Without the re-sign that claim still names
  // gym A, so this is a 403 and `Saved` never appears. This is the assertion
  // that makes the switch load-bearing rather than cosmetic.
  //
  // Journey 11 hit this exact trap first (E2E_JOURNEYS.md:368) — reading a
  // coach's class list never needed the re-signed token; writing does.
  await page.getByTestId(`coach-class-view-btn-${classB.id}`).click();
  // A precondition, not a claim: the input's visibility is decided client-side
  // from a route param and says nothing about authorization.
  await expect(page.getByTestId('programming-wod-input')).toBeVisible({ timeout: 20_000 });

  // `fillStable`, not `.fill()`: the input is controlled, and a DOM-only value
  // never reaches React state — the save would post the previous content and
  // pass while proving nothing (journey 8 hit exactly that).
  await fillStable(page.getByTestId('programming-wod-input'), WOD);
  await page.getByTestId('programming-save-btn').click();
  await expect(page.getByText('Saved')).toBeVisible({ timeout: 20_000 });

  // Read back after a reload, per the epic's rule for anything that writes.
  // `Saved` comes from the POST's own response, so it proves the write; this
  // proves the server kept it, and closes the same hole from the other side —
  // the GET sits behind the same guard and the screen swallows its failure into
  // an empty form, so an unauthorized reload shows no WOD.
  await page.reload();
  await expect(page.getByTestId('programming-wod-input')).toHaveValue(WOD, {
    timeout: 20_000,
  });
});
