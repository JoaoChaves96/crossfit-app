import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from './members.styles';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';

// ─── Types ────────────────────────────────────────────────────────────────────

type GymMember = components['schemas']['GymMemberItemDto'];
type GetGymMembersResponse = components['schemas']['GetGymMembersResponseDto'];

// ─── Design Tokens ────────────────────────────────────────────────────────────

const COLOR = {
  white: '#FFFFFF',
  sidebarBg: '#F3F4F6',
  bodyText: '#111827',
  subText: '#6B7280',
  mutedText: '#9CA3AF',
  borderLight: '#E5E7EB',
  cardBorder: '#E4E4EA',
  tableHeaderBg: '#F9FAFB',
  activeNavBg: '#DBEAFE',
  activeNavIcon: '#1D4ED8',
  activeNavText: '#1D4ED8',
  inactiveNavIcon: '#9CA3AF',
  inactiveNavText: '#6B7280',
  avatarBg: '#DBEAFE',
  activeBadgeBg: '#D1FAE5',
  activeBadgeText: '#065F46',
  countBadgeBg: '#F3F4F6',
  emptyIconBg: '#F0F0F0',
  rowAltBg: '#EEF0FF',
  nameText: '#1A1A2E',
  cellText: '#555568',
  errorText: '#DC2626',
  borderMid: '#D1D5DB',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatJoinedDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── NAV Items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: { label: string; key: string; enabled: boolean }[] = [
  { label: 'Dashboard', key: 'dashboard', enabled: false },
  { label: 'Schedule', key: 'schedule', enabled: true },
  { label: 'Classes', key: 'classes', enabled: false },
  { label: 'Members', key: 'members', enabled: true },
  { label: 'Coaches', key: 'coaches', enabled: true },
  { label: 'Settings', key: 'settings', enabled: true },
];

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
          const isActive = item.key === 'members';
          const isDisabled = !item.enabled;
          return (
            <TouchableOpacity
              key={item.key}
              testID={`sidebar-nav-${item.key}`}
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

// ─── Table Header Row ─────────────────────────────────────────────────────────

function TableHeaderRow() {
  return (
    <View style={styles.hrow}>
      <View style={styles.colName}>
        <Text style={styles.hCell}>NAME</Text>
      </View>
      <View style={styles.colEmail}>
        <Text style={styles.hCell}>EMAIL</Text>
      </View>
      <View style={styles.colJoined}>
        <Text style={styles.hCell}>JOINED</Text>
      </View>
      <View style={styles.colStatus}>
        <Text style={styles.hCell}>STATUS</Text>
      </View>
    </View>
  );
}

// ─── Member Row ───────────────────────────────────────────────────────────────

interface MemberRowProps {
  member: GymMember;
  isAlternate: boolean;
}

function MemberRow({ member, isAlternate }: MemberRowProps) {
  return (
    <View style={[styles.drow, isAlternate && styles.drowAlt]}>
      <View style={[styles.colName, styles.colNameRow]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(member.name)}</Text>
        </View>
        <Text style={styles.memberName} numberOfLines={1}>
          {member.name}
        </Text>
      </View>
      <View style={styles.colEmail}>
        <Text style={styles.cellText} numberOfLines={1}>
          {member.email}
        </Text>
      </View>
      <View style={styles.colJoined}>
        <Text style={styles.cellText}>{formatJoinedDate(member.joinedAt)}</Text>
      </View>
      <View style={styles.colStatus}>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconCircle} />
      <Text style={styles.emptyTitle}>No members yet</Text>
      <Text style={styles.emptyDesc}>Members will appear here once athletes join your gym.</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MembersScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentGymId } = useGym();

  const [members, setMembers] = useState<GymMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!token || !currentGymId) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = createApiClient({ token });
      const data = await client.get<GetGymMembersResponse>(
        `/api/gyms/${currentGymId}/members`
      );
      setMembers(data.members ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load members';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [token, currentGymId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  function handleNavigate(key: string) {
    if (key === 'schedule') router.push('/schedule-dashboard' as never);
    if (key === 'coaches') router.push('/coaches' as never);
    if (key === 'settings') router.push('/gym-settings' as never);
  }

  return (
    <View style={styles.root}>
      <Sidebar onNavigate={handleNavigate} />

      <View style={styles.main}>
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Members</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {isLoading ? '…' : `${members.length} members`}
            </Text>
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
            <TouchableOpacity style={styles.retryBtn} onPress={fetchMembers}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : members.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.tableCard}>
            <TableHeaderRow />
            <ScrollView showsVerticalScrollIndicator={false}>
              {members.map((member, idx) => (
                <MemberRow key={member.id} member={member} isAlternate={idx === 0} />
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

