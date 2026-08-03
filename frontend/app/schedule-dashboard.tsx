import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from './schedule-dashboard.styles';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
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

function formatTime(timeString: string): string {
  const [hourStr, minuteStr] = timeString.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
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
  { label: 'Members', key: 'members', enabled: true },
  { label: 'Coaches', key: 'coaches', enabled: true },
  { label: 'Settings', key: 'settings', enabled: true },
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
            <Pressable
              key={item.key}
              testID={`nav-${item.key}`}
              style={[
                styles.navItem,
                isActive && styles.navItemActive,
                isDisabled && styles.navItemDisabled,
              ]}
              onPress={isDisabled ? undefined : () => onNavigate(item.key)}
              disabled={isDisabled}>
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
            </Pressable>
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
  onPress: () => void;
}

function ClassCard({ gymClass, colorIndex, onPress }: ClassCardProps) {
  const color = getClassColor(colorIndex);
  const isFull = gymClass.bookedCount >= gymClass.capacity;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
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
    </TouchableOpacity>
  );
}

// ─── Day Column ───────────────────────────────────────────────────────────────

interface DayColumnProps {
  dayLabel: string;
  dayDate: number;
  classes: GymClass[];
  colorOffset: number;
  onClassPress: (classId: string) => void;
}

function DayColumn({ dayLabel, dayDate, classes, colorOffset, onClassPress }: DayColumnProps) {
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
          <ClassCard
            key={cls.id}
            gymClass={cls}
            colorIndex={colorOffset + idx}
            onPress={() => onClassPress(cls.id)}
          />
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
  const { token } = useAuth();
  const { currentGymId } = useGym();
  const { isMobile } = useResponsiveLayout();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    if (!token || !currentGymId) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = createApiClient({ token });
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
  }, [token, currentGymId]);

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

  const handleSidebarNav = (key: string) => {
    setDrawerOpen(false);
    if (key === 'coaches') router.push('/coaches');
    if (key === 'members') router.push('/members' as never);
    if (key === 'settings') router.push('/gym-settings');
  };

  const handleClassPress = (classId: string) =>
    router.push(`/class-management?classId=${classId}` as never);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLOR.bodyText} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchClasses}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (viewMode === 'list') {
      return (
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
      );
    }

    if (isMobile) {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mobileGridContainer}>
          {weekDays.map((day, dayIdx) => {
            const dayKey = day.toISOString().slice(0, 10);
            const offset = classesByDay
              .slice(0, dayIdx)
              .reduce((sum, arr) => sum + arr.length, 0);
            return (
              <View key={dayKey} style={styles.mobileDayColumn}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayLabel}>{DAY_LABELS[dayIdx]}</Text>
                  <Text style={styles.dayDate}>{day.getDate()}</Text>
                </View>
                {classesByDay[dayIdx].length === 0 ? (
                  <View style={styles.emptyDayCard}>
                    <Text style={styles.emptyDayText}>No classes</Text>
                  </View>
                ) : (
                  classesByDay[dayIdx].map((cls, idx) => (
                    <ClassCard
                      key={cls.id}
                      gymClass={cls}
                      colorIndex={offset + idx}
                      onPress={() => handleClassPress(cls.id)}
                    />
                  ))
                )}
              </View>
            );
          })}
        </ScrollView>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gridContainer}>
        {weekDays.map((day, dayIdx) => {
          const dayKey = day.toISOString().slice(0, 10);
          const offset = classesByDay
            .slice(0, dayIdx)
            .reduce((sum, arr) => sum + arr.length, 0);
          return (
            <DayColumn
              key={dayKey}
              dayLabel={DAY_LABELS[dayIdx]}
              dayDate={day.getDate()}
              classes={classesByDay[dayIdx]}
              colorOffset={offset}
              onClassPress={handleClassPress}
            />
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={styles.root}>
      {!isMobile && (
        <Sidebar
          activeItem="schedule"
          onNavigate={handleSidebarNav}
        />
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
          <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={() => setDrawerOpen(false)}>
            <View style={styles.drawerContainer}>
              <Sidebar activeItem="schedule" onNavigate={handleSidebarNav} />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <View style={[styles.main, isMobile && styles.mainMobile]}>
        {/* Header */}
        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <View style={styles.headerLeft}>
            {isMobile && (
              <TouchableOpacity
                testID="hamburger-btn"
                style={styles.hamburgerBtn}
                onPress={() => setDrawerOpen(true)}>
                <Text style={styles.hamburgerText}>☰</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>Schedule Dashboard</Text>
            {!isMobile && <Text style={styles.headerSubtitle}>Manage your weekly class schedule</Text>}
          </View>
          <TouchableOpacity
            testID="create-class-btn"
            style={[styles.createBtn, isMobile && styles.createBtnMobile]}
            onPress={() => router.push('/create-class' as never)}>
            <Text style={styles.createBtnText}>{isMobile ? '+' : '+ Create Class'}</Text>
          </TouchableOpacity>
        </View>

        {/* Toolbar */}
        <View style={[styles.toolbar, isMobile && styles.toolbarMobile]}>
          <View style={styles.weekNav}>
            <TouchableOpacity testID="week-nav-prev-btn" style={[styles.navArrowBtn, isMobile && styles.navArrowBtnMobile]} onPress={handlePrevWeek}>
              <Text style={styles.navArrowText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={[styles.weekLabel, isMobile && styles.weekLabelMobile]}>{formatWeekLabel(weekStart)}</Text>
            <TouchableOpacity testID="week-nav-next-btn" style={[styles.navArrowBtn, isMobile && styles.navArrowBtnMobile]} onPress={handleNextWeek}>
              <Text style={styles.navArrowText}>{'>'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'week' && styles.toggleBtnActive, isMobile && styles.toggleBtnMobile]}
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
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive, isMobile && styles.toggleBtnMobile]}
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
        {renderContent()}
      </View>
    </View>
  );
}

