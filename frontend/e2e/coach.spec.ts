/**
 * Coach E2E tests
 *
 * Covers 4 flows:
 *   1. Login → assigned classes list loads
 *   2. Open a class → add programming → programming saved
 *   3. Mark attendance
 *   4. View results
 *
 * MISSING TESTID NOTICE:
 * The coach screens (coach-classes.tsx, coach-class-details.tsx,
 * coach-mark-attendance.tsx) were not instrumented with testID attributes
 * during the setup task. All three files contain zero testID props.
 *
 * Consequence per TEST_ONLY rules:
 *   - Tests that depend on missing testIDs fall back to text-based selectors
 *     where a unique visible string exists.
 *   - Assertions that cannot be reliably made without a testID are skipped
 *     with a comment explaining the blocker.
 *   - No production code is modified by this file.
 *
 * Required testIDs to unblock full coverage (to be added by BUG_FIX/FEATURE task):
 *   coach-classes-screen        — root view of CoachClassesScreen
 *   coach-class-list            — ScrollView containing class rows
 *   coach-class-row-{id}        — each ClassRow view
 *   coach-class-view-btn-{id}   — View button inside each ClassRow
 *   coach-class-details-screen  — root view of CoachClassDetailsScreen
 *   programming-wod-input       — TextInput for WOD content
 *   programming-notes-input     — TextInput for notes
 *   programming-save-btn        — Save Programming TouchableOpacity
 *   programming-success-banner  — success banner View
 *   programming-wod-content     — displayed WOD text View after save
 *   mark-attendance-screen      — root view of CoachMarkAttendanceScreen
 *   athlete-toggle-btn-{id}     — Present/Absent toggle per athlete row
 *   submit-attendance-btn       — Submit Attendance TouchableOpacity
 *   attendance-success-banner   — success banner View after submission
 *   results-panel               — results section (not yet implemented in screens)
 */

import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

// ─── Flow 1: Login → assigned classes list loads ──────────────────────────────

test.describe('Coach: Login → assigned classes list loads', () => {
  test('logs in as coach and sees the My Assigned Classes heading', async ({ page }) => {
    // Arrange + Act
    await loginAs(page, 'coach');

    // Assert
    // MISSING TESTID: coach-classes-screen
    // Falling back to visible heading text as the only stable anchor.
    // Once testID="coach-classes-screen" is added to the root View in
    // coach-classes.tsx, replace this with:
    //   await expect(page.getByTestId('coach-classes-screen')).toBeVisible();
    await expect(
      page.getByText('My Assigned Classes'),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('shows the Upcoming and Past filter buttons after login', async ({ page }) => {
    // Arrange + Act
    await loginAs(page, 'coach');

    // Assert
    // MISSING TESTID: filter buttons have no testID attributes.
    // Falling back to button text. Add testID="filter-upcoming-btn" and
    // testID="filter-past-btn" to the TouchableOpacity elements in
    // coach-classes.tsx to use getByTestId() here.
    await expect(page.getByText('Upcoming')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Past')).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Flow 2: Open a class → add programming → programming saved ───────────────

test.describe('Coach: Open a class → add programming → programming saved', () => {
  test('navigates to a class and the WOD Programming panel is visible', async ({ page }) => {
    // Arrange
    await loginAs(page, 'coach');
    await expect(page.getByText('My Assigned Classes')).toBeVisible({ timeout: 15_000 });

    // Act
    // MISSING TESTID: coach-class-view-btn-{id}
    // There is no testID on the View button inside ClassRow.
    // Clicking the first visible "View" button by text as a fallback.
    // Add testID="coach-class-view-btn-{gymClass.id}" to the TouchableOpacity
    // in ClassRow (coach-classes.tsx) so each row is individually addressable.
    const firstViewBtn = page.getByText('View').first();
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

    // Assert — WOD Programming panel heading is present on the details screen
    // MISSING TESTID: coach-class-details-screen
    // Falling back to panel title text.
    await expect(page.getByText('WOD Programming')).toBeVisible({ timeout: 15_000 });
  });

  test('fills WOD content and saves programming', async ({ page }) => {
    // Arrange
    await loginAs(page, 'coach');
    await expect(page.getByText('My Assigned Classes')).toBeVisible({ timeout: 15_000 });

    const firstViewBtn = page.getByText('View').first();
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
    // MISSING TESTID: programming-wod-input
    // The TextInput for WOD content in coach-class-details.tsx has no testID.
    // Falling back to placeholder text. Add testID="programming-wod-input" to
    // that TextInput to use page.getByTestId() here.
    const wodInput = page.getByPlaceholder('Describe the workout…');
    await wodInput.fill('3 rounds: 10 pull-ups, 20 push-ups, 30 air squats');

    // MISSING TESTID: programming-save-btn
    // The Save Programming TouchableOpacity has no testID.
    // Falling back to button text.
    await page.getByText('Save Programming').click();

    // Assert
    // MISSING TESTID: programming-success-banner
    // The success banner View has no testID. Falling back to success message text.
    // Add testID="programming-success-banner" to the success banner View in
    // coach-class-details.tsx to use getByTestId() here.
    await expect(
      page.getByText('Programming saved successfully.'),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Flow 3: Mark attendance ──────────────────────────────────────────────────

test.describe('Coach: Mark attendance', () => {
  test('navigates to Mark Attendance screen from class details', async ({ page }) => {
    // Arrange
    await loginAs(page, 'coach');
    await expect(page.getByText('My Assigned Classes')).toBeVisible({ timeout: 15_000 });

    const firstViewBtn = page.getByText('View').first();
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
    // MISSING TESTID: mark-attendance-nav-btn
    // The TouchableOpacity that routes to /coach-mark-attendance has no testID
    // in coach-class-details.tsx. Falling back to button text.
    await page.getByText('Mark Attendance').click();

    // Assert — attendance screen heading contains "Attendance"
    // MISSING TESTID: mark-attendance-screen
    await expect(page.getByText(/Attendance/)).toBeVisible({ timeout: 15_000 });
  });

  test('can submit attendance when athletes are booked', async ({ page }) => {
    // Arrange
    await loginAs(page, 'coach');
    await expect(page.getByText('My Assigned Classes')).toBeVisible({ timeout: 15_000 });

    const firstViewBtn = page.getByText('View').first();
    const hasClasses = await firstViewBtn.isVisible().catch(() => false);

    if (!hasClasses) {
      // Skipped: no seeded class assignments.
      test.skip();
      return;
    }

    await firstViewBtn.click();
    await expect(page.getByText('WOD Programming')).toBeVisible({ timeout: 15_000 });
    await page.getByText('Mark Attendance').click();
    await expect(page.getByText(/Attendance/)).toBeVisible({ timeout: 15_000 });

    // MISSING TESTID: athlete-toggle-btn-{id}
    // AthleteRow toggle buttons have no testID. Without testIDs we cannot
    // reliably target individual athlete rows.
    // Add testID={`athlete-toggle-btn-${slot.athleteUserId}`} to the
    // TouchableOpacity in AthleteRow (coach-mark-attendance.tsx).
    //
    // Falling back: click the first visible "Absent" toggle if one exists.
    const firstAbsentBtn = page.getByText('Absent').first();
    const hasAthletes = await firstAbsentBtn.isVisible().catch(() => false);

    if (hasAthletes) {
      await firstAbsentBtn.click();
      // After toggle the label should flip to "Present"
      await expect(page.getByText('Present').first()).toBeVisible({ timeout: 5_000 });
    }

    // MISSING TESTID: submit-attendance-btn
    // The Submit Attendance TouchableOpacity has no testID.
    const submitBtn = page.getByText('Submit Attendance');
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

    // Assert
    // MISSING TESTID: attendance-success-banner
    // The success banner View in coach-mark-attendance.tsx has no testID.
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

    const firstViewBtn = page.getByText('View').first();
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
