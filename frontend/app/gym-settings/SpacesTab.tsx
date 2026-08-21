import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, TextInput, TouchableOpacity, View } from 'react-native';
import { showAlert, showConfirm, showError } from '@/utils/alert';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { Text, Icon, Button } from '@/components/cleanink';
import { Ink, Status } from '@/constants/design';
import { styles } from './gym-settings.styles';

type SpaceItem = components['schemas']['SpaceItemDto'];
type GetSpacesResponse = components['schemas']['GetSpacesResponseDto'];
type CreateSpaceDto = components['schemas']['CreateSpaceDto'];
type CreateSpaceResponse = components['schemas']['CreateSpaceResponseDto'];
type UpdateSpaceDto = components['schemas']['UpdateSpaceDto'];
type UpdateSpaceResponse = components['schemas']['UpdateSpaceResponseDto'];
type DeleteSpaceResponse = components['schemas']['DeleteSpaceResponseDto'];

type FormMode = 'add' | 'edit' | null;

// ─── Empty State ─────────────────────────────────────────────────────────────

interface EmptySpacesProps {
  onAddPress: () => void;
}

function EmptySpaces({ onAddPress }: EmptySpacesProps) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Icon name="place" size={28} tone="faint" />
      </View>
      <Text size="title" weight="semibold" tone="strong">No spaces configured yet</Text>
      <Text size="meta" tone="muted" style={styles.emptyDesc}>
        Add your first training space to start organizing classes.
      </Text>
      <View style={styles.emptyBtnWrap}>
        <Button testID="add-space-btn" label="Add Space" variant="primary" onPress={onAddPress} />
      </View>
    </View>
  );
}

// ─── Spaces Table ─────────────────────────────────────────────────────────────

interface SpacesTableProps {
  spaces: SpaceItem[];
  onEdit: (space: SpaceItem) => void;
  onDelete: (space: SpaceItem) => void;
  onAddPress: () => void;
}

function SpacesTable({ spaces, onEdit, onDelete, onAddPress }: SpacesTableProps) {
  return (
    <View style={styles.content}>
      <View style={styles.sectionRow}>
        <Text size="title" weight="semibold" tone="strong">Spaces</Text>
        <View style={styles.addBtnWrap}>
          <Button testID="add-space-btn" label="Add Space" variant="primary" onPress={onAddPress} />
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <View style={styles.colName}>
            <Text size="label" weight="semibold" tone="faint" upper>Name</Text>
          </View>
          <View style={styles.colCapacity}>
            <Text size="label" weight="semibold" tone="faint" upper>Base Capacity</Text>
          </View>
          <View style={styles.colActions}>
            <Text size="label" weight="semibold" tone="faint" upper>Actions</Text>
          </View>
        </View>

        {spaces.map((space) => (
          <View key={space.id} style={styles.tableRow}>
            <View style={styles.colName}>
              <Text size="body" tone="strong">{space.name}</Text>
            </View>
            <View style={styles.colCapacity}>
              <Text size="body" tone="strong">{space.baseCapacity}</Text>
            </View>
            <View style={styles.colActionsRow}>
              <View style={styles.entityCardActionBtn}>
                <Button
                  testID={`space-edit-btn-${space.id}`}
                  label="Edit"
                  variant="quiet"
                  onPress={() => onEdit(space)}
                />
              </View>
              <View style={styles.entityCardActionBtn}>
                <Button
                  testID={`space-delete-btn-${space.id}`}
                  label="Delete"
                  variant="danger"
                  onPress={() => onDelete(space)}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Space Card (Mobile) ───────────────────────────────────────────────────────

interface SpaceCardProps {
  space: SpaceItem;
  onEdit: (space: SpaceItem) => void;
  onDelete: (space: SpaceItem) => void;
}

function SpaceCard({ space, onEdit, onDelete }: SpaceCardProps) {
  return (
    <View style={styles.entityCard}>
      <View style={styles.entityCardTop}>
        <View style={styles.entityCardTitleWrap}>
          <Text size="body" weight="semibold" tone="strong" numberOfLines={1}>{space.name}</Text>
        </View>
        <View style={styles.entityCardActions}>
          <View style={styles.entityCardActionBtn}>
            <Button
              testID={`space-edit-btn-${space.id}`}
              label="Edit"
              variant="quiet"
              onPress={() => onEdit(space)}
            />
          </View>
          <View style={styles.entityCardActionBtn}>
            <Button
              testID={`space-delete-btn-${space.id}`}
              label="Delete"
              variant="danger"
              onPress={() => onDelete(space)}
            />
          </View>
        </View>
      </View>
      <Text size="meta" tone="muted">Base capacity: {space.baseCapacity}</Text>
    </View>
  );
}

// ─── Spaces Card List (Mobile) ─────────────────────────────────────────────────

interface SpacesCardListProps {
  spaces: SpaceItem[];
  onEdit: (space: SpaceItem) => void;
  onDelete: (space: SpaceItem) => void;
  onAddPress: () => void;
}

function SpacesCardList({ spaces, onEdit, onDelete, onAddPress }: SpacesCardListProps) {
  return (
    <View style={styles.content}>
      <View style={styles.sectionRow}>
        <Text size="title" weight="semibold" tone="strong">Spaces</Text>
        <View style={styles.addBtnWrap}>
          <Button testID="add-space-btn" label="Add Space" variant="primary" onPress={onAddPress} />
        </View>
      </View>
      <View style={styles.spaceCardList}>
        {spaces.map((space) => (
          <SpaceCard key={space.id} space={space} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </View>
    </View>
  );
}

// ─── Space Form ───────────────────────────────────────────────────────────────

interface SpaceFormProps {
  mode: 'add' | 'edit';
  initialName: string;
  initialCapacity: string;
  isSaving: boolean;
  onSave: (name: string, baseCapacity: number) => void;
  onCancel: () => void;
}

function SpaceForm({ mode, initialName, initialCapacity, isSaving, onSave, onCancel }: SpaceFormProps) {
  const [name, setName] = useState(initialName);
  const [capacity, setCapacity] = useState(initialCapacity);

  function handleSave() {
    const trimmedName = name.trim();
    const parsedCapacity = parseInt(capacity, 10);
    if (!trimmedName) {
      showAlert('Validation', 'Space name is required.');
      return;
    }
    if (isNaN(parsedCapacity) || parsedCapacity < 1) {
      showAlert('Validation', 'Base capacity must be a positive number.');
      return;
    }
    onSave(trimmedName, parsedCapacity);
  }

  return (
    <View style={styles.content}>
      <Text size="title" weight="semibold" tone="strong">{mode === 'add' ? 'Add Space' : 'Edit Space'}</Text>
      <View style={styles.formCard}>
        <Text size="body" weight="semibold" tone="strong">Space Name &amp; Capacity</Text>

        <View style={styles.fieldGroup}>
          <Text size="label" weight="semibold" tone="faint" upper>Space Name</Text>
          <TextInput
            testID="space-name-input"
            style={styles.input}
            placeholder="e.g. Main Floor"
            placeholderTextColor={Ink.faint}
            value={name}
            onChangeText={setName}
            editable={!isSaving}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text size="label" weight="semibold" tone="faint" upper>Base Capacity</Text>
          <TextInput
            testID="space-capacity-input"
            style={styles.input}
            placeholder="e.g. 20"
            placeholderTextColor={Ink.faint}
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="numeric"
            editable={!isSaving}
          />
        </View>

        <View style={styles.formBtnRow}>
          <View style={styles.formBtnWrap}>
            <Button
              testID="space-form-save-btn"
              label="Save"
              variant="primary"
              onPress={handleSave}
              loading={isSaving}
            />
          </View>
          <View style={styles.formBtnWrap}>
            <Button
              testID="space-form-cancel-btn"
              label="Cancel"
              variant="quiet"
              onPress={onCancel}
              disabled={isSaving}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Spaces Tab ───────────────────────────────────────────────────────────────

interface SpacesTabProps {
  gymId: string;
  token: string;
  isMobile: boolean;
}

export function SpacesTab({ gymId, token, isMobile }: SpacesTabProps) {
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingSpace, setEditingSpace] = useState<SpaceItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSpaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = createApiClient({ token });
      const data = await client.get<GetSpacesResponse>(
        `/api/gyms/${gymId}/configuration/spaces`
      );
      setSpaces(data.spaces ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load spaces';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [token, gymId]);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  const handleAddPress = useCallback(() => {
    setEditingSpace(null);
    setFormMode('add');
  }, []);

  const handleEditPress = useCallback((space: SpaceItem) => {
    setEditingSpace(space);
    setFormMode('edit');
  }, []);

  const handleDeletePress = useCallback((space: SpaceItem) => {
    // `showConfirm`, never `Alert.alert`: react-native-web's Alert is a literal
    // no-op (`static alert() {}`), so on web Delete silently did nothing.
    showConfirm(
      'Delete Space',
      `Are you sure you want to delete "${space.name}"?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const client = createApiClient({ token });
              await client.delete<DeleteSpaceResponse>(
                `/api/gyms/${gymId}/configuration/spaces/${space.id}`
              );
              await fetchSpaces();
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Failed to delete space';
              showError('Error', msg);
            }
          },
        },
      ]
    );
  }, [token, gymId, fetchSpaces]);

  const handleSave = useCallback(async (name: string, baseCapacity: number) => {
    setIsSaving(true);
    try {
      const client = createApiClient({ token });
      if (formMode === 'add') {
        const body: CreateSpaceDto = { name, baseCapacity };
        await client.post<CreateSpaceResponse>(
          `/api/gyms/${gymId}/configuration/spaces`,
          body as unknown as Record<string, unknown>
        );
      } else if (formMode === 'edit' && editingSpace) {
        const body: UpdateSpaceDto = { name, baseCapacity };
        await client.patch<UpdateSpaceResponse>(
          `/api/gyms/${gymId}/configuration/spaces/${editingSpace.id}`,
          body as unknown as Record<string, unknown>
        );
      }
      setFormMode(null);
      setEditingSpace(null);
      await fetchSpaces();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save space';
      showError('Error', msg);
    } finally {
      setIsSaving(false);
    }
  }, [token, gymId, formMode, editingSpace, fetchSpaces]);

  const handleCancel = useCallback(() => {
    setFormMode(null);
    setEditingSpace(null);
  }, []);

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
        <TouchableOpacity style={styles.retryBtn} onPress={fetchSpaces}>
          <Text size="body" tone="strong">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (formMode === 'add' || formMode === 'edit') {
    return (
      <SpaceForm
        mode={formMode}
        initialName={editingSpace?.name ?? ''}
        initialCapacity={editingSpace ? String(editingSpace.baseCapacity) : ''}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  if (spaces.length === 0) {
    return <EmptySpaces onAddPress={handleAddPress} />;
  }

  if (isMobile) {
    return (
      <SpacesCardList
        spaces={spaces}
        onEdit={handleEditPress}
        onDelete={handleDeletePress}
        onAddPress={handleAddPress}
      />
    );
  }

  return (
    <SpacesTable
      spaces={spaces}
      onEdit={handleEditPress}
      onDelete={handleDeletePress}
      onAddPress={handleAddPress}
    />
  );
}
