import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { showConfirm, showError } from '@/utils/alert';
import { components } from '@/types/api.gen';

// --- Design tokens ---
const COLORS = {
  bg: '#FFFFFF',
  fontPrimary: '#1A1A1A',
  fontSecondary: '#666666',
  fontTertiary: '#999999',
  border: '#E0E0E0',
  divider: '#E5E5E5',
  accent: '#333333',
  danger: '#DC2626',
  badgeBooked: '#059669',
  badgeBookedBg: '#ECFDF5',
  badgeWaitlisted: '#E65100',
  badgeWaitlistedBg: '#FFF3E0',
  capacityBar: '#F59E0B',
  capacityBarBg: '#E5E5E5',
  black: '#000000',
  white: '#FFFFFF',
  errorBg: '#FFEBEE',
  errorText: '#C62828',
} as const;

// --- Types ---
type ClassDetailsItem = components['schemas']['ClassScheduleItemDto'];
type GetUserBookingsResponse = components['schemas']['GetUserBookingsResponseDto'];
type GetClassScheduleResponse = components['schemas']['GetClassScheduleResponseDto'];

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
      <Ionicons name={iconName} size={16} color={COLORS.fontSecondary} />
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

function BookingStatusSection({ status }: { status: BookingStatus }) {
  const isBooked = status === 'booked';
  const isWaitlisted = status === 'waitlisted';

  if (!isBooked && !isWaitlisted) return null;

  const badgeColor = isBooked ? COLORS.badgeBooked : COLORS.badgeWaitlisted;
  const badgeBg = isBooked ? COLORS.badgeBookedBg : COLORS.badgeWaitlistedBg;
  const labelText = isBooked ? 'BOOKED – Confirmed' : 'WAITLISTED';
  const iconName: keyof typeof Ionicons.glyphMap = isBooked
    ? 'checkmark-circle'
    : 'time-outline';

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

function ProgrammingSection() {
  return (
    <View style={styles.sectionGap10}>
      <SectionLabel text="Programming" />
      <Text style={styles.wodTitle}>WOD</Text>
      <View style={styles.programBlock}>
        <Text style={styles.programSubLabel}>Warm-up</Text>
        <Text style={styles.programText}>See class details provided by your coach.</Text>
      </View>
    </View>
  );
}

function ResultsSection() {
  return (
    <View style={styles.sectionGap10}>
      <SectionLabel text="Recent Results" />
    </View>
  );
}

// --- Loading / Error screens ---

function LoadingScreen() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={COLORS.accent} />
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

  const [classData, setClassData] = useState<ClassDetailsItem | null>(null);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>('open');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

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
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Failed to load class details');
      } finally {
        setIsLoading(false);
      }
    };

    load();
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
    showConfirm('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep Booking', style: 'cancel', onPress: () => {} },
      {
        text: 'Cancel Booking',
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
            } else {
              setBookingId(null);
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

  const formattedDate = `${classData.scheduledDate} · ${classData.scheduledTime}`;
  const coachLabel = `Coach: ${classData.coachName}`;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={COLORS.black} />
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
        </View>

        <Divider />

        {/* Capacity */}
        <CapacitySection capacity={classData.capacity} bookedCount={classData.bookedCount} />

        <Divider />

        {/* Booking Status */}
        <BookingStatusSection status={bookingStatus} />

        {canCancel && <Divider />}

        {/* Programming */}
        <ProgrammingSection />

        <Divider />

        {/* Results */}
        <ResultsSection />

        {/* Mutation error inline */}
        {mutationError !== null && (
          <View style={styles.mutationErrorCard}>
            <Text style={styles.mutationErrorText}>{mutationError}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action button */}
      <View style={styles.actionContainer}>
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            disabled={isSubmitting}
            activeOpacity={0.85}>
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.cancelBtnText}>CANCEL BOOKING</Text>
            )}
          </TouchableOpacity>
        )}

        {(canBook || canJoinWaitlist) && (
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={handleBook}
            disabled={isSubmitting}
            activeOpacity={0.85}>
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.bookBtnText}>{bookBtnLabel}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 24,
  },

  // Class name
  className: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
  },

  // Meta rows
  metaGroup: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.fontSecondary,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },

  // Section groups
  sectionGap8: {
    gap: 8,
  },
  sectionGap10: {
    gap: 10,
  },
  sectionLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },

  // Capacity
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityCount: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  capacityBarBg: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.capacityBarBg,
    overflow: 'hidden',
  },
  capacityBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.capacityBar,
  },
  capacityNote: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.capacityBar,
  },

  // Booking status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statusBadgeText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
  },

  // Programming
  wodTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  programBlock: {
    gap: 4,
  },
  programSubLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.fontTertiary,
  },
  programText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '400',
    color: '#444444',
    lineHeight: 13 * 1.4,
  },

  // Mutation error
  mutationErrorCard: {
    backgroundColor: COLORS.errorBg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
    borderRadius: 6,
    padding: 12,
  },
  mutationErrorText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.errorText,
  },

  // Action button area
  actionContainer: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  cancelBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  bookBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },

  // Error screen
  errorText: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: COLORS.errorText,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorBackBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: COLORS.divider,
  },
  errorBackBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
});
