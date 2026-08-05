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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { AppColors } from '@/constants/theme';
import { OwnerSidebar, OWNER_NAV_ITEMS } from '@/components/OwnerSidebar';
import { styles } from './coaches.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

type InviteCoachRequest = components['schemas']['InviteCoachDto'];
type InviteCoachResponse = components['schemas']['InviteCoachResponseDto'];

type CoachListItem = components['schemas']['CoachListItemDto'];
type CoachesListResponse = components['schemas']['GetCoachesResponseDto'];
type ChangeCoachStatusResponse = components['schemas']['ChangeCoachStatusResponseDto'];
type CoachStatus = 'active' | 'inactive';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
          <Text style={styles.coachAvatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.coachName} numberOfLines={1}>{displayName}</Text>
      </View>
      <View style={styles.colEmail}>
        <Text style={styles.coachEmail} numberOfLines={1}>{coach.email}</Text>
      </View>
      <View style={styles.colStatus}>
        <StatusBadge status={coach.status} />
      </View>
      <View style={styles.colClasses}>
        {classesLabel !== null ? (
          <Text style={styles.coachClasses} numberOfLines={1}>{classesLabel}</Text>
        ) : (
          <Text style={styles.coachClassesEmpty}>—</Text>
        )}
      </View>
      <View style={styles.colActions}>
        <TouchableOpacity
          testID={`coach-view-${coach.userId}`}
          style={styles.viewBtn}
          onPress={() => onSelect(coach.userId)}
          activeOpacity={0.7}>
          <Text style={styles.viewBtnText}>View</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
        <Text style={styles.detailEmpty}>Select a coach to view details</Text>
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
      <Text style={styles.detailTitle}>Coach Details</Text>

      <View style={styles.detailField}>
        <Text style={styles.detailLabel}>Name</Text>
        <Text style={styles.detailValue}>{displayName}</Text>
      </View>

      <View style={styles.detailField}>
        <Text style={styles.detailLabel}>Email</Text>
        <Text style={styles.detailValueMuted}>{coach.email}</Text>
      </View>

      <View style={styles.detailField}>
        <Text style={styles.detailLabel}>Classes Assigned</Text>
        {coach.classesAssigned.length > 0 ? (
          coach.classesAssigned.map((className) => (
            <Text key={className} style={styles.detailClassItem}>{className}</Text>
          ))
        ) : (
          <Text style={styles.detailClassEmpty}>No classes assigned</Text>
        )}
      </View>

      <View style={styles.detailBtnRow}>
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
  const classesLabel = coach.classesAssigned.join(', ');

  function handleDeactivate() {
    confirmDeactivate(displayName, () => onChangeStatus(coach.userId, 'inactive'));
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
      <View style={styles.coachCardClasses}>
        <Text style={styles.coachCardClassesLabel}>Classes Assigned</Text>
        <Text style={styles.coachCardClassesValue}>
          {classesLabel !== '' ? classesLabel : 'No classes assigned'}
        </Text>
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
  const insets = useSafeAreaInsets();

  const [coaches, setCoaches] = useState<CoachListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCoachUserId, setSelectedCoachUserId] = useState<string | null>(null);

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
    const target = OWNER_NAV_ITEMS.find((item) => item.key === key);
    if (target?.route) router.push(target.route as never);
  };

  return (
    <View style={styles.root}>
      {!isMobile && <OwnerSidebar activeItem="coaches" onNavigate={handleSidebarNav} />}

      {/* Mobile drawer */}
      {isMobile && (
        <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
          <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={() => setDrawerOpen(false)}>
            <View style={styles.drawerContainer}>
              <OwnerSidebar activeItem="coaches" onNavigate={handleSidebarNav} />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <View style={[styles.main, isMobile && styles.mainMobile, isMobile && { paddingTop: insets.top + 16 }]}>
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
          <View style={styles.contentRow}>
            <View style={styles.listCard}>
              {/* Table header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colName]}>Name</Text>
                <Text style={[styles.tableHeaderCell, styles.colEmail]}>Email</Text>
                <Text style={[styles.tableHeaderCell, styles.colStatus]}>
                  Status
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colClasses]}>
                  Classes Assigned
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
