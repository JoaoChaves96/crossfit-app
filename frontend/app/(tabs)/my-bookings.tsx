import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { showConfirm, showError } from '@/utils/alert';
import { components } from '@/types/api.gen';
import { AppColors } from '@/constants/theme';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { DesktopTopNav } from '@/components/DesktopTopNav';
import { styles, desktopStyles } from './my-bookings.styles';


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
    return { label: 'IN PROGRESS', color: AppColors.actionBlueDark, bg: AppColors.surfaceBlueLight };
  }
  if (bookingStatus === 'waitlisted') {
    const label = waitlistPosition != null ? `WAITLISTED #${waitlistPosition}` : 'WAITLISTED';
    return { label, color: AppColors.warningOrange, bg: AppColors.warningBgOrange };
  }
  return { label: 'BOOKED', color: AppColors.successMaterial, bg: AppColors.successBgFaint };
}

function getPastBadgeConfig(classState: ClassScheduleItem['state']): BadgeConfig {
  if (classState === 'completed') {
    return { label: 'ATTENDED', color: AppColors.successMaterial, bg: AppColors.successBgFaint };
  }
  return { label: 'CANCELLED', color: AppColors.textGray500, bg: AppColors.backgroundSubtle };
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
              <ActivityIndicator size="small" color={AppColors.errorDefault} />
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
          <Text style={[styles.attendedText, { color: AppColors.successMaterial }]}>✓ You attended</Text>
        </View>
      ) : (
        <View style={styles.attendedRow}>
          <Text style={[styles.attendedText, { color: AppColors.textGray500 }]}>
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

// ─── Desktop Grid ─────────────────────────────────────────────────────────────
interface DesktopBookingGridProps {
  bookings: BookingWithClassDetails[];
  activeTab: FilterTab;
  gymId: string;
  cancellingBookingId: string | null;
  onViewDetails: (classId: string) => void;
  onCancel: (booking: BookingWithClassDetails) => void;
  onLogResult: (classId: string) => void;
}

function DesktopBookingGrid({
  bookings,
  activeTab,
  gymId,
  cancellingBookingId,
  onViewDetails,
  onCancel,
  onLogResult,
}: DesktopBookingGridProps) {
  const columns: BookingWithClassDetails[][] = [[], []];
  bookings.forEach((item, index) => {
    columns[index % 2].push(item);
  });

  return (
    <View style={desktopStyles.cardGrid}>
      {columns.map((col, colIdx) => (
        <View key={colIdx} style={desktopStyles.gridCol}>
          {col.map((item) =>
            activeTab === 'upcoming' ? (
              <UpcomingCard
                key={item.bookingId}
                item={item}
                isCancelling={cancellingBookingId === item.bookingId}
                onViewDetails={() => onViewDetails(item.id)}
                onCancel={() => onCancel(item)}
              />
            ) : (
              <PastCard
                key={item.bookingId}
                item={item}
                gymId={gymId}
                onViewDetails={() => onViewDetails(item.id)}
                onLogResult={() => onLogResult(item.id)}
              />
            )
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────────
export default function MyBookingsScreen() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { currentGymId, isLoading: gymLoading } = useGym();
  const { isDesktop } = useResponsiveLayout();

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
      <View style={isDesktop ? desktopStyles.screen : [styles.container, styles.centerContent]}>
        {isDesktop && <DesktopTopNav />}
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Please select a gym and log in to view your bookings.</Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={isDesktop ? desktopStyles.screen : [styles.container, styles.centerContent]}>
        {isDesktop && <DesktopTopNav />}
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={AppColors.textDark3} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={isDesktop ? desktopStyles.screen : [styles.container, styles.centerContent]}>
        {isDesktop && <DesktopTopNav />}
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  // ── Desktop layout ────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={desktopStyles.screen}>
        <DesktopTopNav />
        <View style={desktopStyles.contentArea}>
          <View style={desktopStyles.innerWrap}>
            <View style={desktopStyles.headerRow}>
              <Text style={styles.headerTitle}>My Bookings</Text>
              <View style={{ width: 240 }}>
                <FilterToggle activeTab={activeTab} onTabChange={setActiveTab} />
              </View>
            </View>

            {activeTab === 'upcoming' && upcomingBookings.length === 0 ? (
              <EmptyState onBrowseSchedule={handleBrowseSchedule} />
            ) : activeTab === 'past' && pastBookings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🗓</Text>
                <Text style={styles.emptyTitle}>No past bookings</Text>
                <Text style={styles.emptyDesc}>Your completed classes will appear here.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                <DesktopBookingGrid
                  bookings={visibleBookings}
                  activeTab={activeTab}
                  gymId={currentGymId}
                  cancellingBookingId={cancellingBookingId}
                  onViewDetails={handleViewDetails}
                  onCancel={handleCancelBooking}
                  onLogResult={handleLogResult}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────
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

