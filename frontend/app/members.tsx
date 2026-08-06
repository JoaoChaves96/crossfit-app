import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from './members.styles';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SafeScreen } from '@/components/SafeScreen';
import { Spacing } from '@/constants/theme';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { OwnerSidebar, OWNER_NAV_ITEMS } from '@/components/OwnerSidebar';

// ─── Types ────────────────────────────────────────────────────────────────────

type GymMember = components['schemas']['GymMemberItemDto'];
type GetGymMembersResponse = components['schemas']['GetGymMembersResponseDto'];

// ─── Design Tokens ────────────────────────────────────────────────────────────

const COLOR = {
  bodyText: '#111827',
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

// ─── Member Card (Mobile) ────────────────────────────────────────────────────

interface MemberCardProps {
  member: GymMember;
}

function MemberCard({ member }: MemberCardProps) {
  return (
    <View style={styles.memberCard}>
      <View style={styles.memberCardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(member.name)}</Text>
        </View>
        <View style={styles.memberCardInfo}>
          <Text style={styles.memberName} numberOfLines={1}>{member.name}</Text>
          <Text style={styles.cellText} numberOfLines={1}>{member.email}</Text>
        </View>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
      </View>
      <Text style={styles.memberCardJoined}>Joined {formatJoinedDate(member.joinedAt)}</Text>
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
  const { isMobile } = useResponsiveLayout();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    setDrawerOpen(false);
    const target = OWNER_NAV_ITEMS.find((item) => item.key === key);
    if (target?.route) router.push(target.route as never);
  }

  return (
    <View style={styles.root}>
      {!isMobile && <OwnerSidebar activeItem="members" onNavigate={handleNavigate} />}

      {/* Mobile drawer */}
      {isMobile && (
        <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
          <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={() => setDrawerOpen(false)}>
            <View style={styles.drawerContainer}>
              <OwnerSidebar activeItem="members" onNavigate={handleNavigate} />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <SafeScreen style={[styles.main, isMobile && styles.mainMobile]} applyTopInset={isMobile} extraTopPadding={Spacing.base}>
        {/* Page Header */}
        <View style={styles.pageHeader}>
          {isMobile && (
            <TouchableOpacity
              testID="hamburger-btn"
              style={styles.hamburgerBtn}
              onPress={() => setDrawerOpen(true)}>
              <Text style={styles.hamburgerText}>☰</Text>
            </TouchableOpacity>
          )}
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
        ) : isMobile ? (
          /* Mobile: card-based list */
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.memberCardList}>
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </ScrollView>
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
      </SafeScreen>
    </View>
  );
}

