import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

// ─── Flow 1: Login → schedule loads ───────────────────────────────────────────

test.describe('Flow 1: Login → schedule loads', () => {
  test('athlete can log in and see the schedule screen', async ({ page }) => {
    // Arrange + Act
    await loginAs(page, 'athlete');

    // Assert — the Schedule tab must be active after login redirect.
    // NOTE: No testID exists on ClassCard or the schedule list container.
    // We verify the tab bar tab is active and the page does not show an error.
    // A class card is identified by its "Book Class" or status badge text, or by
    // the absence of a hard error state. Both empty-state and list-state are
    // acceptable — we assert the screen rendered without a 5xx or crash.
    await expect(page.getByTestId('tab-schedule')).toBeVisible();

    // The page must not contain an unhandled error message.
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
});

// ─── Flow 2: Book a class ─────────────────────────────────────────────────────

test.describe('Flow 2: Book a class', () => {
  test('athlete books a class and it appears as booked in My Bookings', async ({ page }) => {
    // Arrange
    await loginAs(page, 'athlete');

    // Navigate to schedule tab (already there after login, but be explicit)
    await page.getByTestId('tab-schedule').click();

    // NOTE: ClassCard TouchableOpacity has no testID. We locate the first
    // "Book Class" button by its visible text to click through to class details.
    const bookClassButton = page.getByText('Book Class').first();

    // If no class card exists (empty schedule), this test cannot complete.
    // The assertion below will fail with a clear message — do not fabricate a pass.
    await expect(bookClassButton).toBeVisible({ timeout: 15_000 });

    // Act — open class details and book
    await bookClassButton.click();

    // Class Details screen uses testID="book-btn"
    await expect(page.getByTestId('book-btn')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('book-btn').click();

    // Wait for the booking to complete — the book button should disappear and
    // cancel-booking-btn should appear
    await expect(page.getByTestId('cancel-booking-btn')).toBeVisible({ timeout: 10_000 });

    // Navigate to My Bookings
    await page.getByTestId('tab-my-bookings').click();

    // NOTE: UpcomingCard has no testID. We verify the "BOOKED" badge text is
    // present, which is rendered by StatusBadge with label "BOOKED".
    await expect(page.getByText('BOOKED')).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Flow 3: Cancel a booking ────────────────────────────────────────────────

test.describe('Flow 3: Cancel a booking', () => {
  test('athlete cancels a booking from class details and it is no longer confirmed', async ({ page }) => {
    // Arrange — book a class first, then cancel it
    await loginAs(page, 'athlete');

    await page.getByTestId('tab-schedule').click();

    // NOTE: No testID on schedule cards. Locate first "Book Class" text button.
    const bookClassButton = page.getByText('Book Class').first();
    await expect(bookClassButton).toBeVisible({ timeout: 15_000 });
    await bookClassButton.click();

    // Book
    await expect(page.getByTestId('book-btn')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('book-btn').click();
    await expect(page.getByTestId('cancel-booking-btn')).toBeVisible({ timeout: 10_000 });

    // Act — cancel from class details
    await page.getByTestId('cancel-booking-btn').click();

    // A confirmation dialog appears (showConfirm uses browser alert/confirm on web).
    // Accept it.
    page.once('dialog', (dialog) => dialog.accept());

    // After cancellation the cancel button should be gone and book-btn should return
    await expect(page.getByTestId('book-btn')).toBeVisible({ timeout: 10_000 });

    // Navigate to My Bookings and confirm no "BOOKED" badge is present
    await page.getByTestId('tab-my-bookings').click();

    // NOTE: There is no testID on UpcomingCard. We check that the "BOOKED" badge
    // text does not appear (or that an empty state message is shown).
    // If other bookings still exist this assertion cannot distinguish them;
    // the test is only reliable when the athlete has exactly one booking.
    // This is consistent with DB reset in globalSetup.
    await expect(page.getByText('BOOKED')).not.toBeVisible({ timeout: 10_000 });
  });
});

// ─── Flow 4: Join waitlist ────────────────────────────────────────────────────

test.describe('Flow 4: Join waitlist (when class is full)', () => {
  test('athlete joins waitlist for a full class and sees waitlisted badge in My Bookings', async ({ page }) => {
    // Arrange
    await loginAs(page, 'athlete');

    await page.getByTestId('tab-schedule').click();

    // NOTE: No testID on schedule cards. Locate "Join Waitlist" button — only
    // present when a class is full. If no full class exists, skip with a comment.
    // The test is written to FAIL (not fabricate a pass) if the element is absent.
    const joinWaitlistCardButton = page.getByText('Join Waitlist').first();

    // If the schedule has no full class this assertion fails — intentional per spec.
    await expect(joinWaitlistCardButton).toBeVisible({ timeout: 15_000 });

    // Act — click the card-level "Join Waitlist" button which navigates to class details
    await joinWaitlistCardButton.click();

    // Class details renders a "book-btn" whose label is "JOIN WAITLIST" when class is full
    const bookBtn = page.getByTestId('book-btn');
    await expect(bookBtn).toBeVisible({ timeout: 10_000 });
    await expect(bookBtn).toContainText('WAITLIST');
    await bookBtn.click();

    // After joining, leave-waitlist-btn should appear
    await expect(page.getByTestId('leave-waitlist-btn')).toBeVisible({ timeout: 10_000 });

    // Navigate to My Bookings
    await page.getByTestId('tab-my-bookings').click();

    // NOTE: getUpcomingBadgeConfig renders label "WAITLISTED #N" or "WAITLISTED"
    // There is no testID on the badge. We match by partial text.
    await expect(page.getByText(/WAITLISTED/)).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Flow 5: Training History ─────────────────────────────────────────────────

test.describe('Flow 5: Training History tab loads', () => {
  test('athlete navigates to Training History and screen loads without error', async ({ page }) => {
    // Arrange + Act
    await loginAs(page, 'athlete');

    // Navigate to the Training History tab
    await page.getByTestId('tab-training-history').click();

    // Assert — screen must render either empty state or a list without crashing.
    // NOTE: Neither the header Text "Training History" nor the EmptyState View
    // have a testID. We assert by visible text from the screen's header or empty state.
    // "Training History" is the headerTitle text rendered in a <Text> element.
    await expect(page.getByText('Training History')).toBeVisible({ timeout: 10_000 });

    // The page must not show an error state text
    await expect(page.getByText('Failed to load training history')).not.toBeVisible();
  });
});
