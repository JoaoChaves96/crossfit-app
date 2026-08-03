import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  ScrollView,
  GestureResponderEvent,
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
import { NotificationBell } from '@/components/NotificationBell';
import { styles, desktopStyles } from './schedule.styles';

// ─── Types ────────────────────────────────────────────────────────────────────
type ClassScheduleItem = components['schemas']['ClassScheduleItemDto'];
type UserBookingItem = components['schemas']['UserBookingItemDto'];
type GetClassScheduleResponse = components['schemas']['GetClassScheduleResponseDto'];
type GetUserBookingsResponse = components['schemas']['GetUserBookingsResponseDto'];

type BookingStatus = 'booked' | 'waitlisted' | 'open' | 'full';

// Statuses derived from a non-published lifecycle state. These are display-only
// and never offer a booking/waitlist action.
type LifecycleStatus = 'closed' | 'in_progress' | 'completed';

// The full set of statuses a schedule card can render.
type CardStatus = BookingStatus | LifecycleStatus;

interface EnrichedClass extends ClassScheduleItem {
  userBookingStatus: CardStatus;
  userBookingId?: string;
}

// ─── Badge config ─────────────────────────────────────────────────────────────
const BADGE_CONFIG: Record<CardStatus, { bg: string; text: string; label: string }> = {
  open: { bg: AppColors.successBgFaint, text: AppColors.successMaterial, label: 'Open' },
  booked: { bg: AppColors.surfaceBlueLight, text: AppColors.actionBlueDark, label: 'Booked' },
  waitlisted: { bg: AppColors.warningBgOrange, text: AppColors.warningOrange, label: 'Waitlisted' },
  full: { bg: AppColors.backgroundSubtle, text: AppColors.textGray500, label: 'Full' },
  closed: { bg: AppColors.backgroundSubtle, text: AppColors.textGray500, label: 'Closed' },
  in_progress: { bg: AppColors.surfaceBlueLight, text: AppColors.actionBlueDark, label: 'In Progress' },
  completed: { bg: AppColors.backgroundSubtle, text: AppColors.textGray500, label: 'Completed' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTimeRange(scheduledDate: string, scheduledTime: string): string {
  return `${scheduledDate} · ${scheduledTime}`;
}

function getSpotsText(bookedCount: number, capacity: number): string {
  return `${bookedCount} / ${capacity} spots`;
}

function getCapacityDetailText(bookedCount: number, capacity: number, status: CardStatus): { text: string; isFullWaitlist: boolean } {
  if (status === 'full') {
    return { text: 'Full · Waitlist Open', isFullWaitlist: true };
  }
  return { text: getSpotsText(bookedCount, capacity), isFullWaitlist: false };
}

// Maps a non-published lifecycle state to its display-only status.
function lifecycleStatusFor(state: ClassScheduleItem['state']): LifecycleStatus {
  switch (state) {
    case 'booking_closed':
      return 'closed';
    case 'in_progress':
      return 'in_progress';
    default:
      // 'completed' (and any other non-published, non-bookable state)
      return 'completed';
  }
}

// Derives the card status, mirroring class-details gating: a user's own
// booking (booked/waitlisted) is always reflected regardless of lifecycle
// state; open/full booking actions are only offered for `published` classes;
// non-published classes with no user booking render a display-only lifecycle
// status.
function deriveBookingStatus(
  cls: ClassScheduleItem,
  bookingMap: Map<string, UserBookingItem>
): { status: CardStatus; bookingId?: string } {
  const booking = bookingMap.get(cls.id);
  if (booking) {
    return { status: booking.status as BookingStatus, bookingId: booking.id };
  }
  if (cls.state !== 'published') {
    return { status: lifecycleStatusFor(cls.state) };
  }
  if (cls.bookedCount >= cls.capacity) {
    return { status: 'full' };
  }
  return { status: 'open' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: CardStatus;
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
  status: CardStatus;
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
  const stopAndCall = (handler: () => void) => (e: GestureResponderEvent) => {
    e.stopPropagation();
    handler();
  };

  // Non-published lifecycle states are display-only: no booking/waitlist action.
  if (status === 'closed' || status === 'in_progress' || status === 'completed') {
    return null;
  }

  if (status === 'booked') {
    if (isCancelling) {
      return (
        <View style={[styles.actionBtn, styles.actionBtnCancel]}>
          <ActivityIndicator size="small" color={AppColors.errorBootstrap} />
        </View>
      );
    }
    return (
      <Pressable style={[styles.actionBtn, styles.actionBtnCancel]} onPress={stopAndCall(onCancel)}>
        <Text style={[styles.actionBtnText, { color: AppColors.errorBootstrap }]}>Cancel Booking</Text>
      </Pressable>
    );
  }

  if (status === 'waitlisted') {
    if (isCancelling) {
      return (
        <View style={[styles.actionBtn, styles.actionBtnWaitlist]}>
          <ActivityIndicator size="small" color={AppColors.textPrimary} />
        </View>
      );
    }
    return (
      <Pressable style={[styles.actionBtn, styles.actionBtnWaitlist]} onPress={stopAndCall(onCancel)}>
        <Text style={[styles.actionBtnText, { color: AppColors.textPrimary }]}>Leave Waitlist</Text>
      </Pressable>
    );
  }

  if (status === 'full') {
    return (
      <Pressable style={[styles.actionBtn, styles.actionBtnWaitlist]} onPress={stopAndCall(onWaitlist)}>
        <Text style={[styles.actionBtnText, { color: AppColors.textPrimary }]}>Join Waitlist</Text>
      </Pressable>
    );
  }

  // open
  return (
    <Pressable style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={stopAndCall(onBook)}>
      <Text style={[styles.actionBtnText, { color: AppColors.backgroundWhite }]}>Book Class</Text>
    </Pressable>
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
    <Pressable style={styles.card} onPress={onPress}>
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
          {(() => {
            const { text, isFullWaitlist } = getCapacityDetailText(item.bookedCount, item.capacity, item.userBookingStatus);
            return (
              <Text style={[styles.detailText, isFullWaitlist && styles.detailTextFull]}>{text}</Text>
            );
          })()}
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
    </Pressable>
  );
}

// ─── Desktop Grid ─────────────────────────────────────────────────────────────
interface DesktopGridProps {
  classes: EnrichedClass[];
  onClassPress: (classId: string) => void;
  onCancelBooking: (classId: string, bookingId: string) => void;
  cancellingBookingId: string | null;
}

function DesktopGrid({ classes, onClassPress, onCancelBooking, cancellingBookingId }: DesktopGridProps) {
  const columns: EnrichedClass[][] = [[], [], []];
  classes.forEach((item, index) => {
    columns[index % 3].push(item);
  });

  return (
    <View style={desktopStyles.cardGrid}>
      {columns.map((col, colIdx) => (
        <View key={colIdx} style={desktopStyles.gridCol}>
          {col.map((item) => (
            <ClassCard
              key={item.id}
              item={item}
              onPress={() => onClassPress(item.id)}
              onCancel={() => {
                if (item.userBookingId) {
                  onCancelBooking(item.id, item.userBookingId);
                }
              }}
              isCancelling={cancellingBookingId === item.userBookingId}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { currentGymId, isLoading: gymLoading } = useGym();
  const { isDesktop } = useResponsiveLayout();

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
      <View style={isDesktop ? desktopStyles.screen : styles.screen}>
        {isDesktop && <DesktopTopNav />}
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>Please select a gym and log in to view classes.</Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={isDesktop ? desktopStyles.screen : styles.screen}>
        {isDesktop && <DesktopTopNav />}
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={AppColors.textPrimary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={isDesktop ? desktopStyles.screen : styles.screen}>
        {isDesktop && <DesktopTopNav />}
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

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
      <View style={isDesktop ? desktopStyles.screen : styles.screen}>
        {isDesktop ? <DesktopTopNav /> : (
          <View style={styles.header}>
            <View style={styles.gymSelector}>
              <Text style={styles.gymName}>My Gym</Text>
              <Text style={styles.gymDropdownCaret}>▼</Text>
            </View>
            <NotificationBell />
          </View>
        )}
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

  // ── Desktop layout ─────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={desktopStyles.screen}>
        <DesktopTopNav />
        <View style={desktopStyles.contentArea}>
          <View style={desktopStyles.innerWrap}>
            {dateSeparator}
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <DesktopGrid
                classes={classes}
                onClassPress={handleClassPress}
                onCancelBooking={handleCancelBooking}
                cancellingBookingId={cancellingBookingId}
              />
            </ScrollView>
          </View>
        </View>
      </View>
    );
  }

  // ── Mobile list ────────────────────────────────────────────────────────────
  const header = (
    <View style={styles.header}>
      <View style={styles.gymSelector}>
        <Text style={styles.gymName}>My Gym</Text>
        <Text style={styles.gymDropdownCaret}>▼</Text>
      </View>
      <NotificationBell />
    </View>
  );

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
