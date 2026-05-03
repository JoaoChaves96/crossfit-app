import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { showConfirm, showError } from '@/utils/alert';
import { components } from '@/types/api.gen';

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  bg: '#F5F5F5',
  white: '#FFFFFF',
  fontPrimary: '#1A1A1A',
  fontSecondary: '#666666',
  fontTertiary: '#999999',
  border: '#E0E0E0',
  cardBorder: '#E8E8E8',
  toggleBg: '#E0E0E0',
  filterBorderInactive: '#CCCCCC',
  dateLine: '#E0E0E0',
  // Status badges
  badgeOpenBg: '#E8F5E9',
  badgeOpenText: '#2E7D32',
  badgeBookedBg: '#E3F2FD',
  badgeBookedText: '#1565C0',
  badgeWaitlistedBg: '#FFF3E0',
  badgeWaitlistedText: '#E65100',
  badgeFullBg: '#F5F5F5',
  badgeFullText: '#999999',
  // Action buttons
  btnPrimaryFill: '#1A1A1A',
  btnPrimaryText: '#FFFFFF',
  btnCancelBorder: '#DC3545',
  btnCancelText: '#DC3545',
  btnWaitlistBorder: '#1A1A1A',
  btnWaitlistText: '#1A1A1A',
  danger: '#D32F2F',
} as const;

const FONT = {
  family: 'Inter' as const,
};

// ─── Types ────────────────────────────────────────────────────────────────────
type ClassScheduleItem = components['schemas']['ClassScheduleItemDto'];
type UserBookingItem = components['schemas']['UserBookingItemDto'];
type GetClassScheduleResponse = components['schemas']['GetClassScheduleResponseDto'];
type GetUserBookingsResponse = components['schemas']['GetUserBookingsResponseDto'];

type BookingStatus = 'booked' | 'waitlisted' | 'open' | 'full';

interface EnrichedClass extends ClassScheduleItem {
  userBookingStatus: BookingStatus;
  userBookingId?: string;
}

// ─── Badge config ─────────────────────────────────────────────────────────────
const BADGE_CONFIG: Record<BookingStatus, { bg: string; text: string; label: string }> = {
  open: { bg: COLORS.badgeOpenBg, text: COLORS.badgeOpenText, label: 'Open' },
  booked: { bg: COLORS.badgeBookedBg, text: COLORS.badgeBookedText, label: 'Booked' },
  waitlisted: { bg: COLORS.badgeWaitlistedBg, text: COLORS.badgeWaitlistedText, label: 'Waitlisted' },
  full: { bg: COLORS.badgeFullBg, text: COLORS.badgeFullText, label: 'Full' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTimeRange(scheduledDate: string, scheduledTime: string): string {
  return `${scheduledDate} · ${scheduledTime}`;
}

function getSpotsText(bookedCount: number, capacity: number): string {
  return `${bookedCount} / ${capacity} spots`;
}

function deriveBookingStatus(
  cls: ClassScheduleItem,
  bookingMap: Map<string, UserBookingItem>
): { status: BookingStatus; bookingId?: string } {
  const booking = bookingMap.get(cls.id);
  if (booking) {
    return { status: booking.status as BookingStatus, bookingId: booking.id };
  }
  if (cls.bookedCount >= cls.capacity) {
    return { status: 'full' };
  }
  return { status: 'open' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: BookingStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = BADGE_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

interface CardActionButtonProps {
  status: BookingStatus;
  onBook: () => void;
  onCancel: () => void;
  onWaitlist: () => void;
  isCancelling: boolean;
}

function CardActionButton({
  status,
  onBook,
  onCancel,
  onWaitlist,
  isCancelling,
}: CardActionButtonProps) {
  if (status === 'booked') {
    if (isCancelling) {
      return (
        <View style={[styles.actionBtn, styles.actionBtnCancel]}>
          <ActivityIndicator size="small" color={COLORS.btnCancelText} />
        </View>
      );
    }
    return (
      <TouchableOpacity style={[styles.actionBtn, styles.actionBtnCancel]} onPress={onCancel} activeOpacity={0.7}>
        <Text style={[styles.actionBtnText, { color: COLORS.btnCancelText }]}>Cancel Booking</Text>
      </TouchableOpacity>
    );
  }

  if (status === 'waitlisted') {
    if (isCancelling) {
      return (
        <View style={[styles.actionBtn, styles.actionBtnWaitlist]}>
          <ActivityIndicator size="small" color={COLORS.btnWaitlistText} />
        </View>
      );
    }
    return (
      <TouchableOpacity style={[styles.actionBtn, styles.actionBtnWaitlist]} onPress={onCancel} activeOpacity={0.7}>
        <Text style={[styles.actionBtnText, { color: COLORS.btnWaitlistText }]}>Leave Waitlist</Text>
      </TouchableOpacity>
    );
  }

  if (status === 'full') {
    return (
      <TouchableOpacity style={[styles.actionBtn, styles.actionBtnWaitlist]} onPress={onWaitlist} activeOpacity={0.7}>
        <Text style={[styles.actionBtnText, { color: COLORS.btnWaitlistText }]}>Join Waitlist</Text>
      </TouchableOpacity>
    );
  }

  // open
  return (
    <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={onBook} activeOpacity={0.7}>
      <Text style={[styles.actionBtnText, { color: COLORS.btnPrimaryText }]}>Book Class</Text>
    </TouchableOpacity>
  );
}

interface ClassCardProps {
  item: EnrichedClass;
  onPress: () => void;
  onCancel: () => void;
  isCancelling: boolean;
}

function ClassCard({ item, onPress, onCancel, isCancelling }: ClassCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Top row: time + badge */}
      <View style={styles.cardTop}>
        <Text style={styles.cardTime}>{formatTimeRange(item.scheduledDate, item.scheduledTime)}</Text>
        <StatusBadge status={item.userBookingStatus} />
      </View>

      {/* Class type name */}
      <Text style={styles.cardTitle}>{item.classTypeName}</Text>

      {/* Detail rows */}
      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>👥</Text>
          <Text style={styles.detailText}>{getSpotsText(item.bookedCount, item.capacity)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>👤</Text>
          <Text style={styles.detailText}>Coach: {item.coachName}</Text>
        </View>
      </View>

      {/* Action button */}
      <CardActionButton
        status={item.userBookingStatus}
        onBook={onPress}
        onCancel={onCancel}
        onWaitlist={onPress}
        isCancelling={isCancelling}
      />
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { currentGymId, isLoading: gymLoading } = useGym();

  const [classes, setClasses] = useState<EnrichedClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (authLoading || gymLoading || !token || !currentGymId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const client = createApiClient({ token });

      const [scheduleResponse, bookingsResponse] = await Promise.all([
        client.get<GetClassScheduleResponse>(`/api/gyms/${currentGymId}/classes`),
        client.get<GetUserBookingsResponse>('/api/me/bookings'),
      ]);

      const bookingMap = new Map<string, UserBookingItem>();
      bookingsResponse.bookings.forEach((booking) => {
        bookingMap.set(booking.classId, booking);
      });

      const enrichedClasses: EnrichedClass[] = scheduleResponse.classes.map((cls) => {
        const { status, bookingId } = deriveBookingStatus(cls, bookingMap);
        return { ...cls, userBookingStatus: status, userBookingId: bookingId };
      });

      setClasses(enrichedClasses);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load classes';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, gymLoading, token, currentGymId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleClassPress = (classId: string) => {
    if (!currentGymId) return;
    router.push({ pathname: '/class-details', params: { gymId: currentGymId, classId } });
  };

  const handleCancelBooking = (classId: string, bookingId: string) => {
    showConfirm(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'Keep Booking', style: 'cancel', onPress: () => {} },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingBookingId(bookingId);
              const client = createApiClient({ token: token! });
              await client.delete(`/api/gyms/${currentGymId}/classes/bookings/${bookingId}`);
              await fetchData();
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to cancel booking';
              showError('Cancellation Error', message);
            } finally {
              setCancellingBookingId(null);
            }
          },
        },
      ]
    );
  };

  // ── Render states ──────────────────────────────────────────────────────────
  if (!token || !currentGymId) {
    return (
      <View style={styles.screen}>
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>Please select a gym and log in to view classes.</Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={COLORS.fontPrimary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  // ── Header ─────────────────────────────────────────────────────────────────
  const header = (
    <View style={styles.header}>
      <View style={styles.gymSelector}>
        <Text style={styles.gymName}>My Gym</Text>
        <Text style={styles.gymDropdownCaret}>▼</Text>
      </View>
    </View>
  );

  // ── Date separator ─────────────────────────────────────────────────────────
  const dateSeparator = (
    <View style={styles.dateSep}>
      <Text style={styles.dateLabel}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
      </Text>
      <View style={styles.dateLine} />
    </View>
  );

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (classes.length === 0) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIconText}>📅</Text>
          </View>
          <Text style={styles.emptyTitle}>No Classes Scheduled</Text>
          <Text style={styles.emptyDesc}>
            There are no classes available for this period. Try changing the date or adjusting your
            filters.
          </Text>
        </View>
      </View>
    );
  }

  // ── Main list ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {header}
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={dateSeparator}
        renderItem={({ item }) => (
          <ClassCard
            item={item}
            onPress={() => handleClassPress(item.id)}
            onCancel={() => {
              if (item.userBookingId) {
                handleCancelBooking(item.id, item.userBookingId);
              }
            }}
            isCancelling={cancellingBookingId === item.userBookingId}
          />
        )}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  // Header
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  gymSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gymName: {
    fontFamily: FONT.family,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.fontPrimary,
  },
  gymDropdownCaret: {
    fontFamily: FONT.family,
    fontSize: 10,
    color: COLORS.fontSecondary,
  },
  // List
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },
  // Date separator
  dateSep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    marginBottom: 4,
  },
  dateLabel: {
    fontFamily: FONT.family,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.fontPrimary,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.dateLine,
  },
  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTime: {
    fontFamily: FONT.family,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.fontPrimary,
  },
  cardTitle: {
    fontFamily: FONT.family,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.fontPrimary,
  },
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailIcon: {
    fontSize: 13,
    width: 14,
    textAlign: 'center',
  },
  detailText: {
    fontFamily: FONT.family,
    fontSize: 13,
    color: COLORS.fontSecondary,
  },
  // Badge
  badge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: FONT.family,
    fontSize: 11,
    fontWeight: '600',
  },
  // Action buttons
  actionBtn: {
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.btnPrimaryFill,
  },
  actionBtnCancel: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.btnCancelBorder,
  },
  actionBtnWaitlist: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.btnWaitlistBorder,
  },
  actionBtnText: {
    fontFamily: FONT.family,
    fontSize: 14,
    fontWeight: '600',
  },
  // States
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontFamily: FONT.family,
    fontSize: 16,
    color: COLORS.danger,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIconText: {
    fontSize: 36,
  },
  emptyTitle: {
    fontFamily: FONT.family,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.fontPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: FONT.family,
    fontSize: 14,
    color: COLORS.fontTertiary,
    textAlign: 'center',
    lineHeight: 21,
  },
});
