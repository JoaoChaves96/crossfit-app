/*
 * ─── Clean Ink · Athlete Profile (restyle) ───────────────────────────────────
 * Sibling of the schedule / my-bookings pilots: white-surface hairline header,
 * hairline cards with a whisper of elevation, drawn Ionicons behind semantic
 * names (no emoji), one crimson primary action (Save Changes) and a distinct
 * deeper-red danger action (Log Out). Data, handlers, copy, testIDs and logout
 * logic are preserved exactly — only the visual world changes.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { createApiClient } from '@/utils/api-client';
import type { components } from '@/types/api.gen';
import { Accent, Ground, Ink, Line, Space, Status } from '@/constants/design';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useSafeAreaTop } from '@/components/SafeScreen';
import { DesktopTopNav } from '@/components/DesktopTopNav';
import { NotificationBell } from '@/components/NotificationBell';
import { Text, Icon, Button } from '@/components/cleanink';
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

// ─── Log Out (danger — distinct deeper red, never the accent) ─────────────────
// The Button primitive is label-only; this action pairs a drawn logout glyph
// with its label, so it composes the danger visual from tokens directly.
function LogoutButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      testID="profile-logout-btn"
      style={styles.logoutButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icon name="logout" size={18} tone={Status.danger} />
      <Text size="body" weight="semibold" tone={Status.danger}>Log Out</Text>
    </TouchableOpacity>
  );
}

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
      <View style={isDesktop ? desktopStyles.screen : styles.screen}>
        {isDesktop && <DesktopTopNav />}
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={Accent.base} />
        </View>
      </View>
    );
  }

  if (screenState.status === 'error') {
    return (
      <View style={isDesktop ? desktopStyles.screen : styles.screen}>
        {isDesktop && <DesktopTopNav />}
        <View style={styles.centeredState}>
          <Text size="body" tone={Status.danger} style={{ textAlign: 'center' }}>
            {screenState.message}
          </Text>
          <View style={styles.retryButton}>
            <Button variant="quiet" label="Retry" onPress={fetchProfile} />
          </View>
        </View>
      </View>
    );
  }

  const { profile } = screenState;
  const initials = getInitials(profile.name);

  // ── Shared content (avatar / info card / notifications / actions) ──────────
  const content = (
    <>
      {/* Avatar section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarBg}>
          <Text size="display" weight="bold" tone={Ink.muted}>{initials}</Text>
        </View>
        <View style={styles.nameRow}>
          <Text size="lead" weight="bold" tracking="tight">
            {isEditing ? editedName : profile.name}
          </Text>
          {!isEditing && (
            <TouchableOpacity onPress={handleEditPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="edit" size={16} tone={Ink.faint} />
            </TouchableOpacity>
          )}
        </View>
        <Text size="body" tone={Ink.muted}>{profile.email}</Text>
        <View style={styles.memberSinceRow}>
          <Text size="meta" tone={Ink.faint}>
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
        <View style={styles.fieldRow}>
          <Text size="label" weight="semibold" tone={Ink.faint} upper>NAME</Text>
          <View style={[styles.fieldInputWrap, isEditing && styles.fieldInputWrapActive]}>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={editedName}
                onChangeText={setEditedName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            ) : (
              <Text size="body">{profile.name}</Text>
            )}
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.fieldRow}>
          <Text size="label" weight="semibold" tone={Ink.faint} upper>EMAIL</Text>
          <View style={styles.emailValueRow}>
            <Text size="body">{profile.email}</Text>
          </View>
        </View>
      </View>

      {/* Notification Preferences */}
      <View style={styles.notificationSection}>
        <Text size="label" weight="semibold" tone={Ink.faint} upper>NOTIFICATIONS</Text>
        <Text size="body" tone={Ink.muted} style={styles.notificationDescription}>
          Choose which notifications you'd like to receive.
        </Text>
        <View style={styles.notificationCard}>
          {NOTIFICATION_ITEMS.map((item, index) => (
            <React.Fragment key={item.key}>
              {index > 0 && <View style={styles.notificationDivider} />}
              <View style={styles.notificationRow}>
                <View style={styles.notificationTextWrap}>
                  <Text size="body" weight="semibold">{item.label}</Text>
                  <Text size="meta" tone={Ink.faint} style={styles.notificationSubtitle}>
                    {item.subtitle}
                  </Text>
                </View>
                <Switch
                  testID={`notification-toggle-${item.key}`}
                  value={notificationPrefs[item.key]}
                  onValueChange={(val) => handleToggle(item.key, val)}
                  trackColor={{ false: Line.divider, true: Accent.base }}
                  thumbColor={Ground.surface}
                  ios_backgroundColor={Line.divider}
                  // activeThumbColor is a react-native-web-only prop (absent from
                  // core RN Switch types) — keep the thumb white in the on-state
                  // instead of the web default green.
                  {...{ activeThumbColor: Ground.surface }}
                />
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Save button */}
      {isEditing && (
        <View style={styles.saveButtonWrap}>
          <Button
            testID="profile-save-btn"
            variant="primary"
            label="Save Changes"
            loading={isSaving}
            disabled={editedName.trim().length === 0}
            onPress={handleSave}
          />
        </View>
      )}

      {/* Save error */}
      {saveError !== null && (
        <Text size="meta" tone={Status.danger} style={styles.saveError}>{saveError}</Text>
      )}

      {/* Email cannot be changed note */}
      <View style={styles.noteRow}>
        <Text size="meta" tone={Ink.faint}>Email cannot be changed</Text>
      </View>

      {/* Log out */}
      <View style={styles.logoutButtonWrap}>
        <LogoutButton onPress={handleLogout} />
      </View>
    </>
  );

  // ── Desktop layout ──────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={desktopStyles.screen}>
        <DesktopTopNav />
        <ScrollView contentContainerStyle={desktopStyles.contentArea}>
          <View style={desktopStyles.innerWrap}>{content}</View>
        </ScrollView>
      </View>
    );
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {/* Header — white surface bar with a hairline bottom rule */}
      <View style={[styles.header, { paddingTop: safeTop + Space.md }]}>
        <Text size="screen" weight="bold" tracking="tight">Profile</Text>
        <NotificationBell />
      </View>

      <ScrollView style={styles.screen} contentContainerStyle={styles.contentWrap}>
        {content}
      </ScrollView>
    </View>
  );
}
