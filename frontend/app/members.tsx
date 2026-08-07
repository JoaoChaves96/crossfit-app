import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from './members.styles';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SafeScreen } from '@/components/SafeScreen';
import { Text, Icon, StatusChip } from '@/components/cleanink';
import { Ink, Status, Space } from '@/constants/design';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { OwnerSidebar, OWNER_NAV_ITEMS } from '@/components/OwnerSidebar';
import { OwnerNavDrawer } from '@/components/OwnerNavDrawer';

// ─── Types ────────────────────────────────────────────────────────────────────

type GymMember = components['schemas']['GymMemberItemDto'];
type GetGymMembersResponse = components['schemas']['GetGymMembersResponseDto'];

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
        <Text size="label" weight="semibold" tone="muted" upper>NAME</Text>
      </View>
      <View style={styles.colEmail}>
        <Text size="label" weight="semibold" tone="muted" upper>EMAIL</Text>
      </View>
      <View style={styles.colJoined}>
        <Text size="label" weight="semibold" tone="muted" upper>JOINED</Text>
      </View>
      <View style={styles.colStatus}>
        <Text size="label" weight="semibold" tone="muted" upper>STATUS</Text>
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
          <Text size="meta" weight="bold" tone="muted">{getInitials(member.name)}</Text>
        </View>
        <Text size="body" weight="semibold" tone="strong" style={styles.nameText} numberOfLines={1}>
          {member.name}
        </Text>
      </View>
      <View style={styles.colEmail}>
        <Text size="body" tone="muted" numberOfLines={1}>
          {member.email}
        </Text>
      </View>
      <View style={styles.colJoined}>
        <Text size="body" tone="muted">{formatJoinedDate(member.joinedAt)}</Text>
      </View>
      <View style={styles.colStatus}>
        <StatusChip tone="open" label="Active" />
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
          <Text size="meta" weight="bold" tone="muted">{getInitials(member.name)}</Text>
        </View>
        <View style={styles.memberCardInfo}>
          <Text size="body" weight="semibold" tone="strong" numberOfLines={1}>{member.name}</Text>
          <Text size="meta" tone="muted" numberOfLines={1}>{member.email}</Text>
        </View>
        <StatusChip tone="open" label="Active" />
      </View>
      <Text size="meta" tone="muted" style={styles.memberCardJoined}>Joined {formatJoinedDate(member.joinedAt)}</Text>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconCircle}>
        <Icon name="people" size={28} tone="faint" />
      </View>
      <Text size="title" weight="semibold" tone="strong">No members yet</Text>
      <Text size="body" tone="muted" style={styles.emptyDesc}>Members will appear here once athletes join your gym.</Text>
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
        <OwnerNavDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <OwnerSidebar activeItem="members" onNavigate={handleNavigate} />
        </OwnerNavDrawer>
      )}

      <SafeScreen style={[styles.main, isMobile && styles.mainMobile]} applyTopInset={isMobile} extraTopPadding={Space.base}>
        {/* Page Header */}
        <View style={styles.pageHeader}>
          {isMobile && (
            <TouchableOpacity
              testID="hamburger-btn"
              style={styles.hamburgerBtn}
              onPress={() => setDrawerOpen(true)}>
              <Icon name="menu" size={24} tone="strong" />
            </TouchableOpacity>
          )}
          <Text size="screen" weight="bold" tone="strong">Members</Text>
          <View style={styles.countBadge}>
            <Text size="meta" weight="medium" tone="muted">
              {isLoading ? '…' : `${members.length} members`}
            </Text>
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Ink.strong} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text size="body" tone={Status.danger} style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchMembers}>
              <Text size="body" tone="strong">Retry</Text>
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
