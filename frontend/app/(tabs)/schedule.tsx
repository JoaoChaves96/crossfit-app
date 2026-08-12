/*
 * ─── Clean Ink · Athlete Schedule (restyle pilot) ────────────────────────────
 * THESIS: a booking app that feels calm and effortless, not a POC. Monochrome
 *   discipline + one confident accent; it refuses the flat gray-on-white,
 *   emoji-as-icon POC look this screen inherited.
 * OWN-WORLD: white surface on a #F5F5F5 ground, near-black ink (#1A1A1A) with a
 *   disciplined neutral ramp and #E8E8E8 hairlines; ONE muted-crimson accent
 *   (#E23B4E) on the primary action + active chips only; deeper red (#B3261E)
 *   for destructive/urgent. Hanken Grotesk throughout. Drawn Ionicons, no emoji.
 * STORY: athlete opens to a clean schedule, scans classes by time + a quiet
 *   spots indicator, and books with one confident crimson action.
 * FIRST VIEWPORT: compact header, Week/Day segmented toggle + class-type chips
 *   (active = crimson), quiet day separators, a vertical list of smooth class
 *   cards (time + type, coach/space/spots metadata, status chip, one action).
 * FORM: mobile list / desktop 3-col grid; ranked #1 of the surface's structures.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the
 *   finish review, the verdict, and DESIGN.md.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
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
import { Space, Accent, Ink, Status } from '@/constants/design';
import { formatTimeRange } from '@/utils/datetime';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useRefreshOnAppActive } from '@/hooks/useRefreshOnAppActive';
import { DesktopTopNav } from '@/components/DesktopTopNav';
import { NotificationBell } from '@/components/NotificationBell';
import { GymMenu } from '@/components/GymMenu';
import { SafeScreen } from '@/components/SafeScreen';
import {
  Text,
  Icon,
  StatusChip,
  ChipTone,
  Button,
  SegmentedToggle,
  FilterChips,
} from '@/components/cleanink';
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

// ─── Status → chip config ───────────────────────────────────────────────────
// Chip labels are unchanged from the incumbent screen (tests assert on them);
// only the visual world changes. Tone maps into the Clean Ink status roles:
// open = muted green; booked/waitlisted = crimson wash (both are the athlete's
// own held spot, a positive personal state); full = deeper danger red (a
// blocking, unavailable state); lifecycle states = neutral.
const CHIP_CONFIG: Record<CardStatus, { tone: ChipTone; label: string }> = {
  open: { tone: 'open', label: 'Open' },
  booked: { tone: 'accent', label: 'Booked' },
  waitlisted: { tone: 'accent', label: 'Waitlisted' },
  full: { tone: 'danger', label: 'Full' },
  closed: { tone: 'neutral', label: 'Closed' },
  in_progress: { tone: 'neutral', label: 'In Progress' },
  completed: { tone: 'neutral', label: 'Completed' },
};

// ─── Controls config ──────────────────────────────────────────────────────────
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

/**
 * "2026-09-01" → "Sep 1, 2026".
 *
 * Task 8 sends a bare day string. Formatted in UTC deliberately: a
 * `YYYY-MM-DD` string parses as UTC midnight, so a local-timezone format would
 * render the previous day for anyone west of Greenwich.
 */
function formatCutoffDate(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
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

// ─── Card action button ─────────────────────────────────────────────────────
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
    return (
      <Button
        variant="danger"
        label="Cancel Booking"
        loading={isCancelling}
        onPress={stopAndCall(onCancel)}
      />
    );
  }

  if (status === 'waitlisted') {
    return (
      <Button
        variant="quiet"
        label="Leave Waitlist"
        loading={isCancelling}
        onPress={stopAndCall(onCancel)}
      />
    );
  }

  if (status === 'full') {
    return <Button variant="quiet" label="Join Waitlist" onPress={stopAndCall(onWaitlist)} />;
  }

  // open
  return <Button variant="primary" label="Book Class" onPress={stopAndCall(onBook)} />;
}

// ─── Class card ───────────────────────────────────────────────────────────────
interface ClassCardProps {
  item: EnrichedClass;
  onPress: () => void;
  onCancel: () => void;
  isCancelling: boolean;
}

function ClassCard({ item, onPress, onCancel, isCancelling }: ClassCardProps) {
  const isFull = item.userBookingStatus === 'full';
  const spotsText = isFull ? 'Full · Waitlist open' : getSpotsText(item.bookedCount, item.capacity);

  return (
    <Pressable testID={`athlete-class-card-${item.id}`} style={styles.card} onPress={onPress}>
      {/* Top row: time + class type on the left, status chip on the right */}
      <View style={styles.cardTop}>
        <View style={{ gap: Space.hair, flex: 1 }}>
          <Text size="lead" weight="bold" tracking="tight">
            {formatTimeRange(item.scheduledTime, item.duration)}
          </Text>
          <Text size="title" weight="semibold" tracking="snug">
            {item.classTypeName}
          </Text>
        </View>
        <StatusChip {...CHIP_CONFIG[item.userBookingStatus]} />
      </View>

      {/* Quiet metadata: spots, space, coach */}
      <View style={styles.cardMeta}>
        <View style={styles.detailRow}>
          <Icon name="people" size={15} tone={isFull ? Status.danger : Ink.faint} />
          <Text size="meta" weight={isFull ? 'semibold' : 'regular'} tone={isFull ? Status.danger : Ink.muted}>
            {spotsText}
          </Text>
        </View>
        {item.spaceName ? (
          <View style={styles.detailRow}>
            <Icon name="place" size={15} tone={Ink.faint} />
            <Text size="meta" tone={Ink.muted}>{item.spaceName}</Text>
          </View>
        ) : null}
        <View style={styles.detailRow}>
          <Icon name="coach" size={15} tone={Ink.faint} />
          <Text size="meta" tone={Ink.muted}>{item.coachName}</Text>
        </View>
      </View>

      {/* Action */}
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
      <SegmentedToggle<TimeView>
        options={[
          { value: 'week', label: 'Week' },
          { value: 'day', label: 'Day' },
        ]}
        value={timeView}
        onChange={onTimeViewChange}
        testIDPrefix="schedule-toggle"
      />
      <FilterChips
        options={typeFilters}
        active={activeFilter}
        onChange={onFilterChange}
        testIDPrefix="schedule-chip"
      />
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
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
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
      setPlanExpiresAt(scheduleResponse.planExpiresAt ?? null);
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
          <Text size="body" tone={Ink.muted} style={{ textAlign: 'center' }}>
            Please select a gym and log in to view classes.
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={isDesktop ? desktopStyles.screen : styles.screen}>
        {isDesktop && <DesktopTopNav />}
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={Accent.base} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={isDesktop ? desktopStyles.screen : styles.screen}>
        {isDesktop && <DesktopTopNav />}
        <View style={styles.centeredState}>
          <Text testID="schedule-error" size="body" tone={Status.danger} style={{ textAlign: 'center' }}>{error}</Text>
        </View>
      </View>
    );
  }

  // Quiet explanation for why the schedule stops where it does. No accent, no
  // CTA — athlete-side renewal is not in this scope.
  const cutoffNote = planExpiresAt ? (
    <View style={styles.cutoffNote}>
      <Text size="meta" tone={Ink.faint} style={{ textAlign: 'center' }}>
        {`Your plan covers classes through ${formatCutoffDate(planExpiresAt)}. Talk to your coach to renew.`}
      </Text>
    </View>
  ) : null;

  // ── Date separator ─────────────────────────────────────────────────────────
  const renderDateSeparator = (iso: string) => (
    <View testID={`day-section-${iso}`} style={styles.dateSep}>
      <Text size="meta" weight="semibold" tone={Ink.strong} upper tracking="wide">
        {formatDateLabel(iso)}
      </Text>
      <View style={styles.dateLine} />
    </View>
  );

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (classes.length === 0) {
    return (
      <View style={isDesktop ? desktopStyles.screen : styles.screen}>
        {isDesktop ? <DesktopTopNav gymName={gymName} /> : (
          <SafeScreen style={styles.header} extraTopPadding={Space.md}>
            <GymMenu gymName={gymName} />
            <NotificationBell />
          </SafeScreen>
        )}
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Icon name="calendar" size={30} tone={Ink.faint} />
          </View>
          <Text size="title" weight="bold" tracking="snug">No classes scheduled</Text>
          <Text size="body" tone={Ink.muted} style={styles.emptyDesc}>
            There are no classes for this period. Try changing the day or adjusting your filters.
          </Text>
        </View>
        {cutoffNote}
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
                  <Text size="body" tone={Ink.faint} style={{ textAlign: 'center' }}>
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
              {cutoffNote}
            </ScrollView>
          </View>
        </View>
      </View>
    );
  }

  // ── Mobile list ────────────────────────────────────────────────────────────
  const header = (
    <SafeScreen style={styles.header} extraTopPadding={Space.md}>
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
        ListFooterComponent={cutoffNote}
        ListEmptyComponent={
          <View style={styles.filteredEmpty}>
            <Text size="body" tone={Ink.faint} style={{ textAlign: 'center' }}>
              No classes match the selected filters.
            </Text>
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
