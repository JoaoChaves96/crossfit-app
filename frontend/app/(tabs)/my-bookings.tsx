import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { showConfirm, showError } from '@/utils/alert';
import { components } from '@/types/api.gen';

// ─── Design tokens from designs/athlete-screens.pen ───────────────────────────
const COLORS = {
  bg: '#FFFFFF',
  accent: '#333333',
  accentLight: '#F0F0F0',
  fontPrimary: '#1A1A1A',
  fontSecondary: '#666666',
  fontTertiary: '#999999',
  border: '#E0E0E0',
  danger: '#D32F2F',
  white: '#FFFFFF',
  badgeBooked: '#2E7D32',
  badgeBookedBg: '#E8F5E9',
  badgeWaitlisted: '#E65100',
  badgeWaitlistedBg: '#FFF3E0',
  badgeInProgress: '#1565C0',
  badgeInProgressBg: '#E3F2FD',
  badgeCancelled: '#999999',
  badgeCancelledBg: '#F5F5F5',
} as const;

// ─── Types ─────────────────────────────────────────────────────────────────────
type ClassScheduleItem = components['schemas']['ClassScheduleItemDto'];
type UserBookingItem = components['schemas']['UserBookingItemDto'];
type GetClassScheduleResponse = components['schemas']['GetClassScheduleResponseDto'];
type GetUserBookingsResponse = components['schemas']['GetUserBookingsResponseDto'];

type FilterTab = 'upcoming' | 'past';

interface BookingWithClassDetails extends ClassScheduleItem {
  bookingId: string;
  bookingStatus: UserBookingItem['status'];
  waitlistPosition: number | null;
}

// ─── Badge config ───────────────────────────────────────────────────────────────
interface BadgeConfig {
  label: string;
  color: string;
  bg: string;
}

function getUpcomingBadgeConfig(
  bookingStatus: UserBookingItem['status'],
  classState: ClassScheduleItem['state'],
  waitlistPosition: number | null,
): BadgeConfig {
  if (classState === 'in_progress') {
    return { label: 'IN PROGRESS', color: COLORS.badgeInProgress, bg: COLORS.badgeInProgressBg };
  }
  if (bookingStatus === 'waitlisted') {
    const label = waitlistPosition != null ? `WAITLISTED #${waitlistPosition}` : 'WAITLISTED';
    return { label, color: COLORS.badgeWaitlisted, bg: COLORS.badgeWaitlistedBg };
  }
  return { label: 'BOOKED', color: COLORS.badgeBooked, bg: COLORS.badgeBookedBg };
}

function getPastBadgeConfig(classState: ClassScheduleItem['state']): BadgeConfig {
  if (classState === 'completed') {
    return { label: 'ATTENDED', color: COLORS.badgeBooked, bg: COLORS.badgeBookedBg };
  }
  return { label: 'CANCELLED', color: COLORS.badgeCancelled, bg: COLORS.badgeCancelledBg };
}

// ─── Sub-components ─────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  config: BadgeConfig;
}

function StatusBadge({ config }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

interface UpcomingCardProps {
  item: BookingWithClassDetails;
  isCancelling: boolean;
  onViewDetails: () => void;
  onCancel: () => void;
}

function UpcomingCard({ item, isCancelling, onViewDetails, onCancel }: UpcomingCardProps) {
  const badgeConfig = getUpcomingBadgeConfig(item.bookingStatus, item.state, item.waitlistPosition);
  const isInProgress = item.state === 'in_progress';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{item.classTypeName}</Text>
        <StatusBadge config={badgeConfig} />
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>
            {item.scheduledDate} · {item.scheduledTime}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailText}>Coach {item.coachName}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.viewButton} onPress={onViewDetails} activeOpacity={0.7}>
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
        {!isInProgress && (
          <TouchableOpacity
            style={[styles.cancelButton, isCancelling && styles.cancelButtonDisabled]}
            onPress={onCancel}
            disabled={isCancelling}
            activeOpacity={0.7}>
            {isCancelling ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <Text style={styles.cancelButtonText}>
                {item.bookingStatus === 'waitlisted' ? 'Leave Waitlist' : 'Cancel'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

interface PastCardProps {
  item: BookingWithClassDetails;
  gymId: string;
  onViewDetails: () => void;
  onLogResult: () => void;
}

function PastCard({ item, onViewDetails, onLogResult }: PastCardProps) {
  const badgeConfig = getPastBadgeConfig(item.state);
  const attended = item.state === 'completed';
  const isCancelledCard = !attended;

  return (
    <View style={[styles.card, isCancelledCard && styles.cardCancelled]}>
      <View style={styles.cardTop}>
        <Text style={[styles.cardTitle, isCancelledCard && styles.cardTitleMuted]}>
          {item.classTypeName}
        </Text>
        <StatusBadge config={badgeConfig} />
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>
            {item.scheduledDate} · {item.scheduledTime}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailText}>Coach {item.coachName}</Text>
        </View>
      </View>

      {attended ? (
        <View style={styles.attendedRow}>
          <Text style={[styles.attendedText, { color: COLORS.badgeBooked }]}>✓ You attended</Text>
        </View>
      ) : (
        <View style={styles.attendedRow}>
          <Text style={[styles.attendedText, { color: COLORS.fontTertiary }]}>
            You did not attend
          </Text>
        </View>
      )}

      {attended && (
        <>
          <TouchableOpacity style={styles.viewButton} onPress={onViewDetails} activeOpacity={0.7}>
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
          {item.state === 'completed' && (
            <TouchableOpacity style={styles.viewButton} onPress={onLogResult} activeOpacity={0.7}>
              <Text style={styles.viewButtonText}>LOG RESULT</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

interface FilterToggleProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
}

function FilterToggle({ activeTab, onTabChange }: FilterToggleProps) {
  return (
    <View style={styles.filterRow}>
      <TouchableOpacity
        style={[styles.filterTab, activeTab === 'upcoming' && styles.filterTabActive]}
        onPress={() => onTabChange('upcoming')}
        activeOpacity={0.8}>
        <Text
          style={[
            styles.filterTabText,
            activeTab === 'upcoming' ? styles.filterTabTextActive : styles.filterTabTextInactive,
          ]}>
          Upcoming
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterTab, activeTab === 'past' && styles.filterTabActive]}
        onPress={() => onTabChange('past')}
        activeOpacity={0.8}>
        <Text
          style={[
            styles.filterTabText,
            activeTab === 'past' ? styles.filterTabTextActive : styles.filterTabTextInactive,
          ]}>
          Past
        </Text>
      </TouchableOpacity>
    </View>
  );
}

interface EmptyStateProps {
  onBrowseSchedule: () => void;
}

function EmptyState({ onBrowseSchedule }: EmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🗓</Text>
      <Text style={styles.emptyTitle}>No upcoming bookings</Text>
      <Text style={styles.emptyDesc}>Browse the schedule to book a class!</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={onBrowseSchedule} activeOpacity={0.8}>
        <Text style={styles.emptyButtonText}>Browse Schedule</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────────
export default function MyBookingsScreen() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { currentGymId, isLoading: gymLoading } = useGym();

  const [bookings, setBookings] = useState<BookingWithClassDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming');

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

      const classMap = new Map<string, ClassScheduleItem>();
      scheduleResponse.classes.forEach((cls) => {
        classMap.set(cls.id, cls);
      });

      const enrichedBookings: BookingWithClassDetails[] = bookingsResponse.bookings
        .map((booking) => {
          const classDetails = classMap.get(booking.classId);
          if (!classDetails) return null;
          return {
            ...classDetails,
            bookingId: booking.id,
            bookingStatus: booking.status,
            waitlistPosition: booking.waitlistPosition ?? null,
          };
        })
        .filter((b): b is BookingWithClassDetails => b !== null);

      setBookings(enrichedBookings);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load bookings';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, gymLoading, token, currentGymId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const handleLogResult = (classId: string) => {
    if (!currentGymId) return;
    router.push({
      pathname: '/log-results',
      params: { classId, gymId: currentGymId },
    });
  };

  const handleViewDetails = (classId: string) => {
    if (!currentGymId) return;
    router.push({
      pathname: '/class-details',
      params: { gymId: currentGymId, classId },
    });
  };

  const handleBrowseSchedule = () => {
    router.push('/(tabs)/schedule' as never);
  };

  const handleCancelBooking = (booking: BookingWithClassDetails) => {
    const isWaitlisted = booking.bookingStatus === 'waitlisted';
    showConfirm(
      isWaitlisted ? 'Leave Waitlist' : 'Cancel Booking',
      isWaitlisted
        ? `Leave waitlist for ${booking.classTypeName} on ${booking.scheduledDate}?`
        : `Cancel booking for ${booking.classTypeName} on ${booking.scheduledDate}?`,
      [
        { text: isWaitlisted ? 'Stay on Waitlist' : 'Keep Booking', style: 'cancel', onPress: () => {} },
        {
          text: isWaitlisted ? 'Leave Waitlist' : 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingBookingId(booking.bookingId);
              const client = createApiClient({ token: token! });
              await client.delete(
                `/api/gyms/${currentGymId}/classes/bookings/${booking.bookingId}`,
              );
              await fetchData();
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to cancel booking';
              showError('Cancellation Error', message);
            } finally {
              setCancellingBookingId(null);
            }
          },
        },
      ],
    );
  };

  const upcomingBookings = bookings.filter(
    (b) =>
      b.state === 'published' || b.state === 'booking_closed' || b.state === 'in_progress',
  );

  const pastBookings = bookings.filter(
    (b) => b.state === 'completed' || b.state === 'archived',
  );

  const visibleBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  if (!token || !currentGymId) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Please select a gym and log in to view your bookings.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentWrap}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Bookings</Text>
        </View>

        <FilterToggle activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'upcoming' && upcomingBookings.length === 0 ? (
          <EmptyState onBrowseSchedule={handleBrowseSchedule} />
        ) : activeTab === 'past' && pastBookings.length === 0 ? (
          <View style={[styles.emptyContainer]}>
            <Text style={styles.emptyIcon}>🗓</Text>
            <Text style={styles.emptyTitle}>No past bookings</Text>
            <Text style={styles.emptyDesc}>Your completed classes will appear here.</Text>
          </View>
        ) : (
          <FlatList
            data={visibleBookings}
            keyExtractor={(item) => item.bookingId}
            renderItem={({ item }) =>
              activeTab === 'upcoming' ? (
                <UpcomingCard
                  item={item}
                  isCancelling={cancellingBookingId === item.bookingId}
                  onViewDetails={() => handleViewDetails(item.id)}
                  onCancel={() => handleCancelBooking(item)}
                />
              ) : (
                <PastCard
                  item={item}
                  gymId={currentGymId}
                  onViewDetails={() => handleViewDetails(item.id)}
                  onLogResult={() => handleLogResult(item.id)}
                />
              )
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 20,
  },
  header: {
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.fontPrimary,
  },
  // Filter toggle
  filterRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.accentLight,
    borderRadius: 20,
    height: 40,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: COLORS.accent,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  filterTabTextInactive: {
    color: COLORS.fontSecondary,
  },
  // List
  listContent: {
    gap: 12,
  },
  // Card
  card: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardCancelled: {
    backgroundColor: COLORS.badgeCancelledBg,
    opacity: 0.7,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.fontPrimary,
    flex: 1,
    marginRight: 8,
  },
  cardTitleMuted: {
    color: COLORS.fontTertiary,
  },
  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Card details
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailIcon: {
    fontSize: 14,
    width: 18,
    textAlign: 'center',
  },
  detailText: {
    fontSize: 13,
    color: COLORS.fontSecondary,
    flex: 1,
  },
  // Card actions
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    flex: 1,
    height: 36,
    backgroundColor: COLORS.accentLight,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.fontPrimary,
  },
  cancelButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.danger,
  },
  // Attended row (past cards)
  attendedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendedText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.fontPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.fontSecondary,
    textAlign: 'center',
    maxWidth: 220,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 22,
    height: 44,
    paddingHorizontal: 24,
    gap: 8,
    justifyContent: 'center',
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Error
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    textAlign: 'center',
  },
});
