import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SafeScreen } from '@/components/SafeScreen';
import { Text, Icon, Button, StatusChip } from '@/components/cleanink';
import { Ink, Accent, Space, Status } from '@/constants/design';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { OwnerSidebar, OWNER_NAV_ITEMS } from '@/components/OwnerSidebar';
import { OwnerNavDrawer } from '@/components/OwnerNavDrawer';
import { styles } from './coaches.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

type InviteCoachRequest = components['schemas']['InviteCoachDto'];
type InviteCoachResponse = components['schemas']['InviteCoachResponseDto'];

type CoachListItem = components['schemas']['CoachListItemDto'];
type CoachesListResponse = components['schemas']['GetCoachesResponseDto'];
type ChangeCoachStatusResponse = components['schemas']['ChangeCoachStatusResponseDto'];
type CoachStatus = 'active' | 'inactive';
type CoachInvite = components['schemas']['InviteListItemDto'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inviteLinkFor(inviteToken: string): string {
  // The list endpoint returns the token, not the link the backend built, so
  // rebuild it against this origin. Email delivery does not exist yet, so
  // this string is the whole delivery mechanism.
  const origin =
    typeof window !== 'undefined' && window.location
      ? window.location.origin
      : '';
  return `${origin}/invite/${inviteToken}`;
}

function confirmDeactivate(displayName: string, onConfirm: () => void) {
  Alert.alert(
    'Deactivate Coach',
    `Are you sure you want to deactivate ${displayName}? They will no longer be assigned to new classes.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: onConfirm },
    ],
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
// Active coaches read as an "open"/available state; inactive is a quiet neutral.

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return status === 'active' ? (
    <StatusChip tone="open" label="Active" />
  ) : (
    <StatusChip tone="neutral" label="Inactive" />
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────
// Deactivate/Disable is destructive → danger. Reactivate/Enable is a quiet
// neutral action; the single crimson accent stays reserved for the Invite CTA.

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant: 'deactivate' | 'reactivate';
  disabled: boolean;
}

function ActionButton({ label, onPress, variant, disabled }: ActionButtonProps) {
  return (
    <Button
      label={label}
      onPress={onPress}
      variant={variant === 'deactivate' ? 'danger' : 'quiet'}
      disabled={disabled}
    />
  );
}

// ─── Coach Row ────────────────────────────────────────────────────────────────

interface CoachRowProps {
  coach: CoachListItem;
  isSelected: boolean;
  onSelect: (coachUserId: string) => void;
}

function CoachRow({ coach, isSelected, onSelect }: CoachRowProps) {
  const displayName = coach.name || coach.email;
  const classesLabel =
    coach.classesAssigned.length > 0 ? coach.classesAssigned.join(', ') : null;

  return (
    <TouchableOpacity
      style={[styles.coachRow, isSelected && styles.coachRowSelected]}
      onPress={() => onSelect(coach.userId)}
      activeOpacity={0.7}>
      <View style={styles.colName}>
        <View style={styles.coachAvatar}>
          <Text size="body" weight="semibold" tone="muted">
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.coachNameText}>
          <Text size="body" weight="semibold" numberOfLines={1}>{displayName}</Text>
        </View>
      </View>
      <View style={styles.colEmail}>
        <Text size="meta" tone="muted" numberOfLines={1}>{coach.email}</Text>
      </View>
      <View style={styles.colStatus}>
        <StatusBadge status={coach.status} />
      </View>
      <View style={styles.colClasses}>
        {classesLabel !== null ? (
          <Text size="meta" tone="muted" numberOfLines={1}>{classesLabel}</Text>
        ) : (
          <Text size="meta" tone="faint">—</Text>
        )}
      </View>
      <View style={styles.colActions}>
        <TouchableOpacity
          testID={`coach-view-${coach.userId}`}
          style={styles.viewBtn}
          onPress={() => onSelect(coach.userId)}
          activeOpacity={0.7}>
          <Text size="body" weight="medium" tone="muted">View</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Pending Invite Row (Desktop) ─────────────────────────────────────────────
// Per the One Accent Rule the crimson stays on the header CTA, so both row
// actions here are quiet and revoke is Status.danger — a different red.
// There is no name yet — the invitee hasn't accepted — so NAME stays blank
// and the email lands under its own header, same as CoachRow.

interface PendingInviteRowProps {
  invite: CoachInvite;
  onCopy: (invite: CoachInvite) => void;
  onRevoke: (invite: CoachInvite) => void;
  copiedToken: string | null;
  isRevoking: boolean;
}

function PendingInviteRow({
  invite,
  onCopy,
  onRevoke,
  copiedToken,
  isRevoking,
}: PendingInviteRowProps) {
  return (
    <View testID={`pending-invite-row-${invite.inviteToken}`} style={styles.pendingRow}>
      <View style={styles.colName}>
        <Text size="body" tone="faint">—</Text>
      </View>
      <View style={styles.colEmail}>
        <Text size="body" weight="semibold" numberOfLines={1}>
          {invite.inviteeEmail}
        </Text>
      </View>
      <View style={styles.colStatus}>
        <StatusChip tone="neutral" label="Pending" />
      </View>
      <View style={styles.colClasses}>
        <Text size="meta" tone="muted" numberOfLines={1}>
          {`Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
        </Text>
      </View>
      <View style={styles.colActions}>
        <TouchableOpacity
          testID={`copy-invite-link-${invite.inviteToken}`}
          onPress={() => onCopy(invite)}
          activeOpacity={0.7}>
          <Text size="meta" weight="medium" tone="muted">
            {copiedToken === invite.inviteToken ? 'Copied!' : 'Copy link'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={`revoke-invite-${invite.inviteToken}`}
          onPress={() => onRevoke(invite)}
          disabled={isRevoking}
          activeOpacity={0.7}
          style={styles.pendingRevokeBtn}>
          <Text size="meta" weight="medium" tone={Status.danger}>
            Revoke
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Pending Invite Card (Mobile) ─────────────────────────────────────────────
// Follows CoachCard's shape so a pending invite reads as the same list as an
// active coach, rather than a bare table row dropped above rounded cards.

function PendingInviteCard({
  invite,
  onCopy,
  onRevoke,
  copiedToken,
  isRevoking,
}: PendingInviteRowProps) {
  return (
    <View testID={`pending-invite-row-${invite.inviteToken}`} style={styles.pendingCard}>
      <View style={styles.pendingCardTop}>
        <View style={styles.coachAvatar}>
          <Icon name="mail" size={18} tone="faint" />
        </View>
        <View style={styles.pendingCardInfo}>
          <Text size="body" weight="semibold" numberOfLines={1}>{invite.inviteeEmail}</Text>
          <Text size="meta" tone="muted" numberOfLines={1}>
            {`Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
          </Text>
        </View>
        <StatusChip tone="neutral" label="Pending" />
      </View>
      <View style={styles.pendingCardActions}>
        <View style={styles.pendingCardActionBtn}>
          <Button
            testID={`copy-invite-link-${invite.inviteToken}`}
            label={copiedToken === invite.inviteToken ? 'Copied!' : 'Copy link'}
            variant="quiet"
            onPress={() => onCopy(invite)}
          />
        </View>
        <View style={styles.pendingCardActionBtn}>
          <Button
            testID={`revoke-invite-${invite.inviteToken}`}
            label="Revoke"
            variant="danger"
            onPress={() => onRevoke(invite)}
            disabled={isRevoking}
          />
        </View>
      </View>
    </View>
  );
}

// ─── Coach Detail Panel (Desktop) ───────────────────────────────────────────────

interface CoachDetailPanelProps {
  coach: CoachListItem | null;
  onChangeStatus: (coachUserId: string, status: CoachStatus) => Promise<void>;
  isChangingStatus: boolean;
}

function CoachDetailPanel({ coach, onChangeStatus, isChangingStatus }: CoachDetailPanelProps) {
  if (coach === null) {
    return (
      <View style={styles.detailPanel}>
        <Text size="meta" tone="faint">Select a coach to view details</Text>
      </View>
    );
  }

  const displayName = coach.name || coach.email;
  const isActive = coach.status === 'active';

  function handleDisable() {
    if (coach === null) return;
    const userId = coach.userId;
    confirmDeactivate(displayName, () => onChangeStatus(userId, 'inactive'));
  }

  return (
    <View style={styles.detailPanel}>
      <Text size="title" weight="semibold">Coach Details</Text>

      <View style={styles.detailField}>
        <Text size="label" weight="semibold" tone="faint" upper>Name</Text>
        <Text size="body" weight="medium">{displayName}</Text>
      </View>

      <View style={styles.detailField}>
        <Text size="label" weight="semibold" tone="faint" upper>Email</Text>
        <Text size="body" tone="muted">{coach.email}</Text>
      </View>

      <View style={styles.detailField}>
        <Text size="label" weight="semibold" tone="faint" upper>Classes Assigned</Text>
        {coach.classesAssigned.length > 0 ? (
          coach.classesAssigned.map((className) => (
            <Text key={className} size="body">{className}</Text>
          ))
        ) : (
          <Text size="meta" tone="faint">No classes assigned</Text>
        )}
      </View>

      <View style={styles.detailBtnRow}>
        <View style={styles.detailBtnWrap}>
          {isActive ? (
            <ActionButton
              label="Disable"
              onPress={handleDisable}
              variant="deactivate"
              disabled={isChangingStatus}
            />
          ) : (
            <ActionButton
              label="Enable"
              onPress={() => onChangeStatus(coach.userId, 'active')}
              variant="reactivate"
              disabled={isChangingStatus}
            />
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  gymId: string;
  token: string | null | undefined;
}

function InviteModal({ visible, onClose, onSuccess, gymId, token }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<InviteCoachResponse | null>(null);
  const [copyLabel, setCopyLabel] = useState('Copy');

  function handleClose() {
    setEmail('');
    setError(null);
    setIsSubmitting(false);
    setCreated(null);
    setCopyLabel('Copy');
    onClose();
  }

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const client = createApiClient({ token });
      const body: InviteCoachRequest = { coachEmail: trimmedEmail };
      const response = await client.post<InviteCoachResponse>(
        `/api/gyms/${gymId}/configuration/coaches`,
        body as Record<string, unknown>,
      );
      setCreated(response);
      // The invite is created and pending — refetch the list behind the
      // modal, but keep the modal open so the owner can copy the link.
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to invite coach.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopyCreatedLink(invite: InviteCoachResponse) {
    Clipboard.setString(invite.inviteLink);
    setCopyLabel('Copied!');
    setTimeout(() => setCopyLabel('Copy'), 2000);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text size="lead" weight="bold">Invite Coach</Text>
          <Text size="meta" tone="muted" style={styles.modalSubtitle}>
            Enter the email address of the coach you want to invite.
          </Text>

          <View style={styles.fieldGroup}>
            <Text size="label" weight="semibold" tone="faint" upper>Email address</Text>
            <View style={styles.inputWrap}>
              <TextInput
                testID="invite-coach-email-input"
                style={styles.input}
                placeholder="coach@example.com"
                placeholderTextColor={Ink.faint}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting && created === null}
              />
            </View>
          </View>

          {error !== null ? (
            <Text size="meta" tone={Ink.strong} style={styles.inlineError}>{error}</Text>
          ) : null}

          {created !== null ? (
            <View style={styles.linkBox}>
              <Text size="meta" tone="muted">
                Invite created. Send this link to the coach — email delivery is not set up yet.
              </Text>
              <View style={styles.linkRow}>
                <Text testID="coach-invite-link-text" size="meta" numberOfLines={1} style={styles.linkText}>
                  {created.inviteLink}
                </Text>
                <TouchableOpacity onPress={() => handleCopyCreatedLink(created)} activeOpacity={0.7}>
                  <Text size="meta" weight="semibold">{copyLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={styles.modalActions}>
            <View style={styles.modalActionBtn}>
              <Button
                testID="modal-cancel-btn"
                label="Cancel"
                variant="quiet"
                onPress={handleClose}
                disabled={isSubmitting}
              />
            </View>
            <View style={styles.modalActionBtn}>
              <Button
                testID="modal-confirm-btn"
                label={created !== null ? 'Done' : 'Create Link'}
                variant="primary"
                onPress={created !== null ? handleClose : handleSubmit}
                loading={isSubmitting}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Coach Card (Mobile) ─────────────────────────────────────────────────────

interface CoachCardProps {
  coach: CoachListItem;
  onChangeStatus: (coachUserId: string, status: CoachStatus) => Promise<void>;
  isChangingStatus: boolean;
}

function CoachCard({ coach, onChangeStatus, isChangingStatus }: CoachCardProps) {
  const isActive = coach.status === 'active';
  const displayName = coach.name || coach.email;
  const classesLabel = coach.classesAssigned.join(', ');

  function handleDeactivate() {
    confirmDeactivate(displayName, () => onChangeStatus(coach.userId, 'inactive'));
  }

  return (
    <View style={styles.coachCard}>
      <View style={styles.coachCardTop}>
        <View style={styles.coachAvatar}>
          <Text size="body" weight="semibold" tone="muted">
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.coachCardInfo}>
          <Text size="body" weight="semibold" numberOfLines={1}>{displayName}</Text>
          <Text size="meta" tone="muted" numberOfLines={1}>{coach.email}</Text>
        </View>
        <StatusBadge status={coach.status} />
      </View>
      <View style={styles.coachCardClasses}>
        <Text size="label" weight="semibold" tone="faint" upper>Classes Assigned</Text>
        <Text size="body">
          {classesLabel !== '' ? classesLabel : 'No classes assigned'}
        </Text>
      </View>
      <View style={styles.coachCardActions}>
        <View style={styles.coachCardActionBtn}>
          {isActive ? (
            <ActionButton
              label="Deactivate"
              onPress={handleDeactivate}
              variant="deactivate"
              disabled={isChangingStatus}
            />
          ) : (
            <ActionButton
              label="Reactivate"
              onPress={() => onChangeStatus(coach.userId, 'active')}
              variant="reactivate"
              disabled={isChangingStatus}
            />
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CoachesScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentGymId } = useGym();
  const { isMobile } = useResponsiveLayout();

  const [coaches, setCoaches] = useState<CoachListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCoachUserId, setSelectedCoachUserId] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<CoachInvite[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);

  const selectedCoach =
    coaches.find((c) => c.userId === selectedCoachUserId) ?? null;

  const fetchCoaches = useCallback(async () => {
    if (!token || !currentGymId) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = createApiClient({ token });
      const data = await client.get<CoachesListResponse>(
        `/api/gyms/${currentGymId}/configuration/coaches`,
      );
      setCoaches(data.coaches ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load coaches.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [token, currentGymId]);

  const fetchPendingInvites = useCallback(async () => {
    if (!token || !currentGymId) return;
    try {
      const client = createApiClient({ token });
      const invites = await client.get<CoachInvite[]>(
        `/api/gyms/${currentGymId}/invites?role=coach`,
      );
      setPendingInvites(invites.filter((i) => i.status === 'pending'));
    } catch {
      // A failed invite fetch must not blank the coach list — the roster is
      // the screen's primary job and it has its own error state.
      setPendingInvites([]);
    }
  }, [token, currentGymId]);

  useEffect(() => {
    fetchCoaches();
    fetchPendingInvites();
  }, [fetchCoaches, fetchPendingInvites]);

  async function handleChangeStatus(coachUserId: string, status: CoachStatus) {
    if (!token || !currentGymId) return;

    setChangingStatusId(coachUserId);

    try {
      const client = createApiClient({ token });
      await client.patch<ChangeCoachStatusResponse>(
        `/api/gyms/${currentGymId}/configuration/coaches/${coachUserId}`,
        { status } as Record<string, unknown>,
      );
      await fetchCoaches();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update coach status.';
      Alert.alert('Error', msg);
    } finally {
      setChangingStatusId(null);
    }
  }

  function handleInviteSuccess() {
    fetchCoaches();
    fetchPendingInvites();
  }

  function handleCopyInviteLink(invite: CoachInvite) {
    Clipboard.setString(inviteLinkFor(invite.inviteToken));
    setCopiedToken(invite.inviteToken);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  async function handleRevokeInvite(invite: CoachInvite) {
    if (!token || !currentGymId) return;
    setRevokingToken(invite.inviteToken);
    try {
      const client = createApiClient({ token });
      await client.delete(`/api/gyms/${currentGymId}/invites/${invite.inviteToken}`);
      await fetchPendingInvites();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke invite.';
      Alert.alert('Error', msg);
    } finally {
      setRevokingToken(null);
    }
  }

  const handleSidebarNav = (key: string) => {
    setDrawerOpen(false);
    const target = OWNER_NAV_ITEMS.find((item) => item.key === key);
    if (target?.route) router.push(target.route as never);
  };

  return (
    <View style={styles.root}>
      {!isMobile && <OwnerSidebar activeItem="coaches" onNavigate={handleSidebarNav} />}

      {/* Mobile drawer */}
      {isMobile && (
        <OwnerNavDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <OwnerSidebar activeItem="coaches" onNavigate={handleSidebarNav} />
        </OwnerNavDrawer>
      )}

      <SafeScreen style={[styles.main, isMobile && styles.mainMobile]} applyTopInset={isMobile} extraTopPadding={Space.base}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {isMobile && (
              <TouchableOpacity
                testID="hamburger-btn"
                style={styles.hamburgerBtn}
                onPress={() => setDrawerOpen(true)}>
                <Icon name="menu" size={24} tone="strong" />
              </TouchableOpacity>
            )}
            <View style={styles.headerTitleWrap}>
              <Text size="screen" weight="bold">Coaches</Text>
              {!isMobile && (
                <Text size="meta" tone="muted">
                  {'Manage your gym\'s coaching staff'}
                </Text>
              )}
            </View>
          </View>
          {isMobile ? (
            <TouchableOpacity
              testID="invite-coach-btn"
              style={styles.createIconBtn}
              onPress={() => setModalVisible(true)}>
              <Icon name="add" size={24} tone={Accent.on} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              testID="invite-coach-btn"
              style={styles.createBtn}
              onPress={() => setModalVisible(true)}>
              <Icon name="add" size={18} tone={Accent.on} />
              <Text size="body" weight="semibold" tone={Accent.on}>Invite Coach</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Ink.strong} />
          </View>
        ) : error !== null ? (
          <View style={styles.centered}>
            <Text size="body" tone={Ink.strong} style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchCoaches}>
              <Text size="body" weight="medium">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : coaches.length === 0 && pendingInvites.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Icon name="coach" size={28} tone="faint" />
            </View>
            <Text size="title" weight="semibold">No coaches yet</Text>
            <Text size="meta" tone="muted">
              Invite your first coach to get started
            </Text>
            <View style={styles.emptyBtnWrap}>
              <Button label="Invite Coach" variant="primary" onPress={() => setModalVisible(true)} />
            </View>
          </View>
        ) : isMobile ? (
          /* Mobile: card-based layout */
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.coachCardList}>
            {pendingInvites.map((invite) => (
              <PendingInviteCard
                key={invite.inviteToken}
                invite={invite}
                onCopy={handleCopyInviteLink}
                onRevoke={handleRevokeInvite}
                copiedToken={copiedToken}
                isRevoking={revokingToken === invite.inviteToken}
              />
            ))}
            {coaches.map((coach) => (
              <CoachCard
                key={coach.id}
                coach={coach}
                onChangeStatus={handleChangeStatus}
                isChangingStatus={changingStatusId === coach.userId}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.contentRow}>
            <View style={styles.listCard}>
              {/* Table header */}
              <View style={styles.tableHeader}>
                <View style={styles.colName}>
                  <Text size="label" weight="semibold" tone="faint" upper>Name</Text>
                </View>
                <View style={styles.colEmail}>
                  <Text size="label" weight="semibold" tone="faint" upper>Email</Text>
                </View>
                <View style={styles.colStatus}>
                  <Text size="label" weight="semibold" tone="faint" upper>Status</Text>
                </View>
                <View style={styles.colClasses}>
                  <Text size="label" weight="semibold" tone="faint" upper>Classes Assigned</Text>
                </View>
                <Text size="label" weight="semibold" tone="faint" upper style={styles.colActionsHeader}>Actions</Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {pendingInvites.map((invite) => (
                  <PendingInviteRow
                    key={invite.inviteToken}
                    invite={invite}
                    onCopy={handleCopyInviteLink}
                    onRevoke={handleRevokeInvite}
                    copiedToken={copiedToken}
                    isRevoking={revokingToken === invite.inviteToken}
                  />
                ))}
                {coaches.map((coach) => (
                  <CoachRow
                    key={coach.id}
                    coach={coach}
                    isSelected={coach.userId === selectedCoachUserId}
                    onSelect={setSelectedCoachUserId}
                  />
                ))}
              </ScrollView>
            </View>

            <CoachDetailPanel
              coach={selectedCoach}
              onChangeStatus={handleChangeStatus}
              isChangingStatus={
                selectedCoach !== null && changingStatusId === selectedCoach.userId
              }
            />
          </View>
        )}
      </SafeScreen>

      {currentGymId !== null && currentGymId !== undefined ? (
        <InviteModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSuccess={handleInviteSuccess}
          gymId={currentGymId}
          token={token}
        />
      ) : null}
    </View>
  );
}
