import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { createApiClient } from '@/utils/api-client';
import type { components } from '@/types/api.gen';
import { AppColors } from '@/constants/theme';
import { styles } from './profile.styles';

type UserProfileDto = components['schemas']['UserProfileDto'];
type UpdateUserProfileDto = components['schemas']['UpdateUserProfileDto'];

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
        <ActivityIndicator size="large" color={AppColors.textDark3} />
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
    </ScrollView>
  );
}

