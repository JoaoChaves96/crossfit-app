import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Clipboard,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { showError } from '@/utils/alert';
import { components } from '@/types/api.gen';
import { AppColors } from '@/constants/theme';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OwnerSidebar, OWNER_NAV_ITEMS } from '@/components/OwnerSidebar';
import { NotificationBell } from '@/components/NotificationBell';
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
const BADGE_CONFIG: Record<InviteStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: AppColors.warningBg, text: AppColors.warningTextDark, label: 'Pending' },
  accepted: { bg: AppColors.successBg, text: AppColors.successDark, label: 'Accepted' },
  expired: { bg: AppColors.backgroundLight, text: AppColors.textMuted, label: 'Expired' },
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
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
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
          <Text style={[styles.rowEmail, isExpiredStatus && styles.rowEmailExpired]} numberOfLines={1}>
            {invite.inviteeEmail}
          </Text>
          <Text style={styles.rowDate}>
            {isAccepted ? `Joined ${formatDate(invite.createdAt)}` : `Sent ${formatDate(invite.createdAt)}`}
          </Text>
        </View>
        <StatusBadge status={status} />
      </View>
      <View style={styles.rowActions}>
        {isAccepted ? (
          <Text style={styles.noActionsText}>—</Text>
        ) : (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onResend(invite)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionBtnText}>Resend</Text>
            </TouchableOpacity>
            {!isExpiredStatus && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnRevoke]}
                onPress={() => onRevoke(invite)}
                activeOpacity={0.7}
                disabled={isRevoking}
              >
                {isRevoking ? (
                  <ActivityIndicator size="small" color={AppColors.errorDefault} />
                ) : (
                  <Text style={[styles.actionBtnText, styles.revokeText]}>Revoke</Text>
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
            <Text style={styles.modalTitle}>Create Invite</Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalDivider} />

          {/* Body */}
          <View style={styles.modalBody}>
            {/* Email field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email address</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="athlete@example.com"
                placeholderTextColor={AppColors.textDisabled}
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
                <Text style={styles.successLabel}>Invite link generated</Text>
                <View style={styles.linkRow}>
                  <View style={styles.linkTextBox}>
                    <Text style={styles.linkTextContent} numberOfLines={1}>
                      {createdInvite.inviteLink}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.copyBtn} onPress={handleCopyLink} activeOpacity={0.7}>
                    <Text style={styles.copyBtnText}>{copyLabel}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            {createdInvite === null && (
              <TouchableOpacity
                style={[styles.sendBtn, isSending && styles.sendBtnDisabled]}
                onPress={handleSend}
                activeOpacity={0.7}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={AppColors.backgroundWhite} />
                ) : (
                  <Text style={styles.sendBtnText}>Send Invite</Text>
                )}
              </TouchableOpacity>
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
  const insets = useSafeAreaInsets();

  const [invites, setInvites] = useState<LocalInvite[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPrefillEmail, setModalPrefillEmail] = useState('');
  const [revokingToken, setRevokingToken] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
            <Text style={styles.errorText}>Access denied. This screen is for gym owners and coaches only.</Text>
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
            <Text style={styles.errorText}>Please log in and select a gym to manage invites.</Text>
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
        <Text style={[styles.tableHeaderCell, styles.tableHeaderCellEmail]}>Email</Text>
        <Text style={styles.tableHeaderCell}>Date</Text>
        <Text style={styles.tableHeaderCell}>Status</Text>
        <Text style={styles.tableHeaderCell}>Actions</Text>
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
        <Text style={styles.emptyIconGlyph}>{'✉'}</Text>
      </View>
      <Text style={styles.emptyTitle}>No invites sent yet</Text>
      <Text style={styles.emptyDesc}>
        {"Invite athletes to join your gym. They'll receive an email with a link to accept."}
      </Text>
      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => {
          setModalPrefillEmail('');
          setModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.createBtnText}>+ Invite an Athlete</Text>
      </TouchableOpacity>
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
        <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
          <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={() => setDrawerOpen(false)}>
            <View style={styles.drawerContainer}>
              <OwnerSidebar activeItem="invites" onNavigate={handleSidebarNav} />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <View style={[styles.main, isMobile && styles.mainMobile]}>
        {/* Page header */}
        <View style={[styles.pageHeader, isMobile && { paddingTop: insets.top + 16 }]}>
          <View style={styles.pageHeaderLeft}>
            {isMobile && (
              <TouchableOpacity
                testID="hamburger-btn"
                style={styles.hamburgerBtn}
                onPress={() => setDrawerOpen(true)}>
                <Text style={styles.hamburgerText}>☰</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.pageTitle}>Invites</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => {
                setModalPrefillEmail('');
                setModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.createBtnText}>+ Create Invite</Text>
            </TouchableOpacity>
            {isMobile && <NotificationBell />}
          </View>
        </View>

        <View style={styles.headerDivider} />

        {inviteContent}
      </View>
      {modal}
    </View>
  );
}
