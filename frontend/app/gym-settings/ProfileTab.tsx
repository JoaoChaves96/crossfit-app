import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, TextInput, TouchableOpacity, View } from 'react-native';
import { showError } from '@/utils/alert';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { Text, Button, StatusChip } from '@/components/cleanink';
import { Ink, Status } from '@/constants/design';
import { styles } from './gym-settings.styles';

type GymProfileDto = components['schemas']['GymProfileDto'];
type UpdateGymProfileDto = components['schemas']['UpdateGymProfileDto'];

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
      showError('Error', msg);
    } finally {
      setIsSaving(false);
    }
  }, [token, gymId, name, description, location]);

  if (isLoading) {
    return (
      <View style={styles.feedbackContainer}>
        <ActivityIndicator size="large" color={Ink.strong} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.feedbackContainer}>
        <Text size="body" tone={Status.danger} style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchProfile}>
          <Text size="body" tone="strong">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.content}>
      <View style={styles.sectionRow}>
        <Text size="title" weight="semibold" tone="strong">Gym Profile</Text>
        <View style={styles.profileSaveBtnWrap}>
          <Button
            label="Save Changes"
            variant="primary"
            onPress={handleSave}
            disabled={!isDirty}
            loading={isSaving}
          />
        </View>
      </View>

      <View style={styles.profileFormCard}>
        <View style={styles.fieldGroup}>
          <Text size="label" weight="semibold" tone="faint" upper>Gym Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. CrossFit Downtown"
            placeholderTextColor={Ink.faint}
            value={name}
            onChangeText={setName}
            editable={!isSaving}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text size="label" weight="semibold" tone="faint" upper>Description</Text>
          <TextInput
            style={styles.profileDescInput}
            placeholder="A community-driven CrossFit box..."
            placeholderTextColor={Ink.faint}
            value={description}
            onChangeText={setDescription}
            multiline
            editable={!isSaving}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text size="label" weight="semibold" tone="faint" upper>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 123 Main St, New York, NY"
            placeholderTextColor={Ink.faint}
            value={location}
            onChangeText={setLocation}
            editable={!isSaving}
          />
        </View>

        <View style={styles.profileInfoRow}>
          <StatusChip tone="open" label="Active" />
          {profile && (
            <Text size="meta" tone="faint">
              Created {formatCreatedDate(profile.createdAt)}
            </Text>
          )}
        </View>

        <View style={styles.profileLogoSection}>
          <Text size="label" weight="semibold" tone="faint" upper>Logo</Text>
          <View style={styles.profileLogoPlaceholder}>
            <Text size="meta" tone="faint" style={styles.errorText}>{'Logo upload\ncoming soon'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
