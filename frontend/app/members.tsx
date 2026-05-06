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
    backgroundColor: COLOR.activeNavIcon,
  },
  navIconInactive: {
    backgroundColor: COLOR.inactiveNavIcon,
  },
  navIconMuted: {
    backgroundColor: COLOR.inactiveNavIcon,
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

  // Main area
  main: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 24,
  },

  // Page header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLOR.bodyText,
  },
  countBadge: {
    backgroundColor: COLOR.countBadgeBg,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLOR.subText,
  },

  // Table card
  tableCard: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: COLOR.white,
    borderWidth: 1,
    borderColor: COLOR.cardBorder,
    overflow: 'hidden',
  },

  // Column widths
  colName: {
    width: 160,
    height: '100%',
    justifyContent: 'center',
  },
  colNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colEmail: {
    width: 200,
    height: '100%',
    justifyContent: 'center',
  },
  colJoined: {
    width: 110,
    height: '100%',
    justifyContent: 'center',
  },
  colStatus: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },

  // Header row
  hrow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 16,
    backgroundColor: COLOR.tableHeaderBg,
  },
  hCell: {
    fontSize: 11,
    fontWeight: '700',
    color: COLOR.mutedText,
    letterSpacing: 0.5,
  },

  // Data row
  drow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.borderLight,
  },
  drowAlt: {
    backgroundColor: COLOR.rowAltBg,
  },

  // Avatar
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLOR.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLOR.activeNavIcon,
  },

  // Member name cell
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.nameText,
    flex: 1,
  },

  // Cell text
  cellText: {
    fontSize: 13,
    fontWeight: '400',
    color: COLOR.cellText,
  },

  // Active badge
  activeBadge: {
    backgroundColor: COLOR.activeBadgeBg,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLOR.activeBadgeText,
  },

  // Empty state card
  emptyCard: {
    borderRadius: 10,
    backgroundColor: COLOR.white,
    borderWidth: 1,
    borderColor: COLOR.cardBorder,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLOR.emptyIconBg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.bodyText,
  },
  emptyDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: COLOR.subText,
    textAlign: 'center',
    paddingHorizontal: 24,
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
});
