import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { AppColors, Spacing } from '@/constants/theme';
import { formatTimeRange } from '@/utils/datetime';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useRefreshOnAppActive } from '@/hooks/useRefreshOnAppActive';
import { DesktopTopNav } from '@/components/DesktopTopNav';
import { NotificationBell } from '@/components/NotificationBell';
import { GymMenu } from '@/components/GymMenu';
import { SafeScreen } from '@/components/SafeScreen';
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

// ─── Controls config ──────────────────────────────────────────────────────────
// Canonical class-type chips from the design (frame wUe5e / Controls NzxqW).
// "All" is always present; the remaining canonical chips are merged with any
// additional class types present in the loaded data so the control reflects
// real gym data while still honoring the design's baseline set.
const ALL_FILTER = 'All';
const CANONICAL_CLASS_TYPES = ['CrossFit', 'Gymnastics', 'Hyrox'] as const;

type TimeView = 'week' | 'day';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSpotsText(bookedCount: number, capacity: number): string {
  return `${bookedCount} / ${capacity} spots`;
}

// Format a "YYYY-MM-DD" schedule date into a human separator label.
// Parses the parts explicitly to avoid UTC-vs-local off-by-one shifts.
function formatDateLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

// Group classes (already sorted by date then time) into consecutive date
// buckets so the schedule can render one separator per real day.
function groupByDate(items: EnrichedClass[]): { date: string; items: EnrichedClass[] }[] {
  const groups: { date: string; items: EnrichedClass[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === item.scheduledDate) {
      last.items.push(item);
    } else {
      groups.push({ date: item.scheduledDate, items: [item] });
    }
  }
  return groups;
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
        <Text style={styles.cardTime}>{formatTimeRange(item.scheduledTime, item.duration)}</Text>
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
        {item.spaceName ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📍</Text>
            <Text style={styles.detailText}>{item.spaceName}</Text>
          </View>
        ) : null}
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

// ─── Controls (Week/Day toggle + class-type filter chips) ──────────────────────
interface ScheduleControlsProps {
  timeView: TimeView;
  onTimeViewChange: (view: TimeView) => void;
  typeFilters: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  containerStyle?: object;
}

function ScheduleControls({
  timeView,
  onTimeViewChange,
  typeFilters,
  activeFilter,
  onFilterChange,
  containerStyle,
}: ScheduleControlsProps) {
  return (
    <View style={[styles.controls, containerStyle]}>
      {/* Week / Day segmented toggle */}
      <View style={styles.segmented}>
        {(['week', 'day'] as const).map((view) => {
          const isActive = timeView === view;
          return (
            <Pressable
              key={view}
              testID={`schedule-toggle-${view}`}
              style={[styles.segment, isActive && styles.segmentActive]}
              onPress={() => onTimeViewChange(view)}
            >
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {view === 'week' ? 'Week' : 'Day'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Class-type filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {typeFilters.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <Pressable
              key={filter}
              testID={`schedule-chip-${filter}`}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onFilterChange(filter)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{filter}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
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
  const [gymName, setGymName] = useState('My Gym');
  const [isLoading, setIsLoading] = useState(true);
  // Full-screen spinner is for the first load only. Refocus refetches keep the
  // existing list on screen (refreshed in place) so tab switches don't flicker.
  const hasLoadedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [timeView, setTimeView] = useState<TimeView>('week');
  const [activeFilter, setActiveFilter] = useState<string>(ALL_FILTER);

  // Today's local date as "YYYY-MM-DD" (matches the backend's wall-clock format).
  const todayIso = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  // Available class-type chips: "All" + canonical design set + any extra types
  // present in the loaded data, de-duplicated and order-stable.
  const typeFilters = useMemo(() => {
    const dataTypes = classes.map((c) => c.classTypeName).filter(Boolean);
    const ordered = [...CANONICAL_CLASS_TYPES, ...dataTypes];
    const unique = Array.from(new Set(ordered));
    return [ALL_FILTER, ...unique];
  }, [classes]);

  // Classes passing the active class-type chip (All shows everything).
  const typeFilteredClasses = useMemo(() => {
    return classes.filter(
      (cls) => activeFilter === ALL_FILTER || cls.classTypeName === activeFilter,
    );
  }, [classes, activeFilter]);

  // In Day view we focus a single day. Prefer today; otherwise the soonest
  // upcoming day that has classes; otherwise the most recent past day. This
  // avoids the empty screen that appeared when nothing was scheduled today.
  const focusedDay = useMemo(() => {
    const dates = Array.from(new Set(typeFilteredClasses.map((c) => c.scheduledDate))).sort();
    if (dates.length === 0) return null;
    if (dates.includes(todayIso)) return todayIso;
    const upcoming = dates.find((d) => d >= todayIso);
    return upcoming ?? dates[dates.length - 1];
  }, [typeFilteredClasses, todayIso]);

  // Client-side filtering over already-fetched classes:
  //  - Week shows all matching classes (grouped by date on render).
  //  - Day narrows to the focused day's classes.
  const visibleClasses = useMemo(() => {
    if (timeView === 'week') return typeFilteredClasses;
    return typeFilteredClasses.filter((cls) => cls.scheduledDate === focusedDay);
  }, [typeFilteredClasses, timeView, focusedDay]);

  // Consecutive date buckets for rendering one separator per real day.
  const dateGroups = useMemo(() => groupByDate(visibleClasses), [visibleClasses]);

  const fetchData = useCallback(async () => {
    if (authLoading || gymLoading || !token || !currentGymId) {
      setIsLoading(false);
      return;
    }

    try {
      if (!hasLoadedRef.current) setIsLoading(true);
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
      if (scheduleResponse.gymName) setGymName(scheduleResponse.gymName);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load classes';
      setError(message);
    } finally {
      hasLoadedRef.current = true;
      setIsLoading(false);
    }
  }, [authLoading, gymLoading, token, currentGymId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Also refetch when the app returns to the foreground while this screen is the
  // one on display — focus alone won't fire if no navigation happened on resume.
  useRefreshOnAppActive(fetchData);

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
  const renderDateSeparator = (iso: string) => (
    <View style={styles.dateSep}>
      <Text style={styles.dateLabel}>{formatDateLabel(iso)}</Text>
      <View style={styles.dateLine} />
    </View>
  );

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (classes.length === 0) {
    return (
      <View style={isDesktop ? desktopStyles.screen : styles.screen}>
        {isDesktop ? <DesktopTopNav gymName={gymName} /> : (
          <SafeScreen style={styles.header} extraTopPadding={Spacing.md}>
            <GymMenu gymName={gymName} />
            <NotificationBell />
          </SafeScreen>
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
        <DesktopTopNav gymName={gymName} />
        <View style={desktopStyles.contentArea}>
          <View style={desktopStyles.innerWrap}>
            <ScheduleControls
              timeView={timeView}
              onTimeViewChange={setTimeView}
              typeFilters={typeFilters}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              containerStyle={desktopStyles.controls}
            />
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {dateGroups.length === 0 ? (
                <View style={styles.filteredEmpty}>
                  <Text style={styles.filteredEmptyText}>
                    No classes match the selected filters.
                  </Text>
                </View>
              ) : (
                dateGroups.map((group) => (
                  <View key={group.date}>
                    {renderDateSeparator(group.date)}
                    <DesktopGrid
                      classes={group.items}
                      onClassPress={handleClassPress}
                      onCancelBooking={handleCancelBooking}
                      cancellingBookingId={cancellingBookingId}
                    />
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    );
  }

  // ── Mobile list ────────────────────────────────────────────────────────────
  const header = (
    <SafeScreen style={styles.header} extraTopPadding={Spacing.md}>
      <GymMenu gymName={gymName} />
      <NotificationBell />
    </SafeScreen>
  );

  const controls = (
    <ScheduleControls
      timeView={timeView}
      onTimeViewChange={setTimeView}
      typeFilters={typeFilters}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
    />
  );

  // Flatten date groups into a single list interleaving separators and cards so
  // one FlatList renders per-day headers without a nested-list perf warning.
  type ListRow =
    | { kind: 'separator'; date: string }
    | { kind: 'class'; item: EnrichedClass };
  const listRows: ListRow[] = [];
  for (const group of dateGroups) {
    listRows.push({ kind: 'separator', date: group.date });
    for (const item of group.items) {
      listRows.push({ kind: 'class', item });
    }
  }

  return (
    <View style={styles.screen}>
      {header}
      <FlatList
        data={listRows}
        keyExtractor={(row) => (row.kind === 'separator' ? `sep-${row.date}` : row.item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={controls}
        ListEmptyComponent={
          <View style={styles.filteredEmpty}>
            <Text style={styles.filteredEmptyText}>No classes match the selected filters.</Text>
          </View>
        }
        renderItem={({ item: row }) =>
          row.kind === 'separator' ? (
            renderDateSeparator(row.date)
          ) : (
            <ClassCard
              item={row.item}
              onPress={() => handleClassPress(row.item.id)}
              onCancel={() => {
                if (row.item.userBookingId) {
                  handleCancelBooking(row.item.id, row.item.userBookingId);
                }
              }}
              isCancelling={cancellingBookingId === row.item.userBookingId}
            />
          )
        }
      />
    </View>
  );
}
