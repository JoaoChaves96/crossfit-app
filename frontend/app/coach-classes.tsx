import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';

// ─── Types ────────────────────────────────────────────────────────────────────

type CoachClassItem = components['schemas']['CoachClassItemDto'];
type GetCoachClassesResponse = components['schemas']['GetCoachClassesResponseDto'];

type FilterMode = 'upcoming' | 'past';

// ─── Design Tokens ────────────────────────────────────────────────────────────

const COLOR = {
  // Root & layout
  rootBg: '#F2F3F5',
  white: '#FFFFFF',

  // Sidebar (dark theme)
  sidebarBg: '#1E1E2D',
  sidebarLogoText: '#FFFFFF',
  navActiveItemBg: '#2D2D42',
  navActiveText: '#FFFFFF',
  navInactiveText: '#8888A0',

  // Main content
  titleText: '#1A1A2E',
  bodyText: '#1A1A2E',
  secondaryText: '#555568',
  mutedText: '#8888A0',

  // Card / table
  cardBg: '#FFFFFF',
  cardBorder: '#E4E4EA',
  tableHeaderBg: '#F7F7F9',
  tableHeaderText: '#8888A0',
  rowAltBg: '#EEF0FF',
  rowBorder: '#E4E4EA',

  // Filter buttons
  filterActiveBg: '#1A1A2E',
  filterActiveText: '#FFFFFF',
  filterInactiveBg: '#FFFFFF',
  filterInactiveText: '#8888A0',
  filterInactiveBorder: '#E4E4EA',

  // Action button
  actionBtnBg: '#1A1A2E',
  actionBtnText: '#FFFFFF',

  // Status badges
  statusPublishedBg: '#D4EDDA',
  statusPublishedText: '#1A1A2E',
  statusBookingClosedBg: '#FFF3CD',
  statusBookingClosedText: '#856404',
  statusInProgressBg: '#CCE5FF',
  statusInProgressText: '#004085',
  statusCompletedBg: '#E2E3E5',
  statusCompletedText: '#383D41',

  // Error
  errorText: '#DC2626',
  borderMid: '#D1D5DB',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(date: string, time: string): string {
  const d = new Date(`${date}T${time}`);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const dayName = dayNames[d.getDay()];
  const day = d.getDate();
  const month = monthNames[d.getMonth()];
  const hour = d.getHours();
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${dayName} ${day} ${month} · ${String(hour).padStart(2, '0')}:${minute}`;
}

function isUpcoming(scheduledDate: string, scheduledTime: string): boolean {
  const classDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
  return classDateTime >= new Date();
}

interface StatusConfig {
  label: string;
  bg: string;
  textColor: string;
}

function getStatusConfig(state: CoachClassItem['state']): StatusConfig {
  switch (state) {
    case 'published':
      return { label: 'Published', bg: COLOR.statusPublishedBg, textColor: COLOR.statusPublishedText };
    case 'booking_closed':
      return { label: 'Booking Closed', bg: COLOR.statusBookingClosedBg, textColor: COLOR.statusBookingClosedText };
    case 'in_progress':
      return { label: 'In Progress', bg: COLOR.statusInProgressBg, textColor: COLOR.statusInProgressText };
    case 'completed':
      return { label: 'Completed', bg: COLOR.statusCompletedBg, textColor: COLOR.statusCompletedText };
    case 'archived':
      return { label: 'Archived', bg: COLOR.statusCompletedBg, textColor: COLOR.statusCompletedText };
  }
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const COACH_NAV_ITEMS = [
  { label: 'My Classes', key: 'classes', enabled: true },
  { label: 'Profile', key: 'profile', enabled: false },
] as const;

interface SidebarProps {
  activeItem: string;
}

function Sidebar({ activeItem }: SidebarProps) {
  return (
    <View style={styles.sidebar}>
      <Text style={styles.sidebarLogo}>CrossFit Manager</Text>
      <View style={styles.navSpacer} />
      <View style={styles.navGroup}>
        {COACH_NAV_ITEMS.map((item) => {
          const isActive = item.key === activeItem;
          const isDisabled = !item.enabled;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.navItem,
                isActive && styles.navItemActive,
              ]}
              disabled={isDisabled}
              activeOpacity={isDisabled ? 1 : 0.7}>
              <Text
                style={[
                  styles.navLabel,
                  isActive ? styles.navLabelActive : styles.navLabelInactive,
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

// ─── Table Row ────────────────────────────────────────────────────────────────

interface ClassRowProps {
  gymClass: CoachClassItem;
  isAlt: boolean;
  onView: (gymClass: CoachClassItem) => void;
}

function ClassRow({ gymClass, isAlt, onView }: ClassRowProps) {
  const statusConfig = getStatusConfig(gymClass.state);
  const dateTimeLabel = formatDateTime(gymClass.scheduledDate, gymClass.scheduledTime);

  return (
    <View
      style={[
        styles.tableRow,
        isAlt && styles.tableRowAlt,
      ]}>
      <Text style={[styles.rowCell, styles.colClassType]} numberOfLines={1}>
        {gymClass.classTypeName}
      </Text>
      <Text style={[styles.rowCellSecondary, styles.colDateTime]} numberOfLines={1}>
        {dateTimeLabel}
      </Text>
      <Text style={[styles.rowCellSecondary, styles.colSpace]} numberOfLines={1}>
        {gymClass.spaceName}
      </Text>
      <Text style={[styles.rowCellSecondary, styles.colCapacity]}>
        {gymClass.bookedCount} / {gymClass.capacity}
      </Text>
      <View style={styles.colStatus}>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusConfig.textColor }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>
      <View style={styles.colAction}>
        <TouchableOpacity style={styles.viewBtn} onPress={() => onView(gymClass)}>
          <Text style={styles.viewBtnText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CoachClassesScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { currentGymId } = useGym();

  const [allClasses, setAllClasses] = useState<CoachClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('upcoming');

  const fetchClasses = useCallback(async () => {
    if (!userId || !currentGymId) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = createApiClient({ userId, gymId: currentGymId });
      const data = await client.get<GetCoachClassesResponse>(
        `/api/gyms/${currentGymId}/coach/classes`,
      );
      const sorted = (data.classes ?? []).slice().sort((a, b) => {
        const aTime = new Date(`${a.scheduledDate}T${a.scheduledTime}`).getTime();
        const bTime = new Date(`${b.scheduledDate}T${b.scheduledTime}`).getTime();
        return aTime - bTime;
      });
      setAllClasses(sorted);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load classes.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentGymId]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const filteredClasses = allClasses.filter((cls) => {
    const upcoming = isUpcoming(cls.scheduledDate, cls.scheduledTime);
    return filterMode === 'upcoming' ? upcoming : !upcoming;
  });

  const handleView = (gymClass: CoachClassItem) => {
    router.push({
      pathname: '/coach-class-details',
      params: {
        classId: gymClass.id,
        classTypeName: gymClass.classTypeName,
        scheduledDate: gymClass.scheduledDate,
        scheduledTime: gymClass.scheduledTime,
        spaceName: gymClass.spaceName,
        capacity: String(gymClass.capacity),
        bookedCount: String(gymClass.bookedCount),
        state: gymClass.state,
      },
    });
  };

  return (
    <View style={styles.root}>
      <Sidebar activeItem="classes" />

      <View style={styles.main}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Assigned Classes</Text>
        </View>

        {/* Filter row */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              filterMode === 'upcoming' && styles.filterBtnActive,
            ]}
            onPress={() => setFilterMode('upcoming')}>
            <Text
              style={[
                styles.filterBtnText,
                filterMode === 'upcoming' && styles.filterBtnTextActive,
              ]}>
              Upcoming
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              filterMode === 'past' && styles.filterBtnActive,
            ]}
            onPress={() => setFilterMode('past')}>
            <Text
              style={[
                styles.filterBtnText,
                filterMode === 'past' && styles.filterBtnTextActive,
              ]}>
              Past
            </Text>
          </TouchableOpacity>
        </View>

        {/* Classes card */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLOR.bodyText} />
          </View>
        ) : error !== null ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchClasses}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.classesCard}>
            {/* Table header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colClassType]}>
                Class Type
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colDateTime]}>
                Date &amp; Time
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colSpace]}>
                Space
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colCapacity]}>
                Capacity
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colStatus]}>
                Status
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colAction]}>
                Action
              </Text>
            </View>

            {filteredClasses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {filterMode === 'upcoming'
                    ? 'No upcoming classes assigned'
                    : 'No past classes found'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {filterMode === 'upcoming'
                    ? 'Check back later or contact your gym owner.'
                    : 'Your past assigned classes will appear here.'}
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredClasses.map((cls, idx) => (
                  <ClassRow key={cls.id} gymClass={cls} isAlt={idx % 2 === 0} onView={handleView} />
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const COL_CLASS_TYPE = 180;
const COL_DATE_TIME = 200;
const COL_SPACE = 100;
const COL_CAPACITY = 100;
const COL_STATUS = 160;
const COL_ACTION = 90;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLOR.rootBg,
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
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.sidebarLogoText,
    letterSpacing: 0.5,
  },
  navSpacer: {
    height: 24,
  },
  navGroup: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    height: 40,
  },
  navItemActive: {
    backgroundColor: COLOR.navActiveItemBg,
  },
  navLabel: {
    fontSize: 14,
  },
  navLabelActive: {
    fontWeight: '600',
    color: COLOR.navActiveText,
  },
  navLabelInactive: {
    fontWeight: '400',
    color: COLOR.navInactiveText,
  },

  // Main area
  main: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 24,
    gap: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.titleText,
  },

  // Filter row
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLOR.filterInactiveBg,
    borderWidth: 1,
    borderColor: COLOR.filterInactiveBorder,
  },
  filterBtnActive: {
    backgroundColor: COLOR.filterActiveBg,
    borderColor: COLOR.filterActiveBg,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '400',
    color: COLOR.filterInactiveText,
  },
  filterBtnTextActive: {
    fontWeight: '600',
    color: COLOR.filterActiveText,
  },

  // Classes card
  classesCard: {
    flex: 1,
    backgroundColor: COLOR.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLOR.cardBorder,
    overflow: 'hidden',
  },

  // Table header
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 16,
    backgroundColor: COLOR.tableHeaderBg,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.rowBorder,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: COLOR.tableHeaderText,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Table rows
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.rowBorder,
  },
  tableRowAlt: {
    backgroundColor: COLOR.rowAltBg,
  },
  rowCell: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.bodyText,
  },
  rowCellSecondary: {
    fontSize: 13,
    fontWeight: '400',
    color: COLOR.secondaryText,
  },

  // Column widths
  colClassType: {
    width: COL_CLASS_TYPE,
  },
  colDateTime: {
    width: COL_DATE_TIME,
  },
  colSpace: {
    width: COL_SPACE,
  },
  colCapacity: {
    width: COL_CAPACITY,
  },
  colStatus: {
    width: COL_STATUS,
  },
  colAction: {
    width: COL_ACTION,
    alignItems: 'flex-start',
  },

  // Status badge
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Action button
  viewBtn: {
    backgroundColor: COLOR.actionBtnBg,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.actionBtnText,
  },

  // Loading / error
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.bodyText,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLOR.secondaryText,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
