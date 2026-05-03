import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Clipboard,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { showError } from '@/utils/alert';
import { components } from '@/types/api.gen';

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  bg: '#FFFFFF',
  fontPrimary: '#111827',
  fontSecondary: '#6B7280',
  fontTertiary: '#9CA3AF',
  fontMuted: '#374151',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  white: '#FFFFFF',
  btnPrimary: '#222222',
  btnPrimaryText: '#FFFFFF',
  // Status badge — pending
  pendingBg: '#FEF3C7',
  pendingText: '#92400E',
  // Status badge — accepted
  acceptedBg: '#D1FAE5',
  acceptedText: '#065F46',
  // Status badge — expired
  expiredBg: '#F3F4F6',
  expiredText: '#6B7280',
  // Actions
  revokeText: '#DC2626',
  revokeBorder: '#FECACA',
  resendBorder: '#E5E7EB',
  resendText: '#374151',
  // Modal
  modalDivider: '#E5E7EB',
  inputBorder: '#D1D5DB',
  successBg: '#F0FDF4',
  successBorder: '#BBF7D0',
  successText: '#15803D',
  // Empty state
  emptyIconBg: '#F0F0F0',
  danger: '#DC2626',
} as const;

const FONT = { family: 'Inter' as const };

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
  pending: { bg: COLORS.pendingBg, text: COLORS.pendingText, label: 'Pending' },
  accepted: { bg: COLORS.acceptedBg, text: COLORS.acceptedText, label: 'Accepted' },
  expired: { bg: COLORS.expiredBg, text: COLORS.expiredText, label: 'Expired' },
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
                  <ActivityIndicator size="small" color={COLORS.revokeText} />
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
                placeholderTextColor={COLORS.fontTertiary}
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
                  <ActivityIndicator size="small" color={COLORS.btnPrimaryText} />
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
  const { user, token } = useAuth();
  const { currentGymId } = useGym();

  const [invites, setInvites] = useState<LocalInvite[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPrefillEmail, setModalPrefillEmail] = useState('');
  const [revokingToken, setRevokingToken] = useState<string | null>(null);

  // Guard: athletes cannot access this screen
  if (!user || user.role === 'athlete') {
    return (
      <View style={styles.screen}>
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>Access denied. This screen is for gym owners and coaches only.</Text>
        </View>
      </View>
    );
  }

  if (!token || !currentGymId) {
    return (
      <View style={styles.screen}>
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>Please log in and select a gym to manage invites.</Text>
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

  return (
    <View style={styles.screen}>
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Invites</Text>
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
      </View>

      <View style={styles.headerDivider} />

      {/* Content */}
      {hasInvites ? (
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
            <Text style={styles.emptyIconGlyph}>✉</Text>
          </View>
          <Text style={styles.emptyTitle}>No invites sent yet</Text>
          <Text style={styles.emptyDesc}>
            Invite athletes to join your gym. They'll receive an email with a link to accept.
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
      )}

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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Page header
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 16,
  },
  pageTitle: {
    fontFamily: FONT.family,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.fontPrimary,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.btnPrimary,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  createBtnText: {
    fontFamily: FONT.family,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.btnPrimaryText,
  },
  headerDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 0,
  },

  // Table header
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  tableHeaderCell: {
    flex: 1,
    fontFamily: FONT.family,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.fontSecondary,
  },
  tableHeaderCellEmail: {
    flex: 2,
  },
  tableHeaderDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  tableBody: {
    flexGrow: 1,
  },

  // Row
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.bg,
    gap: 8,
  },
  rowAccepted: {
    opacity: 0.6,
  },
  rowExpired: {
    opacity: 0.5,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowEmail: {
    fontFamily: FONT.family,
    fontSize: 14,
    color: COLORS.fontPrimary,
  },
  rowEmailExpired: {
    fontStyle: 'italic',
    color: COLORS.fontSecondary,
  },
  rowDate: {
    fontFamily: FONT.family,
    fontSize: 13,
    color: COLORS.fontSecondary,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  noActionsText: {
    fontFamily: FONT.family,
    fontSize: 14,
    color: COLORS.fontTertiary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 0,
  },

  // Action buttons (row level)
  actionBtn: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.resendBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnRevoke: {
    borderColor: COLORS.revokeBorder,
  },
  actionBtnText: {
    fontFamily: FONT.family,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.resendText,
  },
  revokeText: {
    color: COLORS.revokeText,
  },

  // Badge
  badge: {
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: FONT.family,
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
    gap: 16,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.emptyIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconGlyph: {
    fontSize: 28,
    color: COLORS.fontTertiary,
  },
  emptyTitle: {
    fontFamily: FONT.family,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.fontMuted,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: FONT.family,
    fontSize: 14,
    color: COLORS.fontTertiary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 400,
  },

  // Centered state
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontFamily: FONT.family,
    fontSize: 16,
    color: COLORS.danger,
    textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    fontFamily: FONT.family,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.fontPrimary,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    fontFamily: FONT.family,
    fontSize: 14,
    color: COLORS.fontSecondary,
  },
  modalDivider: {
    height: 1,
    backgroundColor: COLORS.modalDivider,
  },
  modalBody: {
    padding: 24,
    gap: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  // Form fields
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: FONT.family,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.fontMuted,
  },
  fieldInput: {
    height: 42,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 12,
    fontFamily: FONT.family,
    fontSize: 14,
    color: COLORS.fontPrimary,
    backgroundColor: COLORS.white,
  },

  // Success state
  successBox: {
    borderRadius: 8,
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
    padding: 14,
    gap: 8,
  },
  successLabel: {
    fontFamily: FONT.family,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.successText,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkTextBox: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 10,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
  },
  linkTextContent: {
    fontFamily: FONT.family,
    fontSize: 12,
    color: COLORS.fontSecondary,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.btnPrimary,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  copyBtnText: {
    fontFamily: FONT.family,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.btnPrimaryText,
  },

  // Modal buttons
  cancelBtn: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: FONT.family,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.fontMuted,
  },
  sendBtn: {
    borderRadius: 6,
    backgroundColor: COLORS.btnPrimary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    fontFamily: FONT.family,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.btnPrimaryText,
  },
});
