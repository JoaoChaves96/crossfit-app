import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { styles } from './gym-settings.styles';

type GymProfileDto = components['schemas']['GymProfileDto'];
type UpdateGymProfileDto = components['schemas']['UpdateGymProfileDto'];

const INPUT_PLACEHOLDER_COLOR = '#9CA3AF';
const PRIMARY_BTN_TEXT_COLOR = '#FFFFFF';
const BODY_TEXT_COLOR = '#111827';

function formatCreatedDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function resolveDescription(value: GymProfileDto['description']): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return '';
}

interface ProfileTabProps {
  gymId: string;
  token: string;
}

export function ProfileTab({ gymId, token }: ProfileTabProps) {
  const [profile, setProfile] = useState<GymProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  const isDirty =
    profile !== null &&
    (name !== profile.name ||
      description !== resolveDescription(profile.description) ||
      location !== profile.location);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = createApiClient({ token });
      const data = await client.get<GymProfileDto>(`/api/gyms/${gymId}/profile`);
      setProfile(data);
      setName(data.name);
      setDescription(resolveDescription(data.description));
      setLocation(data.location);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load gym profile';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [token, gymId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const client = createApiClient({ token });
      const body: UpdateGymProfileDto = { name, description, location };
      const updated = await client.patch<GymProfileDto>(
        `/api/gyms/${gymId}/profile`,
        body as unknown as Record<string, unknown>
      );
      setProfile(updated);
      setName(updated.name);
      setDescription(resolveDescription(updated.description));
      setLocation(updated.location);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save gym profile';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  }, [token, gymId, name, description, location]);

  if (isLoading) {
    return (
      <View style={styles.feedbackContainer}>
        <ActivityIndicator size="large" color={BODY_TEXT_COLOR} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.feedbackContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchProfile}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.content}>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Gym Profile</Text>
        <TouchableOpacity
          style={[styles.profileSaveBtn, (!isDirty || isSaving) && styles.profileSaveBtnDisabled]}
          onPress={handleSave}
          disabled={!isDirty || isSaving}
          activeOpacity={0.8}>
          {isSaving ? (
            <ActivityIndicator size="small" color={PRIMARY_BTN_TEXT_COLOR} />
          ) : (
            <Text style={styles.profileSaveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.profileFormCard}>
        <Text style={styles.inputLabel}>Gym Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. CrossFit Downtown"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={name}
          onChangeText={setName}
          editable={!isSaving}
        />

        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={styles.profileDescInput}
          placeholder="A community-driven CrossFit box..."
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={description}
          onChangeText={setDescription}
          multiline
          editable={!isSaving}
          textAlignVertical="top"
        />

        <Text style={styles.inputLabel}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 123 Main St, New York, NY"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={location}
          onChangeText={setLocation}
          editable={!isSaving}
        />

        <View style={styles.profileInfoRow}>
          <View style={styles.profileActiveBadge}>
            <Text style={styles.profileActiveBadgeText}>Active</Text>
          </View>
          {profile && (
            <Text style={styles.profileCreatedLabel}>
              Created {formatCreatedDate(profile.createdAt)}
            </Text>
          )}
        </View>

        <View style={styles.profileLogoSection}>
          <Text style={styles.inputLabel}>Logo</Text>
          <View style={styles.profileLogoPlaceholder}>
            <Text style={styles.profileLogoPlaceholderText}>{'Logo upload\ncoming soon'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
