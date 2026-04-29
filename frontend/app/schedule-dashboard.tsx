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

type GymClass = components['schemas']['ClassScheduleItemDto'];
type ApiClassesResponse = components['schemas']['GetClassScheduleResponseDto'];

type ViewMode = 'week' | 'list';

// ─── Design Tokens ────────────────────────────────────────────────────────────

const COLOR = {
  white: '#FFFFFF',
  sidebarBg: '#F3F4F6',
  bodyText: '#111827',
  subText: '#6B7280',
  mutedText: '#9CA3AF',
  borderLight: '#E5E7EB',
  borderMid: '#D1D5DB',
  activeNavBg: '#E5E7EB',
  activeNavText: '#111827',
  inactiveNavText: '#6B7280',
  createBtnBg: '#111827',
  createBtnText: '#FFFFFF',
  fullCapacity: '#DC2626',

  // Class card variants — [bg, border, timeColor]
  blue: { bg: '#EFF6FF', border: '#BFDBFE', time: '#1D4ED8' },
  green: { bg: '#F0FDF4', border: '#BBF7D0', time: '#15803D' },
  yellow: { bg: '#FEF3C7', border: '#FDE68A', time: '#B45309' },
  purple: { bg: '#F5F3FF', border: '#DDD6FE', time: '#7C3AED' },
  pink: { bg: '#FFF1F2', border: '#FECDD3', time: '#BE123C' },
  empty: { bg: 'transparent', border: '#E5E7EB', time: '#9CA3AF' },
};

const CLASS_TYPE_COLORS: { bg: string; border: string; time: string }[] = [
  COLOR.blue,
  COLOR.green,
  COLOR.yellow,
  COLOR.purple,
  COLOR.pink,
];

function getClassColor(index: number): { bg: string; border: string; time: string } {
  return CLASS_TYPE_COLORS[index % CLASS_TYPE_COLORS.length];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Monday = start of week
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatWeekLabel(start: Date): string {
  const end = addDays(start, 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} — ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  activeItem: string;
  onNavigate: (key: string) => void;
}

const NAV_ITEMS: { label: string; key: string; enabled: boolean }[] = [
  { label: 'Dashboard', key: 'dashboard', enabled: false },
  { label: 'Schedule', key: 'schedule', enabled: true },
  { label: 'Classes', key: 'classes', enabled: false },
  { label: 'Athletes', key: 'athletes', enabled: false },
  { label: 'Coaches', key: 'coaches', enabled: true },
  { label: 'Settings', key: 'settings', enabled: false },
];

function Sidebar({ activeItem, onNavigate }: SidebarProps) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarLogo}>
        <View style={styles.sidebarLogoIcon} />
        <Text style={styles.sidebarLogoText}>CrossFit Box</Text>
      </View>
      <View style={styles.navGroup}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activeItem;
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
                  isDisabled && styles.navIconDisabled,
                ]}
              />
              <Text
                style={[
                  styles.navLabel,
                  isActive ? styles.navLabelActive : styles.navLabelInactive,
                  isDisabled && styles.navLabelDisabled,
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

// ─── Class Card ───────────────────────────────────────────────────────────────

interface ClassCardProps {
  gymClass: GymClass;
  colorIndex: number;
}

function ClassCard({ gymClass, colorIndex }: ClassCardProps) {
  const color = getClassColor(colorIndex);
  const isFull = gymClass.bookedCount >= gymClass.capacity;

  return (
    <View
      style={[
        styles.classCard,
        { backgroundColor: color.bg, borderColor: color.border },
      ]}>
      <Text style={[styles.classTime, { color: color.time }]}>
        {formatTime(gymClass.scheduledTime)}
      </Text>
      <Text style={styles.className}>{gymClass.classTypeName}</Text>
      {gymClass.coachName ? (
        <Text style={styles.classCoach}>Coach: {gymClass.coachName}</Text>
      ) : null}
      <Text
        style={[
          styles.classCapacity,
          isFull && styles.classCapacityFull,
        ]}>
        {gymClass.bookedCount}/{gymClass.capacity} spots
      </Text>
    </View>
  );
}

// ─── Day Column ───────────────────────────────────────────────────────────────

interface DayColumnProps {
  dayLabel: string;
  dayDate: number;
  classes: GymClass[];
  colorOffset: number;
}

function DayColumn({ dayLabel, dayDate, classes, colorOffset }: DayColumnProps) {
  return (
    <View style={styles.dayColumn}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayLabel}>{dayLabel}</Text>
        <Text style={styles.dayDate}>{dayDate}</Text>
      </View>
      {classes.length === 0 ? (
        <View style={styles.emptyDayCard}>
          <Text style={styles.emptyDayText}>No classes</Text>
        </View>
      ) : (
        classes.map((cls, idx) => (
          <ClassCard key={cls.id} gymClass={cls} colorIndex={colorOffset + idx} />
        ))
      )}
    </View>
  );
}

// ─── List View Row ────────────────────────────────────────────────────────────

interface ListRowProps {
  gymClass: GymClass;
  colorIndex: number;
}

function ListRow({ gymClass, colorIndex }: ListRowProps) {
  const color = getClassColor(colorIndex);
  const isFull = gymClass.bookedCount >= gymClass.capacity;

  return (
    <View style={[styles.listRow, { borderLeftColor: color.time }]}>
      <View style={styles.listRowMain}>
        <Text style={styles.listRowName}>{gymClass.classTypeName}</Text>
        <Text style={styles.listRowTime}>
          {formatTime(gymClass.scheduledTime)}
          {gymClass.coachName ? `  •  Coach: ${gymClass.coachName}` : ''}
        </Text>
      </View>
      <Text style={[styles.listRowCapacity, isFull && styles.classCapacityFull]}>
        {gymClass.bookedCount}/{gymClass.capacity}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ScheduleDashboard() {
  const router = useRouter();
  const { userId } = useAuth();
  const { currentGymId } = useGym();

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    if (!userId || !currentGymId) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = createApiClient({ userId, gymId: currentGymId });
      const data = await client.get<ApiClassesResponse>(
        `/api/gyms/${currentGymId}/schedule`
      );
      setClasses(data.classes ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load classes';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentGymId]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group classes by day within the current week
  const classesByDay: GymClass[][] = weekDays.map((day) =>
    classes
      .filter((cls) => isSameDay(new Date(cls.scheduledDate), day))
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
  );

  // Sorted list for list view (current week only)
  const weekEnd = addDays(weekStart, 7);
  const weekClasses = classes
    .filter((cls) => {
      const t = new Date(cls.scheduledDate).getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    })
    .sort((a, b) => {
      const dateCompare = new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      return dateCompare !== 0 ? dateCompare : a.scheduledTime.localeCompare(b.scheduledTime);
    });

  const handlePrevWeek = () => setWeekStart((d) => addDays(d, -7));
  const handleNextWeek = () => setWeekStart((d) => addDays(d, 7));

  return (
    <View style={styles.root}>
      <Sidebar
        activeItem="schedule"
        onNavigate={(key) => {
          if (key === 'coaches') router.push('/coaches');
        }}
      />

      <View style={styles.main}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Schedule Dashboard</Text>
            <Text style={styles.headerSubtitle}>Manage your weekly class schedule</Text>
          </View>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/create-class' as never)}>
            <Text style={styles.createBtnText}>+ Create Class</Text>
          </TouchableOpacity>
        </View>

        {/* Toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.weekNav}>
            <TouchableOpacity style={styles.navArrowBtn} onPress={handlePrevWeek}>
              <Text style={styles.navArrowText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.weekLabel}>{formatWeekLabel(weekStart)}</Text>
            <TouchableOpacity style={styles.navArrowBtn} onPress={handleNextWeek}>
              <Text style={styles.navArrowText}>{'>'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'week' && styles.toggleBtnActive]}
              onPress={() => setViewMode('week')}>
              <Text
                style={[
                  styles.toggleBtnText,
                  viewMode === 'week' && styles.toggleBtnTextActive,
                ]}>
                Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}>
              <Text
                style={[
                  styles.toggleBtnText,
                  viewMode === 'list' && styles.toggleBtnTextActive,
                ]}>
                List
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLOR.bodyText} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchClasses}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : viewMode === 'week' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gridContainer}>
            {weekDays.map((day, dayIdx) => {
              const offset = classesByDay
                .slice(0, dayIdx)
                .reduce((sum, arr) => sum + arr.length, 0);
              return (
                <DayColumn
                  key={dayIdx}
                  dayLabel={DAY_LABELS[dayIdx]}
                  dayDate={day.getDate()}
                  classes={classesByDay[dayIdx]}
                  colorOffset={offset}
                />
              );
            })}
          </ScrollView>
        ) : (
          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            {weekClasses.length === 0 ? (
              <View style={styles.emptyListContainer}>
                <Text style={styles.emptyListText}>No classes scheduled this week</Text>
              </View>
            ) : (
              weekClasses.map((cls, idx) => (
                <ListRow key={cls.id} gymClass={cls} colorIndex={idx} />
              ))
            )}
          </ScrollView>
        )}
      </View>
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
  navLabel: {
    fontSize: 14,
  },
  navLabelActive: {
    fontWeight: '500',
    color: COLOR.activeNavText,
  },
  navLabelInactive: {
    fontWeight: '400',
    color: COLOR.inactiveNavText,
  },
  navItemDisabled: {
    opacity: 0.4,
  },
  navIconDisabled: {
    backgroundColor: '#9CA3AF',
  },
  navLabelDisabled: {
    color: COLOR.mutedText,
  },

  // Main area
  main: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLOR.bodyText,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLOR.subText,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLOR.createBtnBg,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLOR.createBtnText,
  },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navArrowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLOR.borderMid,
  },
  navArrowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.bodyText,
  },
  viewToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLOR.borderMid,
    borderRadius: 6,
    overflow: 'hidden',
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  toggleBtnActive: {
    backgroundColor: COLOR.activeNavBg,
  },
  toggleBtnText: {
    fontSize: 13,
    color: COLOR.subText,
  },
  toggleBtnTextActive: {
    fontWeight: '500',
    color: COLOR.bodyText,
  },

  // Loading / error
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
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

  // Week grid
  gridContainer: {
    flexDirection: 'row',
    gap: 8,
    flexGrow: 1,
  },
  dayColumn: {
    minWidth: 140,
    flex: 1,
    gap: 8,
  },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLOR.mutedText,
    letterSpacing: 1,
  },
  dayDate: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.bodyText,
  },

  // Class card
  classCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  classTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  className: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.bodyText,
  },
  classCoach: {
    fontSize: 11,
    color: COLOR.subText,
  },
  classCapacity: {
    fontSize: 11,
    color: COLOR.subText,
  },
  classCapacityFull: {
    color: COLOR.fullCapacity,
  },

  // Empty day
  emptyDayCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR.borderLight,
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDayText: {
    fontSize: 12,
    color: COLOR.mutedText,
  },

  // List view
  listContainer: {
    flex: 1,
  },
  emptyListContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyListText: {
    fontSize: 14,
    color: COLOR.mutedText,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.borderLight,
    marginBottom: 4,
  },
  listRowMain: {
    gap: 2,
  },
  listRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.bodyText,
  },
  listRowTime: {
    fontSize: 12,
    color: COLOR.subText,
  },
  listRowCapacity: {
    fontSize: 13,
    fontWeight: '500',
    color: COLOR.subText,
  },
});
