import React, { useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Clipboard,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { showError } from '@/utils/alert';
import { components } from '@/types/api.gen';
import { Ink, Accent, Space, Status } from '@/constants/design';
import { Text, Icon, Button, StatusChip } from '@/components/cleanink';
import type { ChipTone } from '@/components/cleanink';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SafeScreen } from '@/components/SafeScreen';
import { OwnerSidebar, OWNER_NAV_ITEMS } from '@/components/OwnerSidebar';
import { OwnerNavDrawer } from '@/components/OwnerNavDrawer';
import { styles } from './invites.styles';

// ─── Types ────────────────────────────────────────────────────────────────────
type InviteResponse = components['schemas']['InviteResponseDto'];
type CreateInviteDto = components['schemas']['CreateInviteDto'];

type InviteStatus = 'pending' | 'accepted' | 'expired';

interface LocalInvite {
  token: string;
  inviteLink: string;
  inviteeEmail: string;
  expiresAt: string;
  createdAt: string;
  status: InviteStatus;
}

// ─── Badge config ─────────────────────────────────────────────────────────────
// Tone maps by MEANING: accepted → open (green), pending → neutral,
// expired/revoked → danger (deeper red). Same-Hue Chip Rule via StatusChip.
const BADGE_CONFIG: Record<InviteStatus, { tone: ChipTone; label: string }> = {
  pending: { tone: 'neutral', label: 'Pending' },
  accepted: { tone: 'open', label: 'Accepted' },
  expired: { tone: 'danger', label: 'Expired' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

function deriveStatus(invite: LocalInvite): InviteStatus {
  if (invite.status === 'accepted') return 'accepted';
  if (isExpired(invite.expiresAt)) return 'expired';
  return 'pending';
}

// ─── Sub-components ───────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: InviteStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = BADGE_CONFIG[status];
  return <StatusChip tone={config.tone} label={config.label} />;
}

interface InviteRowProps {
  invite: LocalInvite;
  onResend: (invite: LocalInvite) => void;
  onRevoke: (invite: LocalInvite) => void;
  isRevoking: boolean;
}

function InviteRow({ invite, onResend, onRevoke, isRevoking }: InviteRowProps) {
  const status = deriveStatus(invite);
  const isAccepted = status === 'accepted';
  const isExpiredStatus = status === 'expired';

  return (
    <View style={[styles.row, isAccepted && styles.rowAccepted, isExpiredStatus && styles.rowExpired]}>
      <View style={styles.rowMain}>
        <View style={styles.rowLeft}>
          <Text
            size="body"
            tone={isExpiredStatus ? 'muted' : 'strong'}
            style={isExpiredStatus ? styles.rowEmailExpired : undefined}
            numberOfLines={1}>
            {invite.inviteeEmail}
          </Text>
          <Text size="meta" tone="muted">
            {isAccepted
              ? `Joined ${formatDate(invite.createdAt)}`
              : `Created ${formatDate(invite.createdAt)}`}
          </Text>
        </View>
        <StatusBadge status={status} />
      </View>
      <View style={styles.rowActions}>
        {isAccepted ? (
          <Text size="body" tone="faint">—</Text>
        ) : (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onResend(invite)}
              activeOpacity={0.7}
            >
              {/* Not "Resend" — nothing was ever sent. This mints a fresh link. */}
              <Text size="meta" weight="medium" tone="muted">New link</Text>
            </TouchableOpacity>
            {!isExpiredStatus && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnRevoke]}
                onPress={() => onRevoke(invite)}
                activeOpacity={0.7}
                disabled={isRevoking}
              >
                {isRevoking ? (
                  <ActivityIndicator size="small" color={Status.danger} />
                ) : (
                  <Text size="meta" weight="medium" tone={Status.danger}>Revoke</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

interface CreateInviteModalProps {
  visible: boolean;
  gymId: string;
  token: string;
  prefillEmail?: string;
  onClose: () => void;
  onSuccess: (invite: LocalInvite) => void;
}

function CreateInviteModal({ visible, gymId, token, prefillEmail = '', onClose, onSuccess }: CreateInviteModalProps) {
  const [email, setEmail] = useState(prefillEmail);
  const [isSending, setIsSending] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<InviteResponse | null>(null);
  const [copyLabel, setCopyLabel] = useState('Copy');

  React.useEffect(() => {
    if (visible) {
      setEmail(prefillEmail);
      setCreatedInvite(null);
      setCopyLabel('Copy');
    }
  }, [visible, prefillEmail]);

  function handleClose() {
    setIsSending(false);
    onClose();
  }

  async function handleSend() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    try {
      setIsSending(true);
      const client = createApiClient({ token });
      const body: CreateInviteDto = { inviteeEmail: trimmedEmail };
      const response = await client.post<InviteResponse>(
        `/api/gyms/${gymId}/invites`,
        body as unknown as Record<string, unknown>,
      );
      setCreatedInvite(response);
      const localInvite: LocalInvite = {
        token: response.inviteToken,
        inviteLink: response.inviteLink,
        inviteeEmail: response.inviteeEmail,
        expiresAt: response.expiresAt,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
      onSuccess(localInvite);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invite';
      showError('Invite Error', message);
    } finally {
      setIsSending(false);
    }
  }

  function handleCopyLink() {
    if (!createdInvite) return;
    Clipboard.setString(createdInvite.inviteLink);
    setCopyLabel('Copied!');
    setTimeout(() => setCopyLabel('Copy'), 2000);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text size="lead" weight="bold">Create Invite</Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={handleClose} activeOpacity={0.7}>
              <Icon name="close" size={18} tone="muted" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalDivider} />

          {/* Body */}
          <View style={styles.modalBody}>
            {/* Email field */}
            <View style={styles.fieldGroup}>
              <Text size="label" weight="semibold" tone="faint" upper>Email address</Text>
              <TextInput
                testID="invite-email-input"
                style={styles.fieldInput}
                placeholder="athlete@example.com"
                placeholderTextColor={Ink.faint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!isSending && !createdInvite}
              />
            </View>

            {/* Success state */}
            {createdInvite !== null && (
              <View style={styles.successBox}>
                {/*
                  Quiet meta text, not a green confirmation: DESIGN.md reserves
                  Open Green for status-chip text on its wash (availability), and
                  there is no success role. It also must not read as "delivered" —
                  nothing was sent, so the owner is the transport.
                */}
                <Text size="meta" weight="semibold" tone="strong">
                  Invite created — not sent
                </Text>
                <Text size="meta" tone="muted">
                  No email goes out. Copy this link and send it to them yourself; it expires in
                  7 days.
                </Text>
                <View style={styles.linkRow}>
                  <View style={styles.linkTextBox}>
                    <Text testID="invite-link-text" size="meta" tone="muted" numberOfLines={1}>
                      {createdInvite.inviteLink}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.copyBtn} onPress={handleCopyLink} activeOpacity={0.7}>
                    <Text size="meta" weight="semibold">{copyLabel}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <View style={styles.modalActionBtn}>
              <Button label="Cancel" variant="quiet" onPress={handleClose} disabled={isSending} />
            </View>
            {createdInvite === null && (
              <View style={styles.modalActionBtn}>
                <Button
                  testID="invite-send-btn"
                  label="Create Link"
                  variant="primary"
                  onPress={handleSend}
                  loading={isSending}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function InvitesScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { currentGymId } = useGym();
  const { isMobile } = useResponsiveLayout();

  const [invites, setInvites] = useState<LocalInvite[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPrefillEmail, setModalPrefillEmail] = useState('');
  const [revokingToken, setRevokingToken] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // `?new=1` opens the create modal straight away, so arriving from Members'
  // "Invite member" lands on the form rather than on a list the owner then has
  // to find a button on. Mount-only by design: closing the modal must not
  // re-open it while the param is still on the URL.
  //
  // Declared before the guards below — those return early, and a hook after
  // them would change hook order between renders.
  const { new: openNew } = useLocalSearchParams<{ new?: string }>();
  React.useEffect(() => {
    if (openNew === '1') setModalVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSidebarNav = (key: string) => {
    setDrawerOpen(false);
    const target = OWNER_NAV_ITEMS.find((item) => item.key === key);
    if (target?.route) router.push(target.route as never);
  };

  // Guard: athletes cannot access this screen
  if (!user || user.role === 'athlete') {
    return (
      <View style={styles.root}>
        {!isMobile && <OwnerSidebar activeItem="invites" onNavigate={handleSidebarNav} />}
        <View style={styles.main}>
          <View style={styles.centeredState}>
            <Text size="body" tone={Status.danger} style={styles.errorText}>
              Access denied. This screen is for gym owners and coaches only.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!token || !currentGymId) {
    return (
      <View style={styles.root}>
        {!isMobile && <OwnerSidebar activeItem="invites" onNavigate={handleSidebarNav} />}
        <View style={styles.main}>
          <View style={styles.centeredState}>
            <Text size="body" tone={Status.danger} style={styles.errorText}>
              Please log in and select a gym to manage invites.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  function handleInviteCreated(invite: LocalInvite) {
    setInvites((prev) => [invite, ...prev]);
  }

  function handleResend(invite: LocalInvite) {
    setModalPrefillEmail(invite.inviteeEmail);
    setModalVisible(true);
  }

  async function handleRevoke(invite: LocalInvite) {
    try {
      setRevokingToken(invite.token);
      const client = createApiClient({ token });
      await client.delete(`/api/gyms/${currentGymId}/invites/${invite.token}`);
      setInvites((prev) =>
        prev.map((i) => (i.token === invite.token ? { ...i, status: 'expired' as InviteStatus } : i)),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke invite';
      showError('Revoke Error', message);
    } finally {
      setRevokingToken(null);
    }
  }

  const hasInvites = invites.length > 0;

  const inviteContent = hasInvites ? (
    <>
      {/* Table header */}
      <View style={styles.tableHeader}>
        <View style={styles.tableHeaderCellEmail}>
          <Text size="label" weight="semibold" tone="faint" upper>Email</Text>
        </View>
        <View style={styles.tableHeaderCell}>
          <Text size="label" weight="semibold" tone="faint" upper>Date</Text>
        </View>
        <View style={styles.tableHeaderCell}>
          <Text size="label" weight="semibold" tone="faint" upper>Status</Text>
        </View>
        <View style={styles.tableHeaderCell}>
          <Text size="label" weight="semibold" tone="faint" upper>Actions</Text>
        </View>
      </View>
      <View style={styles.tableHeaderDivider} />
      <FlatList
        data={invites}
        keyExtractor={(item) => item.token}
        renderItem={({ item, index }) => (
          <View>
            <InviteRow
              invite={item}
              onResend={handleResend}
              onRevoke={handleRevoke}
              isRevoking={revokingToken === item.token}
            />
            {index < invites.length - 1 && <View style={styles.rowDivider} />}
          </View>
        )}
        contentContainerStyle={styles.tableBody}
      />
    </>
  ) : (
    <ScrollView contentContainerStyle={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Icon name="mail" size={28} tone="faint" />
      </View>
      <Text size="title" weight="semibold" style={styles.emptyTitle}>No invites yet</Text>
      <Text size="body" tone="muted" style={styles.emptyDesc}>
        {'Create an invite link for an athlete, then send them the link yourself — by text, WhatsApp, or your own email. Nothing is delivered automatically.'}
      </Text>
      <View style={styles.emptyBtnWrap}>
        <Button
          label="Invite an Athlete"
          variant="primary"
          onPress={() => {
            setModalPrefillEmail('');
            setModalVisible(true);
          }}
        />
      </View>
    </ScrollView>
  );

  const modal = (
    <CreateInviteModal
      visible={modalVisible}
      gymId={currentGymId}
      token={token}
      prefillEmail={modalPrefillEmail}
      onClose={() => {
        setModalVisible(false);
        setModalPrefillEmail('');
      }}
      onSuccess={(invite) => {
        handleInviteCreated(invite);
        setModalVisible(false);
        setModalPrefillEmail('');
      }}
    />
  );

  return (
    <View style={styles.root}>
      {!isMobile && <OwnerSidebar activeItem="invites" onNavigate={handleSidebarNav} />}

      {/* Mobile drawer */}
      {isMobile && (
        <OwnerNavDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <OwnerSidebar activeItem="invites" onNavigate={handleSidebarNav} />
        </OwnerNavDrawer>
      )}

      <View style={[styles.main, isMobile && styles.mainMobile]}>
        {/* Page header */}
        <SafeScreen style={styles.pageHeader} applyTopInset={isMobile} extraTopPadding={Space.base}>
          <View style={styles.pageHeaderLeft}>
            {isMobile && (
              <TouchableOpacity
                testID="hamburger-btn"
                style={styles.hamburgerBtn}
                onPress={() => setDrawerOpen(true)}>
                <Icon name="menu" size={24} tone="strong" />
              </TouchableOpacity>
            )}
            <Text size="screen" weight="bold">Invites</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              testID="create-invite-btn"
              style={styles.createBtn}
              onPress={() => {
                setModalPrefillEmail('');
                setModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Icon name="add" size={18} tone={Accent.on} />
              <Text size="body" weight="semibold" tone={Accent.on}>Create Invite</Text>
            </TouchableOpacity>
          </View>
        </SafeScreen>

        <View style={styles.headerDivider} />

        {inviteContent}
      </View>
      {modal}
    </View>
  );
}
