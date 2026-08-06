import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { createApiClient } from '@/utils/api-client';
import type { components } from '@/types/api.gen';
import { AppColors } from '@/constants/theme';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useSafeAreaTop } from '@/components/SafeScreen';
import { DesktopTopNav } from '@/components/DesktopTopNav';
import { NotificationBell } from '@/components/NotificationBell';
import { styles, desktopStyles } from './profile.styles';

type UserProfileDto = components['schemas']['UserProfileDto'];
type UpdateUserProfileDto = components['schemas']['UpdateUserProfileDto'];

interface NotificationPreferences {
  booking_confirmations: boolean;
  waitlist_updates: boolean;
  class_changes: boolean;
  class_reminders: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatMemberSince(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const NOTIFICATION_ITEMS: { key: keyof NotificationPreferences; label: string; subtitle: string }[] = [
  { key: 'booking_confirmations', label: 'Booking Confirmations', subtitle: 'When you book or cancel a class' },
  { key: 'waitlist_updates', label: 'Waitlist Updates', subtitle: "When you're promoted from the waitlist" },
  { key: 'class_changes', label: 'Class Changes', subtitle: 'When a class you booked is modified' },
  { key: 'class_reminders', label: 'Class Reminders', subtitle: '30 minutes before your class starts' },
];

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; profile: UserProfileDto };

export default function ProfileScreen() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const { isDesktop } = useResponsiveLayout();
  const safeTop = useSafeAreaTop();
  const [screenState, setScreenState] = useState<ScreenState>({ status: 'loading' });
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    booking_confirmations: true,
    waitlist_updates: true,
    class_changes: true,
    class_reminders: true,
  });

  const fetchProfile = useCallback(async () => {
    setScreenState({ status: 'loading' });
    try {
      const client = createApiClient({ token });
      const profile = await client.get<UserProfileDto>('/api/me');
      setScreenState({ status: 'success', profile });
      setEditedName(profile.name);
      if (profile.notificationPreferences) {
        setNotificationPrefs(profile.notificationPreferences as unknown as NotificationPreferences);
      }
    } catch {
      setScreenState({ status: 'error', message: 'Failed to load profile. Please try again.' });
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    const previous = notificationPrefs;
    setNotificationPrefs((prev) => ({ ...prev, [key]: value }));
    try {
      const client = createApiClient({ token });
      await client.patch('/api/me', { notificationPreferences: { [key]: value } } as unknown as Record<string, unknown>);
    } catch {
      setNotificationPrefs(previous);
    }
  };

  const handleEditPress = () => {
    setIsEditing(true);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (screenState.status !== 'success') return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const client = createApiClient({ token });
      const body: UpdateUserProfileDto = { name: editedName.trim() };
      const updated = await client.patch<UserProfileDto>('/api/me', body as unknown as Record<string, unknown>);
      setScreenState({ status: 'success', profile: updated });
      setEditedName(updated.name);
      setIsEditing(false);
    } catch {
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login' as never);
  };

  if (screenState.status === 'loading') {
    return (
      <View style={isDesktop ? desktopStyles.screen : styles.centered}>
        {isDesktop && <DesktopTopNav />}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={AppColors.textDark3} />
        </View>
      </View>
    );
  }

  if (screenState.status === 'error') {
    return (
      <View style={isDesktop ? desktopStyles.screen : styles.centered}>
        {isDesktop && <DesktopTopNav />}
        <View style={styles.centered}>
          <Text style={styles.errorText}>{screenState.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
            <Text style={styles.retryButtonLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { profile } = screenState;
  const initials = getInitials(profile.name);

  // ── Desktop layout ──────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={desktopStyles.screen}>
        <DesktopTopNav />
        <ScrollView contentContainerStyle={desktopStyles.contentArea}>
          <View style={desktopStyles.innerWrap}>
            {/* Avatar section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarBg}>
                <Text style={styles.initialsText}>{initials}</Text>
              </View>
              <View style={styles.nameRow}>
                <Text style={styles.nameText}>{isEditing ? editedName : profile.name}</Text>
                {!isEditing && (
                  <TouchableOpacity onPress={handleEditPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.editIconText}>{'✏'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.emailText}>{profile.email}</Text>
              <View style={styles.memberSinceRow}>
                <Text style={styles.memberSince}>
                  Member since {formatMemberSince(profile.createdAt)}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.dividerWrap}>
              <View style={styles.divider} />
            </View>

            {/* Info card */}
            <View style={styles.infoCard}>
              <View style={styles.nameFieldRow}>
                <Text style={styles.fieldLabel}>NAME</Text>
                <View style={[styles.fieldInputWrap, isEditing && styles.fieldInputWrapActive]}>
                  {isEditing ? (
                    <TextInput
                      style={styles.fieldInputText}
                      value={editedName}
                      onChangeText={setEditedName}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleSave}
                    />
                  ) : (
                    <Text style={styles.fieldInputText}>{profile.name}</Text>
                  )}
                </View>
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.emailFieldRow}>
                <Text style={styles.fieldLabel}>EMAIL</Text>
                <View style={styles.emailValueRow}>
                  <Text style={styles.fieldInputText}>{profile.email}</Text>
                </View>
              </View>
            </View>

            {/* Notification Preferences */}
            <View style={styles.notificationSection}>
              <Text style={styles.fieldLabel}>NOTIFICATIONS</Text>
              <Text style={styles.notificationDescription}>Choose which notifications you'd like to receive.</Text>
              <View style={styles.notificationCard}>
                {NOTIFICATION_ITEMS.map((item, index) => (
                  <React.Fragment key={item.key}>
                    {index > 0 && <View style={styles.notificationDivider} />}
                    <View style={styles.notificationRow}>
                      <View style={styles.notificationTextWrap}>
                        <Text style={styles.notificationLabel}>{item.label}</Text>
                        <Text style={styles.notificationSubtitle}>{item.subtitle}</Text>
                      </View>
                      <Switch
                        testID={`notification-toggle-${item.key}`}
                        value={notificationPrefs[item.key]}
                        onValueChange={(val) => handleToggle(item.key, val)}
                      />
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </View>

            {/* Save button */}
            {isEditing && (
              <View style={styles.saveButtonWrap}>
                <TouchableOpacity
                  testID="profile-save-btn"
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={isSaving || editedName.trim().length === 0}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={AppColors.backgroundWhite} />
                  ) : (
                    <Text style={styles.saveButtonLabel}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {saveError !== null && (
              <Text style={styles.saveErrorText}>{saveError}</Text>
            )}

            <View style={styles.noteRow}>
              <Text style={styles.noteText}>Email cannot be changed</Text>
            </View>

            {/* Log out */}
            <View style={styles.logoutButtonWrap}>
              <TouchableOpacity
                testID="profile-logout-btn"
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Ionicons size={18} name="log-out-outline" color={AppColors.errorMaterial} />
                <Text style={styles.logoutButtonLabel}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentWrap}>
      {/* Status bar / notch spacer — real top inset on device, 0 on web */}
      <View style={{ height: safeTop }} />

      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.pageHeaderBell}>
          <NotificationBell />
        </View>
      </View>

      {/* Avatar section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarBg}>
          <Text style={styles.initialsText}>{initials}</Text>
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.nameText}>{isEditing ? editedName : profile.name}</Text>
          {!isEditing && (
            <TouchableOpacity onPress={handleEditPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.editIconText}>✏</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.emailText}>{profile.email}</Text>

        <View style={styles.memberSinceRow}>
          <Text style={styles.memberSince}>
            Member since {formatMemberSince(profile.createdAt)}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.dividerWrap}>
        <View style={styles.divider} />
      </View>

      {/* Info card */}
      <View style={styles.infoCard}>
        {/* Name field */}
        <View style={styles.nameFieldRow}>
          <Text style={styles.fieldLabel}>NAME</Text>
          <View style={[styles.fieldInputWrap, isEditing && styles.fieldInputWrapActive]}>
            {isEditing ? (
              <TextInput
                style={styles.fieldInputText}
                value={editedName}
                onChangeText={setEditedName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            ) : (
              <Text style={styles.fieldInputText}>{profile.name}</Text>
            )}
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Email field */}
        <View style={styles.emailFieldRow}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <View style={styles.emailValueRow}>
            <Text style={styles.fieldInputText}>{profile.email}</Text>
          </View>
        </View>
      </View>

      {/* Notification Preferences */}
      <View style={styles.notificationSection}>
        <Text style={styles.fieldLabel}>NOTIFICATIONS</Text>
        <Text style={styles.notificationDescription}>Choose which notifications you'd like to receive.</Text>
        <View style={styles.notificationCard}>
          {NOTIFICATION_ITEMS.map((item, index) => (
            <React.Fragment key={item.key}>
              {index > 0 && <View style={styles.notificationDivider} />}
              <View style={styles.notificationRow}>
                <View style={styles.notificationTextWrap}>
                  <Text style={styles.notificationLabel}>{item.label}</Text>
                  <Text style={styles.notificationSubtitle}>{item.subtitle}</Text>
                </View>
                <Switch
                  testID={`notification-toggle-${item.key}`}
                  value={notificationPrefs[item.key]}
                  onValueChange={(val) => handleToggle(item.key, val)}
                />
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Save button */}
      {isEditing && (
        <View style={styles.saveButtonWrap}>
          <TouchableOpacity
            testID="profile-save-btn"
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isSaving || editedName.trim().length === 0}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={AppColors.backgroundWhite} />
            ) : (
              <Text style={styles.saveButtonLabel}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Save error */}
      {saveError !== null && (
        <Text style={styles.saveErrorText}>{saveError}</Text>
      )}

      {/* Email cannot be changed note */}
      <View style={styles.noteRow}>
        <Text style={styles.noteText}>Email cannot be changed</Text>
      </View>

      {/* Log out */}
      <View style={styles.logoutButtonWrap}>
        <TouchableOpacity
          testID="profile-logout-btn"
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons size={18} name="log-out-outline" color={AppColors.errorMaterial} />
          <Text style={styles.logoutButtonLabel}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

