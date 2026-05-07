import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { AppColors } from '@/constants/theme';
import { styles } from './coach-classes.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

type CoachClassItem = components['schemas']['CoachClassItemDto'];
type GetCoachClassesResponse = components['schemas']['GetCoachClassesResponseDto'];

type FilterMode = 'upcoming' | 'past';

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
      return { label: 'Published', bg: AppColors.successBgLight, textColor: AppColors.darkSurface };
    case 'booking_closed':
      return { label: 'Booking Closed', bg: AppColors.warningBgAmber, textColor: AppColors.warningLabel };
    case 'in_progress':
      return { label: 'In Progress', bg: AppColors.badgeBlueBgLight, textColor: AppColors.actionBlueDarker };
    case 'completed':
      return { label: 'Completed', bg: AppColors.borderFaint, textColor: AppColors.errorLabel };
    case 'archived':
      return { label: 'Archived', bg: AppColors.borderFaint, textColor: AppColors.errorLabel };
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
  const { token } = useAuth();
  const { currentGymId } = useGym();

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
            <ActivityIndicator size="large" color={AppColors.darkSurface} />
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
