import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { AppColors } from '@/constants/theme';
import { styles } from './coaches.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

type InviteCoachRequest = components['schemas']['InviteCoachDto'];
type InviteCoachResponse = components['schemas']['InviteCoachResponseDto'];

type CoachListItem = components['schemas']['CoachListItemDto'];
type CoachesListResponse = components['schemas']['GetCoachesResponseDto'];
type ChangeCoachStatusResponse = components['schemas']['ChangeCoachStatusResponseDto'];
type CoachStatus = 'active' | 'inactive';

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
              testID={`nav-${item.key}`}
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

// ─── Action Button ────────────────────────────────────────────────────────────

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant: 'deactivate' | 'reactivate';
  disabled: boolean;
}

function ActionButton({ label, onPress, variant, disabled }: ActionButtonProps) {
  const isDeactivate = variant === 'deactivate';
  return (
    <TouchableOpacity
      style={[
        styles.actionBtn,
        isDeactivate ? styles.actionBtnDeactivate : styles.actionBtnReactivate,
        disabled && styles.actionBtnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}>
      <Text
        style={[
          styles.actionBtnText,
          isDeactivate ? styles.actionBtnTextDeactivate : styles.actionBtnTextReactivate,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Coach Row ────────────────────────────────────────────────────────────────

interface CoachRowProps {
  coach: CoachListItem;
  onChangeStatus: (coachUserId: string, status: CoachStatus) => Promise<void>;
  isChangingStatus: boolean;
}

function CoachRow({ coach, onChangeStatus, isChangingStatus }: CoachRowProps) {
  const isActive = coach.status === 'active';
  const displayName = coach.name || coach.email;

  function handleDeactivate() {
    Alert.alert(
      'Deactivate Coach',
      `Are you sure you want to deactivate ${displayName}? They will no longer be assigned to new classes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => onChangeStatus(coach.userId, 'inactive'),
        },
      ],
    );
  }

  function handleReactivate() {
    onChangeStatus(coach.userId, 'active');
  }

  return (
    <View style={styles.coachRow}>
      <View style={styles.coachAvatar}>
        <Text style={styles.coachAvatarText}>
          {displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.coachInfo}>
        <Text style={styles.coachName}>{displayName}</Text>
        <Text style={styles.coachEmail}>{coach.email}</Text>
      </View>
      <StatusBadge status={coach.status} />
      <View style={styles.colActions}>
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
            onPress={handleReactivate}
            variant="reactivate"
            disabled={isChangingStatus}
          />
        )}
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
      await client.post<InviteCoachResponse>(
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
              testID="invite-coach-email-input"
              style={styles.input}
              placeholder="coach@example.com"
              placeholderTextColor={AppColors.textDisabled}
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
              testID="modal-cancel-btn"
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="modal-confirm-btn"
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={AppColors.backgroundWhite} />
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

// ─── Coach Card (Mobile) ─────────────────────────────────────────────────────

interface CoachCardProps {
  coach: CoachListItem;
  onChangeStatus: (coachUserId: string, status: CoachStatus) => Promise<void>;
  isChangingStatus: boolean;
}

function CoachCard({ coach, onChangeStatus, isChangingStatus }: CoachCardProps) {
  const isActive = coach.status === 'active';
  const displayName = coach.name || coach.email;

  function handleDeactivate() {
    Alert.alert(
      'Deactivate Coach',
      `Are you sure you want to deactivate ${displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => onChangeStatus(coach.userId, 'inactive'),
        },
      ],
    );
  }

  return (
    <View style={styles.coachCard}>
      <View style={styles.coachCardTop}>
        <View style={styles.coachAvatar}>
          <Text style={styles.coachAvatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.coachCardInfo}>
          <Text style={styles.coachName} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.coachEmail} numberOfLines={1}>{coach.email}</Text>
        </View>
        <StatusBadge status={coach.status} />
      </View>
      <View style={styles.coachCardActions}>
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
    setModalVisible(false);
    fetchCoaches();
  }

  const handleSidebarNav = (key: string) => {
    setDrawerOpen(false);
    if (key === 'schedule') router.push('/schedule-dashboard');
  };

  return (
    <View style={styles.root}>
      {!isMobile && (
        <Sidebar
          activeItem="coaches"
          onNavigate={handleSidebarNav}
        />
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
          <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={() => setDrawerOpen(false)}>
            <View style={styles.drawerContainer}>
              <Sidebar activeItem="coaches" onNavigate={handleSidebarNav} />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <View style={[styles.main, isMobile && styles.mainMobile]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {isMobile && (
              <TouchableOpacity
                testID="hamburger-btn"
                style={styles.hamburgerBtn}
                onPress={() => setDrawerOpen(true)}>
                <Text style={styles.hamburgerText}>☰</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>Coaches</Text>
            {!isMobile && (
              <Text style={styles.headerSubtitle}>
                {'Manage your gym\'s coaching staff'}
              </Text>
            )}
          </View>
          <TouchableOpacity
            testID="invite-coach-btn"
            style={[styles.inviteBtn, isMobile && styles.inviteBtnMobile]}
            onPress={() => setModalVisible(true)}>
            <Text style={styles.inviteBtnText}>{isMobile ? '+' : '+ Invite Coach'}</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={AppColors.textHeading} />
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
        ) : isMobile ? (
          /* Mobile: card-based layout */
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.coachCardList}>
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
              <Text style={[styles.tableHeaderCell, styles.colActionsHeader]}>
                Actions
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {coaches.map((coach) => (
                <CoachRow
                  key={coach.id}
                  coach={coach}
                  onChangeStatus={handleChangeStatus}
                  isChangingStatus={changingStatusId === coach.userId}
                />
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
