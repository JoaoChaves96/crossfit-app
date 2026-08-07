import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SafeScreen } from '@/components/SafeScreen';
import { Text, Icon, StatusChip, Button, SegmentedToggle } from '@/components/cleanink';
import { Ink, Status, Space } from '@/constants/design';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { CoachSidebar, COACH_NAV_ITEMS } from '@/components/CoachSidebar';
import { OwnerNavDrawer } from '@/components/OwnerNavDrawer';
import { STATE_LABEL, STATE_CHIP_TONE } from './class-management/classStates';
import { styles, mobileStyles } from './coach-classes.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

type CoachClassItem = components['schemas']['CoachClassItemDto'];
type GetCoachClassesResponse = components['schemas']['GetCoachClassesResponseDto'];

type FilterMode = 'upcoming' | 'past';

// Explicit testIDs keep the pre-restyle `filter-*-btn` names that
// e2e/coach.spec.ts documents, which the `{prefix}-{value}` default would
// otherwise rename.
const FILTER_OPTIONS: { value: FilterMode; label: string; testID: string }[] = [
  { value: 'upcoming', label: 'Upcoming', testID: 'filter-upcoming-btn' },
  { value: 'past', label: 'Past', testID: 'filter-past-btn' },
];

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

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  return `${hourStr.padStart(2, '0')}:${(minuteStr ?? '00').padStart(2, '0')}`;
}

function isUpcoming(scheduledDate: string, scheduledTime: string): boolean {
  const classDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
  return classDateTime >= new Date();
}

// ─── Table Row (Desktop) ─────────────────────────────────────────────────────

interface ClassRowProps {
  gymClass: CoachClassItem;
  onView: (gymClass: CoachClassItem) => void;
}

function ClassRow({ gymClass, onView }: ClassRowProps) {
  const dateTimeLabel = formatDateTime(gymClass.scheduledDate, gymClass.scheduledTime);
  const isFull = gymClass.bookedCount >= gymClass.capacity;

  return (
    <View testID={`coach-class-row-${gymClass.id}`} style={styles.tableRow}>
      <View style={styles.colClassType}>
        <Text size="body" weight="semibold" tone="strong" numberOfLines={1}>
          {gymClass.classTypeName}
        </Text>
      </View>
      <View style={styles.colDateTime}>
        <Text size="meta" tone="muted" numberOfLines={1}>{dateTimeLabel}</Text>
      </View>
      <View style={styles.colSpace}>
        <Text size="meta" tone="muted" numberOfLines={1}>{gymClass.spaceName}</Text>
      </View>
      <View style={styles.colCapacity}>
        <Text size="meta" weight="medium" tone={isFull ? Status.danger : 'muted'}>
          {gymClass.bookedCount} / {gymClass.capacity}
        </Text>
      </View>
      <View style={styles.colStatus}>
        <StatusChip tone={STATE_CHIP_TONE[gymClass.state]} label={STATE_LABEL[gymClass.state]} />
      </View>
      <View style={styles.colAction}>
        <Button
          testID={`coach-class-view-btn-${gymClass.id}`}
          label="View"
          variant="quiet"
          onPress={() => onView(gymClass)}
        />
      </View>
    </View>
  );
}

// ─── Mobile Class Card ───────────────────────────────────────────────────────

interface MobileClassCardProps {
  gymClass: CoachClassItem;
  onView: (gymClass: CoachClassItem) => void;
}

function MobileClassCard({ gymClass, onView }: MobileClassCardProps) {
  const dateTimeLabel = formatDateTime(gymClass.scheduledDate, gymClass.scheduledTime);
  const isFull = gymClass.bookedCount >= gymClass.capacity;

  return (
    <View testID={`coach-class-row-${gymClass.id}`} style={mobileStyles.classCard}>
      <View style={mobileStyles.classCardTop}>
        <Text size="lead" weight="bold" tone="strong">
          {formatTime(gymClass.scheduledTime)}
        </Text>
        <StatusChip tone={STATE_CHIP_TONE[gymClass.state]} label={STATE_LABEL[gymClass.state]} />
      </View>

      <Text size="title" weight="semibold" tone="strong" numberOfLines={1}>
        {gymClass.classTypeName}
      </Text>
      <Text size="meta" tone="muted">{dateTimeLabel}</Text>

      <View style={mobileStyles.classCardMeta}>
        <View style={mobileStyles.classCardMetaRow}>
          <Icon name="place" size={16} tone="faint" />
          <Text size="meta" tone="muted">{gymClass.spaceName}</Text>
        </View>
        <View style={mobileStyles.classCardMetaRow}>
          <Icon name="people" size={16} tone="faint" />
          <Text size="meta" weight="medium" tone={isFull ? Status.danger : 'muted'}>
            {gymClass.bookedCount} / {gymClass.capacity} booked
          </Text>
        </View>
      </View>

      <View style={mobileStyles.classCardFooter}>
        <Button
          testID={`coach-class-view-btn-${gymClass.id}`}
          label="View Details"
          variant="quiet"
          onPress={() => onView(gymClass)}
        />
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CoachClassesScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentGymId } = useGym();
  const { isMobile } = useResponsiveLayout();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [allClasses, setAllClasses] = useState<CoachClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('upcoming');

  const fetchClasses = useCallback(async () => {
    if (!token || !currentGymId) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = createApiClient({ token });
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
  }, [token, currentGymId]);

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
        duration: String(gymClass.duration),
        spaceName: gymClass.spaceName,
        capacity: String(gymClass.capacity),
        bookedCount: String(gymClass.bookedCount),
        state: gymClass.state,
      },
    });
  };

  const handleSidebarNav = (key: string) => {
    setDrawerOpen(false);
    const target = COACH_NAV_ITEMS.find((item) => item.key === key);
    if (target?.route) router.push(target.route as never);
  };

  const emptyState = (
    <View style={styles.emptyState}>
      <Text size="title" weight="semibold" tone="strong" style={{ textAlign: 'center' }}>
        {filterMode === 'upcoming'
          ? 'No upcoming classes assigned'
          : 'No past classes found'}
      </Text>
      <Text size="body" tone="muted" style={{ textAlign: 'center' }}>
        {filterMode === 'upcoming'
          ? 'Check back later or contact your gym owner.'
          : 'Your past assigned classes will appear here.'}
      </Text>
    </View>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Ink.strong} />
        </View>
      );
    }

    if (error !== null) {
      return (
        <View style={styles.centered}>
          <Text size="body" tone={Status.danger} style={{ textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchClasses}>
            <Text size="body" tone="strong">Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Mobile: vertical card list.
    if (isMobile) {
      if (filteredClasses.length === 0) return emptyState;
      return (
        <ScrollView
          testID="coach-class-list"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={mobileStyles.cardList}>
          {filteredClasses.map((cls) => (
            <MobileClassCard key={cls.id} gymClass={cls} onView={handleView} />
          ))}
        </ScrollView>
      );
    }

    // Desktop: hairline table inside a card surface.
    return (
      <View style={styles.classesCard}>
        <View style={styles.tableHeader}>
          <View style={styles.colClassType}>
            <Text size="label" weight="semibold" tone="faint" upper>Class Type</Text>
          </View>
          <View style={styles.colDateTime}>
            <Text size="label" weight="semibold" tone="faint" upper>Date &amp; Time</Text>
          </View>
          <View style={styles.colSpace}>
            <Text size="label" weight="semibold" tone="faint" upper>Space</Text>
          </View>
          <View style={styles.colCapacity}>
            <Text size="label" weight="semibold" tone="faint" upper>Capacity</Text>
          </View>
          <View style={styles.colStatus}>
            <Text size="label" weight="semibold" tone="faint" upper>Status</Text>
          </View>
          <View style={styles.colAction}>
            <Text size="label" weight="semibold" tone="faint" upper>Action</Text>
          </View>
        </View>

        {filteredClasses.length === 0 ? (
          emptyState
        ) : (
          <ScrollView testID="coach-class-list" showsVerticalScrollIndicator={false}>
            {filteredClasses.map((cls) => (
              <ClassRow key={cls.id} gymClass={cls} onView={handleView} />
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root} testID="coach-classes-screen">
      {!isMobile && <CoachSidebar activeItem="classes" onNavigate={handleSidebarNav} />}

      {/* Mobile drawer */}
      {isMobile && (
        <OwnerNavDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <CoachSidebar activeItem="classes" onNavigate={handleSidebarNav} />
        </OwnerNavDrawer>
      )}

      <SafeScreen
        style={[styles.main, isMobile && styles.mainMobile]}
        applyTopInset={isMobile}
        extraTopPadding={Space.base}>
        {/* Header */}
        <View style={styles.header}>
          {isMobile && (
            <TouchableOpacity
              testID="hamburger-btn"
              style={styles.hamburgerBtn}
              onPress={() => setDrawerOpen(true)}>
              <Icon name="menu" size={24} tone="strong" />
            </TouchableOpacity>
          )}
          <Text size="screen" weight="bold" tone="strong">My Assigned Classes</Text>
        </View>

        {/* Upcoming / Past filter */}
        <View style={styles.filterRow}>
          <View style={[styles.filterToggle, isMobile && styles.filterToggleMobile]}>
            <SegmentedToggle<FilterMode>
              options={FILTER_OPTIONS}
              value={filterMode}
              onChange={setFilterMode}
            />
          </View>
        </View>

        {/* Content */}
        {renderContent()}
      </SafeScreen>
    </View>
  );
}
