import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from './schedule-dashboard.styles';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SafeScreen } from '@/components/SafeScreen';
import { Text, Icon, SegmentedToggle } from '@/components/cleanink';
import { Ink, Accent, Space, Status } from '@/constants/design';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { OwnerSidebar, OWNER_NAV_ITEMS } from '@/components/OwnerSidebar';
import { OwnerNavDrawer } from '@/components/OwnerNavDrawer';

// ─── Types ────────────────────────────────────────────────────────────────────

type GymClass = components['schemas']['ClassScheduleItemDto'];
type ApiClassesResponse = components['schemas']['GetClassScheduleResponseDto'];

type ViewMode = 'week' | 'list';

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

// ─── Class Card (desktop grid) ──────────────────────────────────────────────────

interface ClassCardProps {
  gymClass: GymClass;
  onPress: () => void;
}

function ClassCard({ gymClass, onPress }: ClassCardProps) {
  const isFull = gymClass.bookedCount >= gymClass.capacity;
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.classCard}>
      <Text size="meta" weight="semibold" tone="strong">
        {formatTime(gymClass.scheduledTime)}
      </Text>
      <Text size="meta" weight="semibold" tone="strong">{gymClass.classTypeName}</Text>
      {gymClass.coachName ? (
        <Text size="label" tone="muted">Coach: {gymClass.coachName}</Text>
      ) : null}
      <Text size="label" tone={isFull ? Status.danger : 'muted'}>
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
  onClassPress: (classId: string) => void;
}

function DayColumn({ dayLabel, dayDate, classes, onClassPress }: DayColumnProps) {
  return (
    <View style={styles.dayColumn}>
      <View style={styles.dayHeader}>
        <Text size="label" weight="semibold" tone="faint" upper>{dayLabel}</Text>
        <Text size="title" weight="bold" tone="strong">{dayDate}</Text>
      </View>
      {classes.length === 0 ? (
        <View style={styles.emptyDayCard}>
          <Text size="meta" tone="faint">No classes</Text>
        </View>
      ) : (
        classes.map((cls) => (
          <ClassCard key={cls.id} gymClass={cls} onPress={() => onClassPress(cls.id)} />
        ))
      )}
    </View>
  );
}

// ─── List View Row ────────────────────────────────────────────────────────────

function ListRow({ gymClass }: { gymClass: GymClass }) {
  const isFull = gymClass.bookedCount >= gymClass.capacity;
  return (
    <View style={styles.listRow}>
      <View style={styles.listRowMain}>
        <Text size="body" weight="semibold" tone="strong">{gymClass.classTypeName}</Text>
        <Text size="meta" tone="muted">
          {formatTime(gymClass.scheduledTime)}
          {gymClass.coachName ? `  •  Coach: ${gymClass.coachName}` : ''}
        </Text>
      </View>
      <Text size="body" weight="medium" tone={isFull ? Status.danger : 'muted'}>
        {gymClass.bookedCount}/{gymClass.capacity}
      </Text>
    </View>
  );
}

// ─── Mobile Day Strip ───────────────────────────────────────────────────────────

interface MobileDayStripProps {
  weekDays: Date[];
  selectedDayIdx: number;
  onSelectDay: (idx: number) => void;
}

function MobileDayStrip({ weekDays, selectedDayIdx, onSelectDay }: MobileDayStripProps) {
  return (
    <View style={styles.dayStrip}>
      {weekDays.map((day, idx) => {
        const isActive = idx === selectedDayIdx;
        return (
          <TouchableOpacity
            key={day.toISOString().slice(0, 10)}
            testID={`day-pill-${idx}`}
            style={[styles.dayPill, isActive && styles.dayPillActive]}
            onPress={() => onSelectDay(idx)}
            activeOpacity={0.8}>
            <Text size="label" weight="medium" tone={isActive ? Accent.on : 'muted'}>
              {DAY_LABELS[idx].charAt(0) + DAY_LABELS[idx].slice(1).toLowerCase()}
            </Text>
            <Text size="body" weight="bold" tone={isActive ? Accent.on : 'strong'}>
              {day.getDate()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Mobile Class Card (full-width) ─────────────────────────────────────────────

interface MobileClassCardProps {
  gymClass: GymClass;
  onPress: () => void;
}

function MobileClassCard({ gymClass, onPress }: MobileClassCardProps) {
  const isFull = gymClass.bookedCount >= gymClass.capacity;
  const metaParts = [
    gymClass.spaceName,
    gymClass.duration ? `${gymClass.duration} min` : null,
  ].filter(Boolean);

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.mobileClassCard}>
      <View style={styles.mobileClassCardTop}>
        <Text size="lead" weight="bold" tone="strong">
          {formatTime(gymClass.scheduledTime)}
        </Text>
        <Text size="body" weight="medium" tone={isFull ? Status.danger : 'muted'}>
          {gymClass.bookedCount}/{gymClass.capacity}
        </Text>
      </View>
      <Text size="title" weight="semibold" tone="strong">{gymClass.classTypeName}</Text>
      <Text size="meta" tone="muted">
        {gymClass.coachName ? `Coach: ${gymClass.coachName}` : 'No coach assigned'}
      </Text>
      {metaParts.length > 0 ? (
        <Text size="meta" tone="muted">{metaParts.join(' · ')}</Text>
      ) : null}
    </TouchableOpacity>
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
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
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
    const target = OWNER_NAV_ITEMS.find((item) => item.key === key);
    if (target?.route) router.push(target.route as never);
  };

  const handleClassPress = (classId: string) =>
    router.push(`/class-management?classId=${classId}` as never);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Ink.strong} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text size="body" tone={Status.danger} style={{ textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchClasses}>
            <Text size="body" tone="strong">Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (viewMode === 'list') {
      return (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {weekClasses.length === 0 ? (
            <View style={styles.emptyListContainer}>
              <Text size="body" tone="faint">No classes scheduled this week</Text>
            </View>
          ) : (
            weekClasses.map((cls) => <ListRow key={cls.id} gymClass={cls} />)
          )}
        </ScrollView>
      );
    }

    if (isMobile) {
      const dayClasses = classesByDay[selectedDayIdx] ?? [];
      return (
        <View style={{ flex: 1 }}>
          <MobileDayStrip
            weekDays={weekDays}
            selectedDayIdx={selectedDayIdx}
            onSelectDay={setSelectedDayIdx}
          />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mobileCardList}>
            {dayClasses.length === 0 ? (
              <View style={styles.mobileEmptyDay}>
                <Text size="body" tone="faint">No classes scheduled</Text>
              </View>
            ) : (
              dayClasses.map((cls) => (
                <MobileClassCard
                  key={cls.id}
                  gymClass={cls}
                  onPress={() => handleClassPress(cls.id)}
                />
              ))
            )}
          </ScrollView>
        </View>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gridContainer}>
        {weekDays.map((day, dayIdx) => {
          const dayKey = day.toISOString().slice(0, 10);
          return (
            <DayColumn
              key={dayKey}
              dayLabel={DAY_LABELS[dayIdx]}
              dayDate={day.getDate()}
              classes={classesByDay[dayIdx]}
              onClassPress={handleClassPress}
            />
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={styles.root}>
      {!isMobile && <OwnerSidebar activeItem="schedule" onNavigate={handleSidebarNav} />}

      {/* Mobile drawer */}
      {isMobile && (
        <OwnerNavDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <OwnerSidebar activeItem="schedule" onNavigate={handleSidebarNav} />
        </OwnerNavDrawer>
      )}

      <SafeScreen style={[styles.main, isMobile && styles.mainMobile]} applyTopInset={isMobile} extraTopPadding={Space.base}>
        {/* Header */}
        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <View style={styles.headerLeft}>
            {isMobile && (
              <TouchableOpacity
                testID="hamburger-btn"
                style={styles.hamburgerBtn}
                onPress={() => setDrawerOpen(true)}>
                <Icon name="menu" size={24} tone="strong" />
              </TouchableOpacity>
            )}
            <Text size="screen" weight="bold" tone="strong">
              {isMobile ? 'Schedule' : 'Schedule Dashboard'}
            </Text>
            {!isMobile && <Text size="meta" tone="muted">Manage your weekly class schedule</Text>}
          </View>
          {isMobile ? (
            <TouchableOpacity
              testID="create-class-btn"
              style={styles.createIconBtn}
              onPress={() => router.push('/create-class' as never)}>
              <Icon name="add" size={26} tone={Accent.base} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              testID="create-class-btn"
              style={styles.createBtn}
              onPress={() => router.push('/create-class' as never)}>
              <Icon name="add" size={18} tone={Accent.on} />
              <Text size="body" weight="semibold" tone={Accent.on}>Create Class</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Toolbar */}
        {isMobile ? (
          <View style={styles.weekNavMobile}>
            <TouchableOpacity testID="week-nav-prev-btn" style={styles.navArrowBtnMobile} onPress={handlePrevWeek}>
              <Icon name="back" size={20} tone="muted" />
            </TouchableOpacity>
            <Text size="body" weight="semibold" tone="strong">{formatWeekLabel(weekStart)}</Text>
            <TouchableOpacity testID="week-nav-next-btn" style={styles.navArrowBtnMobile} onPress={handleNextWeek}>
              <Icon name="chevronForward" size={20} tone="muted" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.toolbar}>
            <View style={styles.weekNav}>
              <TouchableOpacity testID="week-nav-prev-btn" style={styles.navArrowBtn} onPress={handlePrevWeek}>
                <Icon name="back" size={18} tone="muted" />
              </TouchableOpacity>
              <Text size="body" weight="semibold" tone="strong">{formatWeekLabel(weekStart)}</Text>
              <TouchableOpacity testID="week-nav-next-btn" style={styles.navArrowBtn} onPress={handleNextWeek}>
                <Icon name="chevronForward" size={18} tone="muted" />
              </TouchableOpacity>
            </View>

            <View style={styles.viewToggle}>
              <SegmentedToggle<ViewMode>
                options={[
                  { value: 'week', label: 'Week' },
                  { value: 'list', label: 'List' },
                ]}
                value={viewMode}
                onChange={setViewMode}
              />
            </View>
          </View>
        )}

        {/* Content */}
        {renderContent()}
      </SafeScreen>
    </View>
  );
}
