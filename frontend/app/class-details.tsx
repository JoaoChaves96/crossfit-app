import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { showConfirm, showError } from '@/utils/alert';
import { components } from '@/types/api.gen';
import { Ink, Accent, Status, Space } from '@/constants/design';
import { SafeScreen } from '@/components/SafeScreen';
import { formatShortDate, formatTimeRange } from '@/utils/datetime';
import { formatResultValue, formatMetricLabel } from '@/utils/result-format';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useRefreshOnAppActive } from '@/hooks/useRefreshOnAppActive';
import { useNotifications } from '@/hooks/useNotifications';
import { DesktopTopNav } from '@/components/DesktopTopNav';
import { Text, Icon, IconName, StatusChip, ChipTone, Button } from '@/components/cleanink';
import { styles, desktopStyles } from './class-details.styles';

// --- Types ---
type ClassDetailsItem = components['schemas']['ClassScheduleItemDto'];
type GetUserBookingsResponse = components['schemas']['GetUserBookingsResponseDto'];
type GetClassScheduleResponse = components['schemas']['GetClassScheduleResponseDto'];
type GetClassProgrammingResponse = components['schemas']['GetClassProgrammingResponseDto'];
type GetMyClassResultResponse = components['schemas']['GetMyClassResultResponseDto'];
type OwnResult = components['schemas']['ClassResultItemDto'];

type BookingStatus = 'booked' | 'waitlisted' | 'open' | 'full';

// --- Sub-components ---

function MetaRow({
  iconName,
  text,
}: {
  iconName: IconName;
  text: string;
}) {
  return (
    <View style={styles.metaRow}>
      <Icon name={iconName} size={16} tone={Ink.faint} />
      <Text size="body" tone={Ink.muted}>{text}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text size="label" weight="semibold" tone={Ink.muted} upper tracking="wide">
      {text}
    </Text>
  );
}

function CapacitySection({
  capacity,
  bookedCount,
}: {
  capacity: number;
  bookedCount: number;
}) {
  const fillRatio = capacity > 0 ? bookedCount / capacity : 0;
  const remaining = capacity - bookedCount;
  const pct = Math.round(fillRatio * 100);

  return (
    <View style={styles.sectionGap8}>
      <SectionLabel text="Capacity" />
      <View style={styles.capacityHeader}>
        <Text size="title" weight="semibold">{`${bookedCount} / ${capacity}`}</Text>
      </View>
      {/* Monochrome fill on a sunken track — capacity reads through weight, not hue. */}
      <View style={styles.capacityBarBg}>
        <View style={[styles.capacityBarFill, { flex: fillRatio }]} />
      </View>
      <Text size="meta" tone={Ink.muted}>
        {`${pct}% full · ${remaining} spot${remaining !== 1 ? 's' : ''} remaining`}
      </Text>
    </View>
  );
}

function BookingStatusSection({
  status,
  waitlistPosition,
}: {
  status: BookingStatus;
  waitlistPosition: number | null;
}) {
  const isBooked = status === 'booked';
  const isWaitlisted = status === 'waitlisted';
  const isFull = status === 'full';

  if (!isBooked && !isWaitlisted && !isFull) return null;

  // Tone + short label mirror the schedule pilot's CHIP_CONFIG exactly:
  // booked/waitlisted = accent (the athlete's own held spot), full = danger.
  const chip: { tone: ChipTone; label: string } = isBooked
    ? { tone: 'accent', label: 'Booked' }
    : isWaitlisted
      ? { tone: 'accent', label: 'Waitlisted' }
      : { tone: 'danger', label: 'Full' };

  const waitlistLabel =
    waitlistPosition != null
      ? `WAITLIST #${waitlistPosition} – You are #${waitlistPosition} in line`
      : 'WAITLISTED – You are on the waitlist';
  const labelText = isBooked
    ? 'BOOKED – Confirmed'
    : isFull
      ? 'Class is full – not booked'
      : waitlistLabel;
  const detailTone = isFull ? Status.danger : isBooked ? Ink.strong : Ink.muted;

  return (
    <View style={styles.sectionGap8}>
      <SectionLabel text="Booking Status" />
      <View style={styles.statusRow}>
        <StatusChip tone={chip.tone} label={chip.label} />
        <Text size="body" weight="semibold" tone={detailTone} style={styles.statusText}>
          {labelText}
        </Text>
      </View>
    </View>
  );
}

function ProgrammingSection({
  content,
  isLoading,
}: {
  content: string | null;
  isLoading: boolean;
}) {
  return (
    <View style={styles.sectionGap10}>
      <SectionLabel text="Programming" />
      <Text size="body" weight="semibold" tone={Ink.muted}>WOD</Text>
      <View style={styles.programBlock}>
        {isLoading ? (
          <ActivityIndicator size="small" color={Ink.faint} />
        ) : content && content.trim().length > 0 ? (
          <Text size="body" tone={Ink.muted} style={styles.programText}>{content}</Text>
        ) : (
          <Text size="body" tone={Ink.muted} style={styles.programText}>
            No programming has been posted for this class yet.
          </Text>
        )}
      </View>
    </View>
  );
}

function ResultsSection({
  result,
  isLoading,
}: {
  result: OwnResult | null;
  isLoading: boolean;
}) {
  return (
    <View style={styles.sectionGap10}>
      <SectionLabel text="Recent Results" />
      {isLoading ? (
        <ActivityIndicator size="small" color={Ink.faint} />
      ) : result ? (
        <View style={styles.resultRow}>
          <Text size="body" tone={Ink.muted}>{formatMetricLabel(result.metricType)}</Text>
          <Text size="body" weight="semibold">{formatResultValue(result)}</Text>
        </View>
      ) : (
        <Text size="body" tone={Ink.muted} style={styles.programText}>You haven&apos;t logged a result for this class.</Text>
      )}
    </View>
  );
}

// --- Loading / Error screens ---

function LoadingScreen() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={Accent.base} />
    </View>
  );
}

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <View style={styles.centered}>
      <Text testID="class-details-error" size="body" tone={Status.danger} style={{ textAlign: 'center' }}>{message}</Text>
      <Button variant="quiet" label="Go Back" onPress={onBack} />
    </View>
  );
}

// --- Main screen ---

export default function ClassDetailsScreen() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { currentGymId, isLoading: gymLoading } = useGym();
  const { classId } = useLocalSearchParams();
  const { isDesktop } = useResponsiveLayout();
  const { refresh: refreshNotifications } = useNotifications();

  const [classData, setClassData] = useState<ClassDetailsItem | null>(null);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>('open');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [programming, setProgramming] = useState<string | null>(null);
  const [isLoadingProgramming, setIsLoadingProgramming] = useState(true);
  const [ownResult, setOwnResult] = useState<OwnResult | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(true);

  const loadAll = useCallback(() => {
    if (authLoading || gymLoading || !token || !currentGymId || !classId) {
      setIsLoading(false);
      return;
    }

    const client = createApiClient({ token });

    const load = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const [scheduleRes, bookingsRes] = await Promise.all([
          client.get<GetClassScheduleResponse>(`/api/gyms/${currentGymId}/classes`),
          client.get<GetUserBookingsResponse>('/api/me/bookings'),
        ]);

        const found = scheduleRes.classes.find((c) => c.id === classId);
        if (!found) {
          setFetchError('Class not found');
          return;
        }

        const booking = bookingsRes.bookings.find((b) => b.classId === classId);
        const resolved: BookingStatus = booking
          ? booking.status
          : found.bookedCount >= found.capacity
            ? 'full'
            : 'open';

        setClassData(found);
        setBookingStatus(resolved);
        setBookingId(booking?.id ?? null);
        setWaitlistPosition(booking?.waitlistPosition ?? null);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Failed to load class details');
      } finally {
        setIsLoading(false);
      }
    };

    // Programming + the athlete's own result are secondary content: a failure
    // here should not blank the whole screen, so they load independently and
    // swallow their own errors (rendering the empty/placeholder state instead).
    const loadProgramming = async () => {
      setIsLoadingProgramming(true);
      try {
        const res = await client.get<GetClassProgrammingResponse>(
          `/api/gyms/${currentGymId}/classes/${classId}/programming`,
        );
        setProgramming(res.content);
      } catch {
        setProgramming(null);
      } finally {
        setIsLoadingProgramming(false);
      }
    };

    const loadOwnResult = async () => {
      setIsLoadingResult(true);
      try {
        const res = await client.get<GetMyClassResultResponse>(
          `/api/gyms/${currentGymId}/classes/${classId}/results/me`,
        );
        setOwnResult(res.result);
      } catch {
        setOwnResult(null);
      } finally {
        setIsLoadingResult(false);
      }
    };

    load();
    loadProgramming();
    loadOwnResult();
  }, [authLoading, gymLoading, token, currentGymId, classId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Refetch class details on foreground resume — the booking/waitlist state may
  // have changed while the app was backgrounded (e.g. a waitlist promotion).
  useRefreshOnAppActive(loadAll);

  const handleBook = async () => {
    if (!token || !currentGymId || !classId) return;
    setIsSubmitting(true);
    setMutationError(null);
    try {
      const client = createApiClient({ token });
      await client.post(`/api/gyms/${currentGymId}/classes/${classId}/bookings`, {
        classId,
        gymId: currentGymId,
      });
      const bookingsRes = await client.get<GetUserBookingsResponse>('/api/me/bookings');
      const booking = bookingsRes.bookings.find((b) => b.classId === classId);
      if (booking) {
        setBookingStatus(booking.status);
        setBookingId(booking.id);
        setWaitlistPosition(booking.waitlistPosition ?? null);
      }
      // Booking creates a server-side notification; refresh the shared badge
      // count once so it updates deterministically rather than on next mount.
      void refreshNotifications();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to book class';
      setMutationError(msg);
      showError('Booking Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    const isWaitlisted = bookingStatus === 'waitlisted';
    showConfirm(
      isWaitlisted ? 'Leave Waitlist' : 'Cancel Booking',
      isWaitlisted
        ? 'Are you sure you want to leave the waitlist?'
        : 'Are you sure you want to cancel this booking?',
      [
      { text: isWaitlisted ? 'Stay on Waitlist' : 'Keep Booking', style: 'cancel', onPress: () => {} },
      {
        text: isWaitlisted ? 'Leave Waitlist' : 'Cancel Booking',
        style: 'destructive',
        onPress: async () => {
          if (!token || !currentGymId || !bookingId) {
            showError('Error', 'Missing required information for cancellation');
            return;
          }
          setIsSubmitting(true);
          setMutationError(null);
          try {
            const client = createApiClient({ token });
            await client.delete(`/api/gyms/${currentGymId}/classes/bookings/${bookingId}`);
            const bookingsRes = await client.get<GetUserBookingsResponse>('/api/me/bookings');
            const booking = bookingsRes.bookings.find((b) => b.classId === classId);
            if (booking) {
              setBookingStatus(booking.status);
              setBookingId(booking.id);
              setWaitlistPosition(booking.waitlistPosition ?? null);
            } else {
              setBookingId(null);
              setWaitlistPosition(null);
              setBookingStatus(
                classData && classData.bookedCount >= classData.capacity ? 'full' : 'open',
              );
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to cancel booking';
            setMutationError(msg);
            showError('Cancellation Error', msg);
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  if (isLoading) return <LoadingScreen />;
  if (fetchError || !classData) {
    return (
      <ErrorScreen
        message={fetchError ?? 'Class not found'}
        onBack={() => router.back()}
      />
    );
  }

  const isClassPublished = classData.state === 'published';
  const canBook = isClassPublished && bookingStatus === 'open';
  const canJoinWaitlist = isClassPublished && bookingStatus === 'full';
  const canCancel = bookingStatus === 'booked' || bookingStatus === 'waitlisted';

  const formattedDate = `${formatShortDate(classData.scheduledDate)} · ${formatTimeRange(classData.scheduledTime, classData.duration)}`;
  const coachLabel = `Coach: ${classData.coachName}`;

  // ── Action buttons (shared) ────────────────────────────────────────────────
  // Variants mirror the schedule pilot's CardActionButton: primary book,
  // danger cancel, quiet waitlist. Labels/testIDs are preserved verbatim.
  const actionButtons = (
    <View style={isDesktop ? desktopStyles.actionContainer : styles.actionContainer}>
      {bookingStatus === 'waitlisted' && (
        <Button
          testID="leave-waitlist-btn"
          variant="quiet"
          label="LEAVE WAITLIST"
          loading={isSubmitting}
          onPress={handleCancel}
        />
      )}

      {bookingStatus === 'booked' && (
        <Button
          testID="cancel-booking-btn"
          variant="danger"
          label="CANCEL BOOKING"
          loading={isSubmitting}
          onPress={handleCancel}
        />
      )}

      {canBook && (
        <Button
          testID="book-btn"
          variant="primary"
          label="BOOK CLASS"
          loading={isSubmitting}
          onPress={handleBook}
        />
      )}

      {canJoinWaitlist && (
        <Button
          testID="book-btn"
          variant="quiet"
          label="JOIN WAITLIST"
          loading={isSubmitting}
          onPress={handleBook}
        />
      )}
    </View>
  );

  // ── Desktop layout (side-by-side) ─────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={desktopStyles.screen}>
        <DesktopTopNav />
        <ScrollView contentContainerStyle={desktopStyles.contentArea} showsVerticalScrollIndicator={false}>
          {/* Left column — class info + booking */}
          <View style={desktopStyles.leftCol}>
            {/* Back row */}
            <Pressable style={desktopStyles.backRow} onPress={() => router.back()}>
              <Icon name="back" size={20} tone={Ink.strong} />
              <Text size="body" weight="medium" tone={Ink.muted}>Back to Schedule</Text>
            </Pressable>

            {/* Class name */}
            <Text size="display" weight="bold" tracking="tight">{classData.classTypeName}</Text>

            {/* Meta info */}
            <View style={styles.metaGroup}>
              <MetaRow iconName="calendar" text={formattedDate} />
              <MetaRow iconName="coach" text={coachLabel} />
              {classData.spaceName ? (
                <MetaRow iconName="place" text={classData.spaceName} />
              ) : null}
            </View>

            <Divider />

            {/* Capacity */}
            <CapacitySection capacity={classData.capacity} bookedCount={classData.bookedCount} />

            <Divider />

            {/* Booking Status */}
            <BookingStatusSection status={bookingStatus} waitlistPosition={waitlistPosition} />

            {/* Action buttons in left column */}
            {actionButtons}

            {/* Mutation error inline */}
            {mutationError !== null && (
              <View style={styles.mutationErrorCard}>
                <Text size="body" weight="medium" tone={Status.danger}>{mutationError}</Text>
              </View>
            )}
          </View>

          {/* Right column — programming + results */}
          <View style={desktopStyles.rightCol}>
            <View style={desktopStyles.rightCard}>
              <ProgrammingSection content={programming} isLoading={isLoadingProgramming} />
            </View>
            <View style={desktopStyles.rightCard}>
              <ResultsSection result={ownResult} isLoading={isLoadingResult} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {/* Header */}
      <SafeScreen style={styles.header} extraTopPadding={Space.md}>
        <Pressable onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="back" size={24} tone={Ink.strong} />
        </Pressable>
        <Text size="title" weight="semibold">Class Details</Text>
      </SafeScreen>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>

        {/* Class name */}
        <Text size="screen" weight="bold" tracking="tight">{classData.classTypeName}</Text>

        {/* Meta info */}
        <View style={styles.metaGroup}>
          <MetaRow iconName="calendar" text={formattedDate} />
          <MetaRow iconName="coach" text={coachLabel} />
          {classData.spaceName ? (
            <MetaRow iconName="place" text={classData.spaceName} />
          ) : null}
        </View>

        <Divider />

        {/* Capacity */}
        <CapacitySection capacity={classData.capacity} bookedCount={classData.bookedCount} />

        <Divider />

        {/* Booking Status */}
        <BookingStatusSection status={bookingStatus} waitlistPosition={waitlistPosition} />

        {(canCancel || bookingStatus === 'full') && <Divider />}

        {/* Programming */}
        <ProgrammingSection content={programming} isLoading={isLoadingProgramming} />

        <Divider />

        {/* Results */}
        <ResultsSection result={ownResult} isLoading={isLoadingResult} />

        {/* Mutation error inline */}
        {mutationError !== null && (
          <View style={styles.mutationErrorCard}>
            <Text size="body" weight="medium" tone={Status.danger}>{mutationError}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action button */}
      {actionButtons}
    </View>
  );
}
