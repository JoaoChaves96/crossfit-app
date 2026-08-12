import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from './members.styles';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SafeScreen } from '@/components/SafeScreen';
import { Text, Icon, StatusChip, type ChipTone } from '@/components/cleanink';
import { Ink, Status, Space } from '@/constants/design';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { OwnerSidebar, OWNER_NAV_ITEMS } from '@/components/OwnerSidebar';
import { OwnerNavDrawer } from '@/components/OwnerNavDrawer';
import { MemberDetailsPanel } from '@/components/MemberDetailsPanel';

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

type MembershipStatus = GymMember['membershipStatus'];

const MEMBERSHIP_CHIP: Record<MembershipStatus, { tone: ChipTone; label: string }> = {
  // No amber token exists in Clean Ink, so 'expiring' shares 'neutral' with
  // 'inactive'. Status.open green stays reserved for genuinely open status.
  active: { tone: 'open', label: 'Active' },
  expiring: { tone: 'neutral', label: 'Expiring' },
  expired: { tone: 'danger', label: 'Expired' },
  inactive: { tone: 'neutral', label: 'Suspended' },
};

export function membershipChipProps(status: MembershipStatus) {
  return MEMBERSHIP_CHIP[status] ?? MEMBERSHIP_CHIP.expired;
}

// Deliberately does NOT delegate to formatJoinedDate. expiresAt marks the
// last day a plan covers, and reading it with local-time getters would shift
// that day depending on the viewer's timezone (and disagree with the exact
// date the owner set — see ExtendMembershipRequestDto, whose own Swagger
// example is midnight UTC). Reading it in UTC is deterministic for every
// viewer and always echoes back the date that was set. formatJoinedDate
// covers a different field (joinedAt) with different semantics and is left
// as-is on purpose — do not merge these into a shared helper.
function formatExpiry(isoDate: string | null): string {
  if (!isoDate) return 'No expiry';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
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
      <View style={styles.colPlan}>
        <Text size="label" weight="semibold" tone="muted" upper>PLAN</Text>
      </View>
      <View style={styles.colExpires}>
        <Text size="label" weight="semibold" tone="muted" upper>EXPIRES</Text>
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
  onPress: () => void;
}

function MemberRow({ member, isAlternate, onPress }: MemberRowProps) {
  return (
    <TouchableOpacity
      testID={`member-row-${member.id}`}
      style={[styles.drow, isAlternate && styles.drowAlt]}
      onPress={onPress}
      activeOpacity={0.7}>
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
      <View style={styles.colPlan}>
        <View style={styles.colPlanRow}>
          <Text size="body" tone="muted" numberOfLines={1}>{member.planName ?? '—'}</Text>
          {member.autoRollCount > 0 && (
            <Text
              size="meta"
              tone="faint"
              testID={`member-autoroll-${member.id}`}>
              {`↻ ${member.autoRollCount}`}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.colExpires}>
        <Text size="body" tone="muted">{member.planName ? formatExpiry(member.expiresAt) : '—'}</Text>
      </View>
      <View style={styles.colJoined}>
        <Text size="body" tone="muted">{formatJoinedDate(member.joinedAt)}</Text>
      </View>
      <View style={styles.colStatus}>
        <StatusChip {...membershipChipProps(member.membershipStatus)} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Member Card (Mobile) ────────────────────────────────────────────────────

interface MemberCardProps {
  member: GymMember;
  onPress: () => void;
}

function MemberCard({ member, onPress }: MemberCardProps) {
  return (
    <TouchableOpacity
      testID={`member-card-${member.id}`}
      style={styles.memberCard}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.memberCardTop}>
        <View style={styles.avatar}>
          <Text size="meta" weight="bold" tone="muted">{getInitials(member.name)}</Text>
        </View>
        <View style={styles.memberCardInfo}>
          <Text size="body" weight="semibold" tone="strong" numberOfLines={1}>{member.name}</Text>
          <Text size="meta" tone="muted" numberOfLines={1}>{member.email}</Text>
        </View>
        <StatusChip {...membershipChipProps(member.membershipStatus)} />
      </View>
      <Text size="meta" tone="muted" style={styles.memberCardJoined}>Joined {formatJoinedDate(member.joinedAt)}</Text>
      <Text size="meta" tone="muted" style={styles.memberCardPlan}>
        {member.planName
          ? `${member.planName} · ${member.expiresAt ? `Expires ${formatExpiry(member.expiresAt)}` : 'No expiry'}`
          : 'No plan'}
      </Text>
    </TouchableOpacity>
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
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const query = search.trim().toLowerCase();
  const visibleMembers = query
    ? members.filter(
        (member) =>
          member.name.toLowerCase().includes(query) ||
          member.email.toLowerCase().includes(query),
      )
    : members;
  const selectedMember = visibleMembers.find((m) => m.id === selectedId) ?? null;

  return (
    <View style={styles.root}>
      {!isMobile && <OwnerSidebar activeItem="members" onNavigate={handleNavigate} />}

      {/* Mobile drawer */}
      {isMobile && (
        <OwnerNavDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <OwnerSidebar activeItem="members" onNavigate={handleNavigate} />
        </OwnerNavDrawer>
      )}

      <SafeScreen style={styles.contentRow} applyTopInset={isMobile} extraTopPadding={Space.base}>
        <View style={[styles.main, isMobile && styles.mainMobile]}>
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
                {isLoading
                  ? '…'
                  : `${visibleMembers.length} ${visibleMembers.length === 1 ? 'member' : 'members'}`}
              </Text>
            </View>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              testID="members-search-input"
              style={styles.searchInput}
              placeholder="Search by name or email"
              placeholderTextColor={Ink.faint}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
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
          ) : visibleMembers.length === 0 ? (
            <EmptyState />
          ) : isMobile ? (
            /* Mobile: card-based list */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.memberCardList}>
              {visibleMembers.map((member) => (
                <MemberCard key={member.id} member={member} onPress={() => setSelectedId(member.id)} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.tableCard}>
              <TableHeaderRow />
              <ScrollView showsVerticalScrollIndicator={false}>
                {visibleMembers.map((member, idx) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isAlternate={idx === 0}
                    onPress={() => setSelectedId(member.id)}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {selectedMember && (
          <MemberDetailsPanel
            member={selectedMember}
            onClose={() => setSelectedId(null)}
            onChanged={fetchMembers}
          />
        )}
      </SafeScreen>
    </View>
  );
}
