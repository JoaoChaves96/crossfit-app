/**
 * Coach E2E tests
 *
 * Covers 4 flows:
 *   1. Login → assigned classes list loads
 *   2. Open a class → add programming → programming saved
 *   3. Mark attendance
 *   4. View results
 *
 * TESTID NOTICE:
 * The coach screens are now instrumented (coach-classes-screen,
 * coach-class-list, coach-class-row-{id}, coach-class-view-btn-{id},
 * coach-class-details-screen, programming-wod-input, programming-save-btn,
 * programming-wod-content, mark-attendance-nav-btn, mark-attendance-screen,
 * select-all-btn, athlete-toggle-btn-{id}, submit-attendance-btn). The
 * remaining text-based selectors below are deliberate: they target the first
 * row of an unknown-id list, or a visible label the flow actually depends on.
 *
 * There are no success-banner testIDs by design — Clean Ink has no success
 * role, so save feedback is a quiet meta line (see DESIGN.md).
 *
 * Still blocked by missing screen implementation, not testIDs:
 *   results-panel — no results section exists on coach-class-details yet
 */

import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

// ─── Flow 1: Login → assigned classes list loads ──────────────────────────────

test.describe('Coach: Login → assigned classes list loads', () => {
  test('logs in as coach and sees the My Assigned Classes heading', async ({ page }) => {
    // Arrange + Act
    await loginAs(page, 'coach');

    // Assert
    await expect(page.getByTestId('coach-classes-screen')).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText('My Assigned Classes'),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('shows the Upcoming and Past filter buttons after login', async ({ page }) => {
    // Arrange + Act
    await loginAs(page, 'coach');

    // Assert
    await expect(page.getByTestId('filter-upcoming-btn')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('filter-past-btn')).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Flow 2: Open a class → add programming → programming saved ───────────────

test.describe('Coach: Open a class → add programming → programming saved', () => {
  test('navigates to a class and the WOD Programming panel is visible', async ({ page }) => {
    // Arrange
    await loginAs(page, 'coach');
    await expect(page.getByText('My Assigned Classes')).toBeVisible({ timeout: 15_000 });

    // Act — open the first listed class. Ids are seed-dependent, so match the
    // per-row View button by testID prefix.
    const firstViewBtn = page.locator('[data-testid^="coach-class-view-btn-"]').first();
    const hasClasses = await firstViewBtn.isVisible().catch(() => false);

    if (!hasClasses) {
      // No classes assigned to the seeded coach — cannot navigate to details.
      // This assertion is skipped because the DB seed does not create class
      // assignments for the coach test account. A seed fixture that creates
      // a class and assigns it to coach@example.com is required.
      test.skip();
      return;
    }

    await firstViewBtn.click();

    // Assert — details screen rendered with its WOD Programming panel
    await expect(page.getByTestId('coach-class-details-screen')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('WOD Programming')).toBeVisible({ timeout: 15_000 });
  });

  test('fills WOD content and saves programming', async ({ page }) => {
    // Arrange
    await loginAs(page, 'coach');
    await expect(page.getByText('My Assigned Classes')).toBeVisible({ timeout: 15_000 });

    const firstViewBtn = page.locator('[data-testid^="coach-class-view-btn-"]').first();
    const hasClasses = await firstViewBtn.isVisible().catch(() => false);

    if (!hasClasses) {
      // Skipped: no seeded class assignments for coach@example.com.
      // Required: a seed fixture that assigns a published/in-progress class to
      // the coach account so the "View" button is present in the list.
      test.skip();
      return;
    }

    await firstViewBtn.click();
    await expect(page.getByText('WOD Programming')).toBeVisible({ timeout: 15_000 });

    // Act
    // Programming is a single content field (DECISIONS.md → "Programming
    // Content Shape"); there is no separate notes input.
    const programmingInput = page.getByTestId('programming-wod-input');
    await programmingInput.fill('3 rounds: 10 pull-ups, 20 push-ups, 30 air squats');

    await page.getByTestId('programming-save-btn').click();

    // Assert
    // Save feedback is a quiet `Saved` meta line (Clean Ink has no success
    // role — see DESIGN.md), matching the owner ProgrammingPanel. There is no
    // success banner to target by testID.
    await expect(
      page.getByText('Saved', { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Flow 3: Mark attendance ──────────────────────────────────────────────────

test.describe('Coach: Mark attendance', () => {
  test('navigates to Mark Attendance screen from class details', async ({ page }) => {
    // Arrange
    await loginAs(page, 'coach');
    await expect(page.getByText('My Assigned Classes')).toBeVisible({ timeout: 15_000 });

    const firstViewBtn = page.locator('[data-testid^="coach-class-view-btn-"]').first();
    const hasClasses = await firstViewBtn.isVisible().catch(() => false);

    if (!hasClasses) {
      // Skipped: no seeded class assignments for coach@example.com.
      // Required: a seed fixture that assigns a class in 'in_progress' or
      // 'booking_closed' state to the coach account.
      test.skip();
      return;
    }

    await firstViewBtn.click();
    await expect(page.getByText('WOD Programming')).toBeVisible({ timeout: 15_000 });

    // Act — navigate to attendance screen via the Mark Attendance button
    await page.getByTestId('mark-attendance-nav-btn').click();

    // Assert — the attendance screen rendered.
    await expect(page.getByTestId('mark-attendance-screen')).toBeVisible({ timeout: 15_000 });
  });

  test('can submit attendance when athletes are booked', async ({ page }) => {
    // Arrange
    await loginAs(page, 'coach');
    await expect(page.getByText('My Assigned Classes')).toBeVisible({ timeout: 15_000 });

    const firstViewBtn = page.locator('[data-testid^="coach-class-view-btn-"]').first();
    const hasClasses = await firstViewBtn.isVisible().catch(() => false);

    if (!hasClasses) {
      // Skipped: no seeded class assignments.
      test.skip();
      return;
    }

    await firstViewBtn.click();
    await expect(page.getByText('WOD Programming')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('mark-attendance-nav-btn').click();
    await expect(page.getByTestId('mark-attendance-screen')).toBeVisible({ timeout: 15_000 });

    // Every athlete starts marked Present, so flipping the first row's toggle
    // must land on "Absent". Row ids are seed-dependent, hence `.first()`.
    const firstToggle = page.locator('[data-testid^="athlete-toggle-btn-"]').first();
    const hasAthletes = await firstToggle.isVisible().catch(() => false);

    if (hasAthletes) {
      await expect(firstToggle).toHaveText(/Present/);
      await firstToggle.click();
      await expect(firstToggle).toHaveText(/Absent/, { timeout: 5_000 });
    }

    const submitBtn = page.getByTestId('submit-attendance-btn');
    const canSubmit = await submitBtn.isVisible().catch(() => false);

    if (!canSubmit) {
      // Skipped: Submit Attendance button only renders when slots.length > 0.
      // No athletes are booked for the seeded class — cannot assert submission.
      // Required: a seed fixture that creates a booking for the test athlete
      // on the class assigned to coach@example.com.
      test.skip();
      return;
    }

    await submitBtn.click();

    // Assert — quiet meta confirmation line (no success banner by design).
    await expect(
      page.getByText('Attendance submitted successfully.'),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Flow 4: View results ─────────────────────────────────────────────────────

test.describe('Coach: View results', () => {
  test('results panel is visible on class details screen', async ({ page }) => {
    // Arrange
    await loginAs(page, 'coach');
    await expect(page.getByText('My Assigned Classes')).toBeVisible({ timeout: 15_000 });

    const firstViewBtn = page.locator('[data-testid^="coach-class-view-btn-"]').first();
    const hasClasses = await firstViewBtn.isVisible().catch(() => false);

    if (!hasClasses) {
      // Skipped: no seeded class assignments for coach@example.com.
      test.skip();
      return;
    }

    await firstViewBtn.click();

    // MISSING TESTID: results-panel
    // The coach-class-details.tsx screen does not implement a results panel.
    // There is no results section in the current screen — only an Info Panel
    // and a WOD Programming Panel. This assertion cannot be completed until
    // a results panel is added to the screen.
    //
    // Once implemented, add testID="results-panel" to the panel root View and
    // replace this skip with:
    //   await expect(page.getByTestId('results-panel')).toBeVisible({ timeout: 15_000 });
    //
    // Asserting the details screen loaded as a minimal smoke check instead.
    await expect(page.getByText('WOD Programming')).toBeVisible({ timeout: 15_000 });

    // This test.skip documents that the results panel assertion is blocked by
    // missing screen implementation, not just missing testIDs.
    test.skip(true, [
      'Results panel is not implemented in coach-class-details.tsx.',
      'No results section exists in the current screen — only Info Panel and WOD Programming.',
      'Required: add a results panel to coach-class-details.tsx with testID="results-panel".',
    ].join(' '));
  });
});
