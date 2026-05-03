import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';

// ─── Types ────────────────────────────────────────────────────────────────────

type InviteCoachRequest = components['schemas']['InviteCoachDto'];
type InviteCoachResponse = components['schemas']['InviteCoachResponseDto'];

type CoachListItem = components['schemas']['CoachListItemDto'];
type CoachesListResponse = components['schemas']['GetCoachesResponseDto'];

// ─── Design Tokens ────────────────────────────────────────────────────────────

const COLOR = {
  white: '#FFFFFF',
  sidebarBg: '#F3F4F6',
  bodyText: '#111827',
  subText: '#6B7280',
  mutedText: '#9CA3AF',
  borderLight: '#E5E7EB',
  borderMid: '#D1D5DB',
  activeNavBg: '#E5E7EB',
  activeNavText: '#111827',
  inactiveNavText: '#6B7280',
  primaryBtnBg: '#111827',
  primaryBtnText: '#FFFFFF',
  activeBadgeBg: '#D1FAE5',
  activeBadgeText: '#065F46',
  inactiveBadgeBg: '#F3F4F6',
  inactiveBadgeText: '#6B7280',
  errorText: '#DC2626',
  inputBorder: '#D1D5DB',
  inputBorderFocused: '#111827',
  overlayBg: 'rgba(0,0,0,0.4)',
  modalBg: '#FFFFFF',
  cancelBtnBorder: '#D1D5DB',
  cancelBtnText: '#374151',
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS: { label: string; key: string; enabled: boolean }[] = [
  { label: 'Dashboard', key: 'dashboard', enabled: false },
  { label: 'Schedule', key: 'schedule', enabled: true },
  { label: 'Classes', key: 'classes', enabled: false },
  { label: 'Athletes', key: 'athletes', enabled: false },
  { label: 'Coaches', key: 'coaches', enabled: true },
  { label: 'Settings', key: 'settings', enabled: false },
];

interface SidebarProps {
  activeItem: string;
  onNavigate: (key: string) => void;
}

function Sidebar({ activeItem, onNavigate }: SidebarProps) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarLogo}>
        <View style={styles.sidebarLogoIcon} />
        <Text style={styles.sidebarLogoText}>CrossFit Box</Text>
      </View>
      <View style={styles.navGroup}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activeItem;
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
                  isDisabled && styles.navIconDisabled,
                ]}
              />
              <Text
                style={[
                  styles.navLabel,
                  isActive ? styles.navLabelActive : styles.navLabelInactive,
                  isDisabled && styles.navLabelDisabled,
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

// ─── Status Badge ─────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: 'active' | 'inactive';
}

function StatusBadge({ status }: StatusBadgeProps) {
  const isActive = status === 'active';
  return (
    <View
      style={[
        styles.badge,
        isActive ? styles.badgeActive : styles.badgeInactive,
      ]}>
      <Text
        style={[
          styles.badgeText,
          isActive ? styles.badgeTextActive : styles.badgeTextInactive,
        ]}>
        {isActive ? 'Active' : 'Inactive'}
      </Text>
    </View>
  );
}

// ─── Coach Row ────────────────────────────────────────────────────────────────

interface CoachRowProps {
  coach: CoachListItem;
}

function CoachRow({ coach }: CoachRowProps) {
  return (
    <View style={styles.coachRow}>
      <View style={styles.coachAvatar}>
        <Text style={styles.coachAvatarText}>
          {coach.email.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.coachInfo}>
        <Text style={styles.coachEmail}>{coach.email}</Text>
        <Text style={styles.coachRole}>{coach.role}</Text>
      </View>
      <StatusBadge status={coach.status} />
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

  function handleClose() {
    setEmail('');
    setError(null);
    setIsSubmitting(false);
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
      const result = await client.post<InviteCoachResponse>(
        `/api/gyms/${gymId}/configuration/coaches`,
        body as Record<string, unknown>,
      );
      setEmail('');
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to invite coach.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Invite Coach</Text>
          <Text style={styles.modalSubtitle}>
            Enter the email address of the coach you want to invite.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="coach@example.com"
              placeholderTextColor={COLOR.mutedText}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
          </View>

          {error !== null ? (
            <Text style={styles.inlineError}>{error}</Text>
          ) : null}

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={COLOR.white} />
              ) : (
                <Text style={styles.submitBtnText}>Send Invite</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CoachesScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentGymId } = useGym();

  const [coaches, setCoaches] = useState<CoachListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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

  useEffect(() => {
    fetchCoaches();
  }, [fetchCoaches]);

  function handleInviteSuccess() {
    setModalVisible(false);
    fetchCoaches();
  }

  return (
    <View style={styles.root}>
      <Sidebar
        activeItem="coaches"
        onNavigate={(key) => {
          if (key === 'schedule') router.push('/schedule-dashboard');
        }}
      />

      <View style={styles.main}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Coaches</Text>
            <Text style={styles.headerSubtitle}>
              {'Manage your gym\'s coaching staff'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={() => setModalVisible(true)}>
            <Text style={styles.inviteBtnText}>+ Invite Coach</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLOR.bodyText} />
          </View>
        ) : error !== null ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchCoaches}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : coaches.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No coaches yet</Text>
            <Text style={styles.emptySubtitle}>
              Invite your first coach to get started
            </Text>
            <TouchableOpacity
              style={styles.inviteBtn}
              onPress={() => setModalVisible(true)}>
              <Text style={styles.inviteBtnText}>Invite Coach</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listCard}>
            {/* Table header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colEmail]}>
                Coach
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colRole]}>Role</Text>
              <Text style={[styles.tableHeaderCell, styles.colStatus]}>
                Status
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {coaches.map((coach) => (
                <CoachRow key={coach.id} coach={coach} />
              ))}
            </ScrollView>
          </View>
        )}
      </View>

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
  navIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  navIconActive: {
    backgroundColor: '#374151',
  },
  navIconInactive: {
    backgroundColor: '#9CA3AF',
  },
  navLabel: {
    fontSize: 14,
  },
  navLabelActive: {
    fontWeight: '500',
    color: COLOR.activeNavText,
  },
  navLabelInactive: {
    fontWeight: '400',
    color: COLOR.inactiveNavText,
  },
  navItemDisabled: {
    opacity: 0.4,
  },
  navIconDisabled: {
    backgroundColor: '#9CA3AF',
  },
  navLabelDisabled: {
    color: COLOR.mutedText,
  },

  // Main
  main: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLOR.bodyText,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLOR.subText,
  },
  inviteBtn: {
    backgroundColor: COLOR.primaryBtnBg,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  inviteBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLOR.primaryBtnText,
  },

  // Loading / error
  centered: {
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

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLOR.bodyText,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLOR.subText,
    marginBottom: 4,
  },

  // List card
  listCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLOR.borderLight,
    borderRadius: 10,
    overflow: 'hidden',
  },

  // Table header
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLOR.sidebarBg,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.borderLight,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.subText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colEmail: {
    flex: 1,
  },
  colRole: {
    width: 100,
  },
  colStatus: {
    width: 90,
    textAlign: 'right',
  },

  // Coach row
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.borderLight,
    gap: 12,
  },
  coachAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLOR.activeNavBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.bodyText,
  },
  coachInfo: {
    flex: 1,
    gap: 2,
  },
  coachEmail: {
    fontSize: 14,
    fontWeight: '500',
    color: COLOR.bodyText,
  },
  coachRole: {
    fontSize: 12,
    color: COLOR.subText,
    textTransform: 'capitalize',
  },

  // Badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: COLOR.activeBadgeBg,
  },
  badgeInactive: {
    backgroundColor: COLOR.inactiveBadgeBg,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  badgeTextActive: {
    color: COLOR.activeBadgeText,
  },
  badgeTextInactive: {
    color: COLOR.inactiveBadgeText,
  },

  // Modal overlay
  overlay: {
    flex: 1,
    backgroundColor: COLOR.overlayBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: 440,
    backgroundColor: COLOR.modalBg,
    borderRadius: 12,
    padding: 28,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.bodyText,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLOR.subText,
    marginTop: -8,
  },

  // Form field
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLOR.bodyText,
  },
  input: {
    borderWidth: 1,
    borderColor: COLOR.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLOR.bodyText,
  },

  // Inline error
  inlineError: {
    fontSize: 13,
    color: COLOR.errorText,
    marginTop: -4,
  },

  // Modal actions
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR.cancelBtnBorder,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLOR.cancelBtnText,
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLOR.primaryBtnBg,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLOR.primaryBtnText,
  },
});
