import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';

// ─── Types ────────────────────────────────────────────────────────────────────

type ClassDetail = components['schemas']['ClassScheduleItemDto'];
type ClassBookingItem = components['schemas']['ClassBookingItemDto'];
type ClassState = ClassDetail['state'];
type GetClassBookingsResponse = components['schemas']['GetClassBookingsResponseDto'];
type ManuallyTransitionDto = components['schemas']['ManuallyTransitionClassStateDto'];
type ManuallyTransitionResponse = components['schemas']['ManuallyTransitionClassStateResponseDto'];

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR = {
  white: '#FFFFFF',
  sidebarBg: '#F3F4F6',
  bodyText: '#111827',
  subText: '#6B7280',
  mutedText: '#9CA3AF',
  labelText: '#9CA3AF',
  borderLight: '#E5E7EB',
  borderMid: '#D1D5DB',
  activeNavBg: '#DBEAFE',
  activeNavText: '#1D4ED8',
  inactiveNavText: '#6B7280',
  cardBg: '#F9FAFB',

  // State badge dot colors
  dotPublished: '#22C55E',
  dotBookingClosed: '#F59E0B',
  dotInProgress: '#3B82F6',
  dotCompleted: '#14B8A6',
  dotArchived: '#9CA3AF',

  // Attendance badge
  attBadgeBg: '#DBEAFE',
  attBadgeText: '#1D4ED8',

  // Waitlist badge
  waitBadgeBg: '#FEF3C7',
  waitBadgeText: '#B45309',

  // Booking status badges
  bookedBg: '#DCFCE7',
  bookedText: '#15803D',
  waitlistedBg: '#FEF3C7',
  waitlistedText: '#B45309',

  // Table row
  tableHeaderBg: '#F9FAFB',
  avatarBg: '#E5E7EB',

  // Buttons
  primaryBtnBg: '#111827',
  primaryBtnText: '#FFFFFF',
  outlinedBtnText: '#374151',
  errorText: '#DC2626',
};

const STATE_NEXT_MAP: Record<ClassState, ClassState | null> = {
  published: 'booking_closed',
  booking_closed: 'in_progress',
  in_progress: 'completed',
  completed: 'archived',
  archived: null,
};

const STATE_LABEL: Record<ClassState, string> = {
  published: 'Published',
  booking_closed: 'Booking Closed',
  in_progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
};

const STATE_DOT_COLOR: Record<ClassState, string> = {
  published: COLOR.dotPublished,
  booking_closed: COLOR.dotBookingClosed,
  in_progress: COLOR.dotInProgress,
  completed: COLOR.dotCompleted,
  archived: COLOR.dotArchived,
};

const NAV_ITEMS: { label: string; key: string; enabled: boolean }[] = [
  { label: 'Dashboard', key: 'dashboard', enabled: false },
  { label: 'Schedule', key: 'schedule', enabled: true },
  { label: 'Classes', key: 'classes', enabled: true },
  { label: 'Athletes', key: 'athletes', enabled: false },
  { label: 'Coaches', key: 'coaches', enabled: true },
  { label: 'Settings', key: 'settings', enabled: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateSubtitle(scheduledDate: string, scheduledTime: string): string {
  const [year, month, day] = scheduledDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const [hourStr, minuteStr] = scheduledTime.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${dateStr} · ${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  onNavigate: (key: string) => void;
}

function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarLogo}>
        <View style={styles.sidebarLogoIcon} />
        <Text style={styles.sidebarLogoText}>CrossFit Box</Text>
      </View>
      <View style={styles.navGroup}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === 'classes';
          const isDisabled = !item.enabled;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.navItem,
                isActive && styles.navItemActive,
                isDisabled && styles.navItemDisabled,
              ]}
              onPress={isDisabled ? undefined : () => onNavigate(item.key)}
              disabled={isDisabled}
              activeOpacity={isDisabled ? 1 : 0.7}>
              <View
                style={[
                  styles.navIcon,
                  isActive ? styles.navIconActive : styles.navIconInactive,
                  isDisabled && styles.navIconMuted,
                ]}
              />
              <Text
                style={[
                  styles.navLabel,
                  isActive ? styles.navLabelActive : styles.navLabelInactive,
                  isDisabled && styles.navLabelMuted,
                ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── State Badge ──────────────────────────────────────────────────────────────

interface StateBadgeProps {
  state: ClassState;
  isTransitioning: boolean;
  onPress: () => void;
}

function StateBadge({ state, isTransitioning, onPress }: StateBadgeProps) {
  const nextState = STATE_NEXT_MAP[state];
  const isTerminal = nextState === null;

  return (
    <TouchableOpacity
      style={[styles.stateBadge, isTerminal && styles.stateBadgeDisabled]}
      onPress={isTerminal ? undefined : onPress}
      disabled={isTerminal || isTransitioning}
      activeOpacity={isTerminal ? 1 : 0.7}>
      {isTransitioning ? (
        <ActivityIndicator size="small" color={COLOR.subText} />
      ) : (
        <>
          <View style={[styles.stateDot, { backgroundColor: STATE_DOT_COLOR[state] }]} />
          <Text style={styles.stateText}>{STATE_LABEL[state]}</Text>
          {!isTerminal && <Text style={styles.stateChevron}>v</Text>}
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Info Card ────────────────────────────────────────────────────────────────

interface InfoCardProps {
  classDetail: ClassDetail;
}

function InfoCard({ classDetail }: InfoCardProps) {
  const items: { label: string; value: string }[] = [
    { label: 'CLASS TYPE', value: classDetail.classTypeName },
    { label: 'COACH', value: classDetail.coachName || '—' },
    { label: 'DURATION', value: '—' },
    {
      label: 'CAPACITY',
      value: `${classDetail.bookedCount} / ${classDetail.capacity}`,
    },
    { label: 'SPACE', value: classDetail.spaceName || '—' },
  ];

  return (
    <View style={styles.infoCard}>
      {items.map((item, index) => (
        <View key={item.label} style={[styles.infoItem, index > 0 && styles.infoItemSeparator]}>
          <Text style={styles.infoLabel}>{item.label}</Text>
          <Text style={styles.infoValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Booking Status Badge ─────────────────────────────────────────────────────

interface BookingStatusBadgeProps {
  status: ClassBookingItem['status'];
}

function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const isBooked = status === 'booked';
  return (
    <View
      style={[
        styles.bookingBadge,
        { backgroundColor: isBooked ? COLOR.bookedBg : COLOR.waitlistedBg },
      ]}>
      <Text
        style={[
          styles.bookingBadgeText,
          { color: isBooked ? COLOR.bookedText : COLOR.waitlistedText },
        ]}>
        {isBooked ? 'Confirmed' : 'Waitlisted'}
      </Text>
    </View>
  );
}

// ─── Attendance List ──────────────────────────────────────────────────────────

interface AttendanceListProps {
  bookings: ClassBookingItem[];
}

function AttendanceList({ bookings }: AttendanceListProps) {
  return (
    <View style={styles.listSection}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Attendance List</Text>
        <View style={styles.attBadge}>
          <Text style={styles.attBadgeText}>{bookings.length} booked</Text>
        </View>
      </View>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.tableColFill]}>Athlete</Text>
          <Text style={[styles.tableHeaderText, styles.tableColStatus]}>Status</Text>
        </View>
        {bookings.length === 0 ? (
          <View style={styles.tableEmpty}>
            <Text style={styles.tableEmptyText}>No booked athletes</Text>
          </View>
        ) : (
          bookings.map((booking) => (
            <View key={booking.bookingId} style={styles.tableRow}>
              <View style={styles.tableRowName}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(booking.displayName)}</Text>
                </View>
                <Text style={styles.athleteName}>{booking.displayName}</Text>
              </View>
              <View style={styles.tableColStatus}>
                <BookingStatusBadge status={booking.status} />
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

interface WaitlistProps {
  bookings: ClassBookingItem[];
}

function Waitlist({ bookings }: WaitlistProps) {
  return (
    <View style={styles.waitSection}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Waitlist</Text>
        <View style={styles.waitBadge}>
          <Text style={styles.waitBadgeText}>{bookings.length} waiting</Text>
        </View>
      </View>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Athlete</Text>
        </View>
        {bookings.length === 0 ? (
          <View style={styles.tableEmpty}>
            <Text style={styles.tableEmptyText}>No one on waitlist</Text>
          </View>
        ) : (
          bookings.map((booking) => (
            <View key={booking.bookingId} style={[styles.tableRow, styles.tableRowWait]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(booking.displayName)}</Text>
              </View>
              <Text style={styles.athleteName}>{booking.displayName}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ClassManagement() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentGymId } = useGym();
  const { classId } = useLocalSearchParams<{ classId: string }>();

  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [allBookings, setAllBookings] = useState<ClassBookingItem[]>([]);
  const [isLoadingClass, setIsLoadingClass] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const fetchClassDetail = useCallback(async () => {
    if (!token || !currentGymId || !classId) return;
    setIsLoadingClass(true);
    setClassError(null);
    try {
      const client = createApiClient({ token });
      const data = await client.get<ClassDetail>(
        `/api/gyms/${currentGymId}/classes/${classId}`
      );
      setClassDetail(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load class';
      setClassError(msg);
    } finally {
      setIsLoadingClass(false);
    }
  }, [token, currentGymId, classId]);

  const fetchBookings = useCallback(async () => {
    if (!token || !currentGymId || !classId) return;
    setIsLoadingBookings(true);
    setBookingsError(null);
    try {
      const client = createApiClient({ token });
      const data = await client.get<GetClassBookingsResponse>(
        `/api/gyms/${currentGymId}/classes/${classId}/bookings`
      );
      setAllBookings(data.bookings ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load bookings';
      setBookingsError(msg);
    } finally {
      setIsLoadingBookings(false);
    }
  }, [token, currentGymId, classId]);

  useEffect(() => {
    fetchClassDetail();
    fetchBookings();
  }, [fetchClassDetail, fetchBookings]);

  const bookedList = allBookings.filter((b) => b.status === 'booked');
  const waitlistedList = allBookings.filter((b) => b.status === 'waitlisted');

  const handleTransition = useCallback(() => {
    if (!classDetail || !token || !currentGymId || !classId) return;
    const nextState = STATE_NEXT_MAP[classDetail.state];
    if (!nextState) return;

    Alert.alert(
      'Advance State',
      `Move class to "${STATE_LABEL[nextState]}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsTransitioning(true);
            try {
              const client = createApiClient({ token });
              const body: ManuallyTransitionDto = {
                classId,
                targetState: nextState,
              };
              await client.post<ManuallyTransitionResponse>(
                `/api/gyms/${currentGymId}/classes/${classId}/transition`,
                body as unknown as Record<string, unknown>
              );
              await fetchClassDetail();
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Transition failed';
              Alert.alert('Error', msg);
            } finally {
              setIsTransitioning(false);
            }
          },
        },
      ]
    );
  }, [classDetail, token, currentGymId, classId, fetchClassDetail]);

  const handleNavigate = useCallback(
    (key: string) => {
      if (key === 'schedule') router.push('/schedule-dashboard' as never);
      if (key === 'coaches') router.push('/coaches' as never);
      if (key === 'classes') router.push('/schedule-dashboard' as never);
    },
    [router]
  );

  const handleMarkAttendance = useCallback(() => {
    if (!classId || !currentGymId) return;
    router.push(
      `/coach-mark-attendance?classId=${classId}&gymId=${currentGymId}` as never
    );
  }, [router, classId, currentGymId]);

  const handleAddProgramming = useCallback(() => {
    if (!classId || !currentGymId) return;
    router.push(
      `/coach-class-details?classId=${classId}&gymId=${currentGymId}` as never
    );
  }, [router, classId, currentGymId]);

  return (
    <View style={styles.root}>
      <Sidebar onNavigate={handleNavigate} />

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={false}>
        {isLoadingClass ? (
          <View style={styles.centeredFeedback}>
            <ActivityIndicator size="large" color={COLOR.bodyText} />
          </View>
        ) : classError ? (
          <View style={styles.centeredFeedback}>
            <Text style={styles.errorText}>{classError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchClassDetail}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : classDetail ? (
          <>
            {/* Header row */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>{classDetail.classTypeName}</Text>
                <Text style={styles.headerSubtitle}>
                  {formatDateSubtitle(classDetail.scheduledDate, classDetail.scheduledTime)}
                </Text>
              </View>
              <StateBadge
                state={classDetail.state}
                isTransitioning={isTransitioning}
                onPress={handleTransition}
              />
            </View>

            {/* Info card */}
            <InfoCard classDetail={classDetail} />

            {/* Action row */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleMarkAttendance}>
                <Text style={styles.primaryBtnText}>MARK ATTENDANCE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlinedBtn} onPress={handleAddProgramming}>
                <Text style={styles.outlinedBtnText}>ADD PROGRAMMING</Text>
              </TouchableOpacity>
            </View>

            {/* Lists row */}
            {isLoadingBookings ? (
              <View style={styles.centeredFeedback}>
                <ActivityIndicator size="small" color={COLOR.subText} />
              </View>
            ) : bookingsError ? (
              <View style={styles.centeredFeedback}>
                <Text style={styles.errorText}>{bookingsError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchBookings}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.listsRow}>
                <AttendanceList bookings={bookedList} />
                <Waitlist bookings={waitlistedList} />
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLOR.white,
  },

  // Sidebar
  sidebar: {
    width: 220,
    backgroundColor: COLOR.sidebarBg,
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 4,
  },
  sidebarLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 20,
  },
  sidebarLogoIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#6B7280',
  },
  sidebarLogoText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.bodyText,
  },
  navGroup: {
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  navItemActive: {
    backgroundColor: COLOR.activeNavBg,
  },
  navItemDisabled: {
    opacity: 0.4,
  },
  navIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  navIconActive: {
    backgroundColor: '#374151',
  },
  navIconInactive: {
    backgroundColor: '#9CA3AF',
  },
  navIconMuted: {
    backgroundColor: '#9CA3AF',
  },
  navLabel: {
    fontSize: 14,
  },
  navLabelActive: {
    fontWeight: '600',
    color: COLOR.activeNavText,
  },
  navLabelInactive: {
    fontWeight: '400',
    color: COLOR.inactiveNavText,
  },
  navLabelMuted: {
    color: COLOR.mutedText,
  },

  // Main content
  mainScroll: {
    flex: 1,
  },
  mainContent: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 20,
    flexGrow: 1,
  },

  // Loading / error
  centeredFeedback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: COLOR.errorText,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLOR.borderMid,
  },
  retryBtnText: {
    fontSize: 14,
    color: COLOR.bodyText,
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    gap: 4,
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLOR.bodyText,
    fontFamily: 'Inter',
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLOR.subText,
    fontFamily: 'Inter',
  },

  // State badge
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR.borderMid,
  },
  stateBadgeDisabled: {
    opacity: 0.6,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stateText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Inter',
  },
  stateChevron: {
    fontSize: 11,
    color: COLOR.mutedText,
    fontFamily: 'Inter',
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLOR.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLOR.borderLight,
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 32,
    flexWrap: 'wrap',
  },
  infoItem: {
    gap: 4,
    minWidth: 80,
  },
  infoItemSeparator: {
    // gap between items is handled by parent `gap`
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLOR.labelText,
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLOR.bodyText,
    fontFamily: 'Inter',
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.primaryBtnBg,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLOR.primaryBtnText,
    fontFamily: 'Inter',
  },
  outlinedBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR.borderMid,
  },
  outlinedBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLOR.outlinedBtnText,
    fontFamily: 'Inter',
  },

  // Lists row
  listsRow: {
    flexDirection: 'row',
    gap: 20,
    flex: 1,
  },

  // Attendance section
  listSection: {
    flex: 1,
    gap: 12,
  },
  waitSection: {
    width: 280,
    gap: 12,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.bodyText,
    fontFamily: 'Inter',
  },
  attBadge: {
    backgroundColor: COLOR.attBadgeBg,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  attBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLOR.attBadgeText,
    fontFamily: 'Inter',
  },
  waitBadge: {
    backgroundColor: COLOR.waitBadgeBg,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  waitBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLOR.waitBadgeText,
    fontFamily: 'Inter',
  },

  // Table
  table: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR.borderLight,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.tableHeaderBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.subText,
    fontFamily: 'Inter',
  },
  tableColFill: {
    flex: 1,
  },
  tableColStatus: {
    width: 100,
    alignItems: 'flex-start',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLOR.borderLight,
  },
  tableRowWait: {
    gap: 8,
  },
  tableRowName: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableEmpty: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLOR.borderLight,
    alignItems: 'center',
  },
  tableEmptyText: {
    fontSize: 13,
    color: COLOR.mutedText,
    fontFamily: 'Inter',
  },

  // Avatar
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLOR.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLOR.subText,
    fontFamily: 'Inter',
  },
  athleteName: {
    fontSize: 13,
    color: COLOR.bodyText,
    fontFamily: 'Inter',
  },

  // Booking status badge
  bookingBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bookingBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
});
