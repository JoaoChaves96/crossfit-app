import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { showConfirm, showError } from '@/utils/alert';
import { components } from '@/types/api.gen';
import { AppColors } from '@/constants/theme';
import { formatShortDate, formatTimeRange } from '@/utils/datetime';
import { formatResultValue, formatMetricLabel } from '@/utils/result-format';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { DesktopTopNav } from '@/components/DesktopTopNav';
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
  iconName: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={iconName} size={16} color={AppColors.textGray600} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
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
        <Text style={styles.capacityCount}>{`${bookedCount} / ${capacity}`}</Text>
      </View>
      <View style={styles.capacityBarBg}>
        <View style={[styles.capacityBarFill, { flex: fillRatio }]} />
      </View>
      <Text style={styles.capacityNote}>
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

  const badgeColor = isBooked ? AppColors.successDefault : AppColors.warningOrange;
  const badgeBg = isBooked ? AppColors.successBg50 : AppColors.warningBgOrange;
  const waitlistLabel =
    waitlistPosition != null
      ? `WAITLIST #${waitlistPosition} – You are #${waitlistPosition} in line`
      : 'WAITLISTED – You are on the waitlist';
  const labelText = isBooked
    ? 'BOOKED – Confirmed'
    : isFull
      ? 'Class is full – not booked'
      : waitlistLabel;
  const iconName: keyof typeof Ionicons.glyphMap = isBooked
    ? 'checkmark-circle'
    : 'ban';

  return (
    <View style={styles.sectionGap8}>
      <SectionLabel text="Booking Status" />
      <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
        <Ionicons name={iconName} size={18} color={badgeColor} />
        <Text style={[styles.statusBadgeText, { color: badgeColor }]}>{labelText}</Text>
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
      <Text style={styles.wodTitle}>WOD</Text>
      <View style={styles.programBlock}>
        {isLoading ? (
          <ActivityIndicator size="small" color={AppColors.textGray500} />
        ) : content && content.trim().length > 0 ? (
          <Text style={styles.programText}>{content}</Text>
        ) : (
          <Text style={styles.programText}>
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
        <ActivityIndicator size="small" color={AppColors.textGray500} />
      ) : result ? (
        <View style={styles.resultRow}>
          <Text style={styles.resultMetric}>{formatMetricLabel(result.metricType)}</Text>
          <Text style={styles.resultValue}>{formatResultValue(result)}</Text>
        </View>
      ) : (
        <Text style={styles.programText}>You haven&apos;t logged a result for this class.</Text>
      )}
    </View>
  );
}

// --- Loading / Error screens ---

function LoadingScreen() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={AppColors.textDark3} />
    </View>
  );
}

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity style={styles.errorBackBtn} onPress={onBack}>
        <Text style={styles.errorBackBtnText}>Go Back</Text>
      </TouchableOpacity>
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

  useEffect(() => {
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

  const bookBtnLabel =
    bookingStatus === 'full' ? 'JOIN WAITLIST' : 'BOOK CLASS';

  const formattedDate = `${formatShortDate(classData.scheduledDate)} · ${formatTimeRange(classData.scheduledTime, classData.duration)}`;
  const coachLabel = `Coach: ${classData.coachName}`;

  // ── Action buttons (shared) ────────────────────────────────────────────────
  const actionButtons = (
    <View style={isDesktop ? desktopStyles.actionContainer : styles.actionContainer}>
      {bookingStatus === 'waitlisted' && (
        <TouchableOpacity
          testID="leave-waitlist-btn"
          style={styles.leaveWaitlistBtn}
          onPress={handleCancel}
          disabled={isSubmitting}
          activeOpacity={0.85}>
          {isSubmitting ? (
            <ActivityIndicator color={AppColors.errorDefault} size="small" />
          ) : (
            <Text style={styles.leaveWaitlistBtnText}>LEAVE WAITLIST</Text>
          )}
        </TouchableOpacity>
      )}

      {bookingStatus === 'booked' && (
        <TouchableOpacity
          testID="cancel-booking-btn"
          style={styles.cancelBtn}
          onPress={handleCancel}
          disabled={isSubmitting}
          activeOpacity={0.85}>
          {isSubmitting ? (
            <ActivityIndicator color={AppColors.backgroundWhite} size="small" />
          ) : (
            <Text style={styles.cancelBtnText}>CANCEL BOOKING</Text>
          )}
        </TouchableOpacity>
      )}

      {(canBook || canJoinWaitlist) && (
        <TouchableOpacity
          testID="book-btn"
          style={styles.bookBtn}
          onPress={handleBook}
          disabled={isSubmitting}
          activeOpacity={0.85}>
          {isSubmitting ? (
            <ActivityIndicator color={AppColors.backgroundWhite} size="small" />
          ) : (
            <Text style={styles.bookBtnText}>{bookBtnLabel}</Text>
          )}
        </TouchableOpacity>
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
            <TouchableOpacity style={desktopStyles.backRow} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={AppColors.textPrimary} />
              <Text style={desktopStyles.backText}>Back to Schedule</Text>
            </TouchableOpacity>

            {/* Class name */}
            <Text style={desktopStyles.className}>{classData.classTypeName}</Text>

            {/* Meta info */}
            <View style={styles.metaGroup}>
              <MetaRow iconName="calendar-outline" text={formattedDate} />
              <MetaRow iconName="person-outline" text={coachLabel} />
              {classData.spaceName ? (
                <MetaRow iconName="location-outline" text={classData.spaceName} />
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
                <Text style={styles.mutationErrorText}>{mutationError}</Text>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={AppColors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Class Details</Text>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>

        {/* Class name */}
        <Text style={styles.className}>{classData.classTypeName}</Text>

        {/* Meta info */}
        <View style={styles.metaGroup}>
          <MetaRow iconName="calendar-outline" text={formattedDate} />
          <MetaRow iconName="person-outline" text={coachLabel} />
          {classData.spaceName ? (
            <MetaRow iconName="location-outline" text={classData.spaceName} />
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
            <Text style={styles.mutationErrorText}>{mutationError}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action button */}
      {actionButtons}
    </View>
  );
}
