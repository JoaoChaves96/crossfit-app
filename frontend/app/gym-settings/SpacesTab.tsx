import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { styles } from './gym-settings.styles';

type SpaceItem = components['schemas']['SpaceItemDto'];
type GetSpacesResponse = components['schemas']['GetSpacesResponseDto'];
type CreateSpaceDto = components['schemas']['CreateSpaceDto'];
type CreateSpaceResponse = components['schemas']['CreateSpaceResponseDto'];
type UpdateSpaceDto = components['schemas']['UpdateSpaceDto'];
type UpdateSpaceResponse = components['schemas']['UpdateSpaceResponseDto'];
type DeleteSpaceResponse = components['schemas']['DeleteSpaceResponseDto'];

type FormMode = 'add' | 'edit' | null;

const INPUT_PLACEHOLDER_COLOR = '#9CA3AF';
const PRIMARY_BTN_TEXT_COLOR = '#FFFFFF';
const BODY_TEXT_COLOR = '#111827';

// ─── Empty State ─────────────────────────────────────────────────────────────

interface EmptySpacesProps {
  onAddPress: () => void;
}

function EmptySpaces({ onAddPress }: EmptySpacesProps) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>⬡</Text>
      </View>
      <Text style={styles.emptyTitle}>No spaces configured yet</Text>
      <Text style={styles.emptyDesc}>
        Add your first training space to start organizing classes.
      </Text>
      <TouchableOpacity testID="add-space-btn" style={styles.addBtn} onPress={onAddPress} activeOpacity={0.8}>
        <Text style={styles.addBtnPlus}>+</Text>
        <Text style={styles.addBtnText}>Add Space</Text>
      </TouchableOpacity>
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
        <Text style={styles.sectionTitle}>Spaces</Text>
        <TouchableOpacity testID="add-space-btn" style={styles.addBtn} onPress={onAddPress} activeOpacity={0.8}>
          <Text style={styles.addBtnPlus}>+</Text>
          <Text style={styles.addBtnText}>Add Space</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <View style={styles.colName}>
            <Text style={styles.tableHeaderText}>Name</Text>
          </View>
          <View style={styles.colCapacity}>
            <Text style={styles.tableHeaderText}>Base Capacity</Text>
          </View>
          <View style={styles.colActions}>
            <Text style={styles.tableHeaderText}>Actions</Text>
          </View>
        </View>

        {spaces.map((space) => (
          <View key={space.id} style={styles.tableRow}>
            <View style={styles.colName}>
              <Text style={styles.rowText}>{space.name}</Text>
            </View>
            <View style={styles.colCapacity}>
              <Text style={styles.rowText}>{space.baseCapacity}</Text>
            </View>
            <View style={styles.colActionsRow}>
              <TouchableOpacity
                testID={`space-edit-btn-${space.id}`}
                style={styles.editBtn}
                onPress={() => onEdit(space)}
                activeOpacity={0.7}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID={`space-delete-btn-${space.id}`}
                style={styles.deleteBtn}
                onPress={() => onDelete(space)}
                activeOpacity={0.7}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
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
        <Text style={styles.entityCardTitle} numberOfLines={1}>{space.name}</Text>
        <View style={styles.entityCardActions}>
          <TouchableOpacity
            testID={`space-edit-btn-${space.id}`}
            style={styles.editBtn}
            onPress={() => onEdit(space)}
            activeOpacity={0.7}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID={`space-delete-btn-${space.id}`}
            style={styles.deleteBtn}
            onPress={() => onDelete(space)}
            activeOpacity={0.7}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.entityCardSub}>Base capacity: {space.baseCapacity}</Text>
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
        <Text style={styles.sectionTitle}>Spaces</Text>
        <TouchableOpacity testID="add-space-btn" style={styles.addBtn} onPress={onAddPress} activeOpacity={0.8}>
          <Text style={styles.addBtnPlus}>+</Text>
          <Text style={styles.addBtnText}>Add Space</Text>
        </TouchableOpacity>
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
      Alert.alert('Validation', 'Space name is required.');
      return;
    }
    if (isNaN(parsedCapacity) || parsedCapacity < 1) {
      Alert.alert('Validation', 'Base capacity must be a positive number.');
      return;
    }
    onSave(trimmedName, parsedCapacity);
  }

  return (
    <View style={styles.content}>
      <Text style={styles.formTitle}>{mode === 'add' ? 'Add Space' : 'Edit Space'}</Text>
      <View style={styles.formCard}>
        <Text style={styles.formCardTitle}>Space Name &amp; Capacity</Text>

        <Text style={styles.inputLabel}>Space Name</Text>
        <TextInput
          testID="space-name-input"
          style={styles.input}
          placeholder="e.g. Main Floor"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={name}
          onChangeText={setName}
          editable={!isSaving}
        />

        <Text style={styles.inputLabel}>Base Capacity</Text>
        <TextInput
          testID="space-capacity-input"
          style={styles.input}
          placeholder="e.g. 20"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={capacity}
          onChangeText={setCapacity}
          keyboardType="numeric"
          editable={!isSaving}
        />

        <View style={styles.formBtnRow}>
          <TouchableOpacity
            testID="space-form-save-btn"
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}>
            {isSaving ? (
              <ActivityIndicator size="small" color={PRIMARY_BTN_TEXT_COLOR} />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            testID="space-form-cancel-btn"
            style={styles.cancelBtn}
            onPress={onCancel}
            disabled={isSaving}
            activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
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
    Alert.alert(
      'Delete Space',
      `Are you sure you want to delete "${space.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
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
              Alert.alert('Error', msg);
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
      Alert.alert('Error', msg);
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
        <ActivityIndicator size="large" color={BODY_TEXT_COLOR} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.feedbackContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchSpaces}>
          <Text style={styles.retryBtnText}>Retry</Text>
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
