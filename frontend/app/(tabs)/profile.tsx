import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { createApiClient } from '@/utils/api-client';
import type { components } from '@/types/api.gen';

type UserProfileDto = components['schemas']['UserProfileDto'];
type UpdateUserProfileDto = components['schemas']['UpdateUserProfileDto'];

const COLORS = {
  bg: '#FFFFFF',
  fontPrimary: '#1A1A1A',
  fontSecondary: '#666666',
  fontTertiary: '#999999',
  accent: '#333333',
  border: '#E0E0E0',
  avatarBg: '#F0F0F0',
  avatarText: '#6B7280',
  nameText: '#111827',
  white: '#FFFFFF',
} as const;

const FONT_FAMILY = 'Inter';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatMemberSince(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; profile: UserProfileDto };

export default function ProfileScreen() {
  const { token } = useAuth();
  const [screenState, setScreenState] = useState<ScreenState>({ status: 'loading' });
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setScreenState({ status: 'loading' });
    try {
      const client = createApiClient({ token });
      const profile = await client.get<UserProfileDto>('/api/me');
      setScreenState({ status: 'success', profile });
      setEditedName(profile.name);
    } catch {
      setScreenState({ status: 'error', message: 'Failed to load profile. Please try again.' });
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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

  if (screenState.status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (screenState.status === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{screenState.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonLabel}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { profile } = screenState;
  const initials = getInitials(profile.name);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.contentWrap}>
      {/* Status bar placeholder */}
      <View style={styles.statusBar} />

      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.headerTitle}>Profile</Text>
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

      {/* Save button */}
      {isEditing && (
        <View style={styles.saveButtonWrap}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isSaving || editedName.trim().length === 0}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  contentWrap: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    paddingHorizontal: 24,
    gap: 16,
  },
  errorText: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    color: COLORS.fontSecondary,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
  },
  retryButtonLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  statusBar: {
    height: 44,
  },
  pageHeader: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.fontPrimary,
  },
  avatarSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  avatarBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.avatarBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontFamily: FONT_FAMILY,
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.avatarText,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 14,
    paddingBottom: 4,
  },
  nameText: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.nameText,
  },
  editIconText: {
    fontSize: 14,
    color: COLORS.fontSecondary,
  },
  emailText: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    color: COLORS.fontSecondary,
  },
  memberSinceRow: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  memberSince: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: COLORS.fontTertiary,
  },
  dividerWrap: {
    width: '100%',
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  infoCard: {
    width: '100%',
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  nameFieldRow: {
    width: '100%',
    gap: 6,
    paddingVertical: 16,
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.fontTertiary,
    letterSpacing: 0.3,
  },
  fieldInputWrap: {
    width: '100%',
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  fieldInputWrapActive: {
    borderColor: COLORS.accent,
  },
  fieldInputText: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    color: COLORS.fontPrimary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    width: '100%',
  },
  emailFieldRow: {
    width: '100%',
    gap: 6,
    paddingVertical: 16,
  },
  emailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveButtonWrap: {
    width: '100%',
    paddingTop: 20,
  },
  saveButton: {
    width: '100%',
    height: 48,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  saveErrorText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: '#D32F2F',
    textAlign: 'center',
    paddingTop: 8,
  },
  noteRow: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  noteText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    color: COLORS.fontTertiary,
  },
});
