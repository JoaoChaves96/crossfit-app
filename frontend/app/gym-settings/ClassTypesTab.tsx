import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, TextInput, TouchableOpacity, View } from 'react-native';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { Text, Icon, Button, StatusChip } from '@/components/cleanink';
import { Ink, Accent, Status } from '@/constants/design';
import { styles } from './gym-settings.styles';

type ClassTypeItem = components['schemas']['ClassTypeItemDto'];
type GetClassTypesResponse = components['schemas']['GetClassTypesResponseDto'];
type ConfigureClassTypesDto = components['schemas']['ConfigureClassTypesDto'];
type ConfigureClassTypesResponse = components['schemas']['ConfigureClassTypesResponseDto'];
type ResultMetric = ClassTypeItem['resultMetrics'];

type FormMode = 'add' | 'edit' | null;

const RESULT_METRICS: ResultMetric[] = ['time', 'reps', 'weight', 'rounds', 'none'];

const RESULT_METRIC_LABELS: Record<ResultMetric, string> = {
  time: 'Time',
  reps: 'Reps',
  weight: 'Weight',
  rounds: 'Rounds',
  none: 'None',
};

// ─── Empty State ─────────────────────────────────────────────────────────────

interface EmptyClassTypesProps {
  onAddPress: () => void;
}

function EmptyClassTypes({ onAddPress }: EmptyClassTypesProps) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Icon name="classes" size={28} tone="faint" />
      </View>
      <Text size="title" weight="semibold" tone="strong">No class types configured yet</Text>
      <Text size="meta" tone="muted" style={styles.emptyDesc}>
        Add your first class type to start organizing your gym's programming.
      </Text>
      <View style={styles.emptyBtnWrap}>
        <Button testID="add-class-type-btn" label="Add Class Type" variant="primary" onPress={onAddPress} />
      </View>
    </View>
  );
}

// ─── Class Types Table ────────────────────────────────────────────────────────

interface ClassTypesTableProps {
  classTypes: ClassTypeItem[];
  onEdit: (classType: ClassTypeItem) => void;
  onDelete: (classType: ClassTypeItem) => void;
  onAddPress: () => void;
}

function ClassTypesTable({ classTypes, onEdit, onDelete, onAddPress }: ClassTypesTableProps) {
  return (
    <View style={styles.content}>
      <View style={styles.sectionRow}>
        <Text size="title" weight="semibold" tone="strong">Class Types</Text>
        <View style={styles.addBtnWrap}>
          <Button testID="add-class-type-btn" label="Add Class Type" variant="primary" onPress={onAddPress} />
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <View style={styles.colName}>
            <Text size="label" weight="semibold" tone="faint" upper>Name</Text>
          </View>
          <View style={styles.colLoggable}>
            <Text size="label" weight="semibold" tone="faint" upper>Loggable</Text>
          </View>
          <View style={styles.colMetric}>
            <Text size="label" weight="semibold" tone="faint" upper>Result Metric</Text>
          </View>
          <View style={styles.colClassTypeActions}>
            <Text size="label" weight="semibold" tone="faint" upper>Actions</Text>
          </View>
        </View>

        {classTypes.map((classType) => (
          <View key={classType.id} style={styles.tableRow}>
            <View style={styles.colName}>
              <Text size="body" tone="strong">{classType.name}</Text>
            </View>
            <View style={styles.colLoggable}>
              {classType.loggable ? (
                <StatusChip tone="open" label="Yes" />
              ) : (
                <StatusChip tone="neutral" label="No" />
              )}
            </View>
            <View style={styles.colMetric}>
              <Text size="body" tone="strong">
                {RESULT_METRIC_LABELS[classType.resultMetrics]}
              </Text>
            </View>
            <View style={styles.colClassTypeActionsRow}>
              <View style={styles.entityCardActionBtn}>
                <Button
                  testID={`class-type-edit-btn-${classType.id}`}
                  label="Edit"
                  variant="quiet"
                  onPress={() => onEdit(classType)}
                />
              </View>
              <View style={styles.entityCardActionBtn}>
                <Button
                  testID={`class-type-delete-btn-${classType.id}`}
                  label="Delete"
                  variant="danger"
                  onPress={() => onDelete(classType)}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Class Type Card (Mobile) ───────────────────────────────────────────────────

interface ClassTypeCardProps {
  classType: ClassTypeItem;
  onEdit: (classType: ClassTypeItem) => void;
  onDelete: (classType: ClassTypeItem) => void;
}

function ClassTypeCard({ classType, onEdit, onDelete }: ClassTypeCardProps) {
  return (
    <View style={styles.entityCard}>
      <View style={styles.entityCardTop}>
        <View style={styles.entityCardTitleWrap}>
          <Text size="body" weight="semibold" tone="strong" numberOfLines={1}>{classType.name}</Text>
        </View>
        <View style={styles.entityCardActions}>
          <View style={styles.entityCardActionBtn}>
            <Button
              testID={`class-type-edit-btn-${classType.id}`}
              label="Edit"
              variant="quiet"
              onPress={() => onEdit(classType)}
            />
          </View>
          <View style={styles.entityCardActionBtn}>
            <Button
              testID={`class-type-delete-btn-${classType.id}`}
              label="Delete"
              variant="danger"
              onPress={() => onDelete(classType)}
            />
          </View>
        </View>
      </View>
      <Text size="meta" tone="muted">
        {classType.loggable ? 'Loggable' : 'Not loggable'} · Metric: {RESULT_METRIC_LABELS[classType.resultMetrics]}
      </Text>
    </View>
  );
}

// ─── Class Types Card List (Mobile) ─────────────────────────────────────────────

interface ClassTypesCardListProps {
  classTypes: ClassTypeItem[];
  onEdit: (classType: ClassTypeItem) => void;
  onDelete: (classType: ClassTypeItem) => void;
  onAddPress: () => void;
}

function ClassTypesCardList({ classTypes, onEdit, onDelete, onAddPress }: ClassTypesCardListProps) {
  return (
    <View style={styles.content}>
      <View style={styles.sectionRow}>
        <Text size="title" weight="semibold" tone="strong">Class Types</Text>
        <View style={styles.addBtnWrap}>
          <Button testID="add-class-type-btn" label="Add Class Type" variant="primary" onPress={onAddPress} />
        </View>
      </View>
      <View style={styles.spaceCardList}>
        {classTypes.map((classType) => (
          <ClassTypeCard key={classType.id} classType={classType} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </View>
    </View>
  );
}

// ─── Class Type Form ──────────────────────────────────────────────────────────

interface ClassTypeFormProps {
  mode: 'add' | 'edit';
  initialName: string;
  initialLoggable: boolean;
  initialMetric: ResultMetric;
  isSaving: boolean;
  onSave: (name: string, loggable: boolean, resultMetrics: ResultMetric) => void;
  onCancel: () => void;
}

function ClassTypeForm({
  mode,
  initialName,
  initialLoggable,
  initialMetric,
  isSaving,
  onSave,
  onCancel,
}: ClassTypeFormProps) {
  const [name, setName] = useState(initialName);
  const [loggable, setLoggable] = useState(initialLoggable);
  const [selectedMetric, setSelectedMetric] = useState<ResultMetric>(initialMetric);

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Validation', 'Class type name is required.');
      return;
    }
    onSave(trimmedName, loggable, selectedMetric);
  }

  return (
    <View style={styles.content}>
      <Text size="title" weight="semibold" tone="strong">
        {mode === 'add' ? 'Add Class Type' : 'Edit Class Type'}
      </Text>
      <View style={styles.classTypeFormCard}>
        <View style={styles.fieldGroup}>
          <Text size="label" weight="semibold" tone="faint" upper>Name</Text>
          <TextInput
            testID="class-type-name-input"
            style={styles.input}
            placeholder="e.g. CrossFit WOD"
            placeholderTextColor={Ink.faint}
            value={name}
            onChangeText={setName}
            editable={!isSaving}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text size="label" weight="semibold" tone="faint" upper>Loggable</Text>
          <TouchableOpacity
            style={[styles.toggleTrack, loggable && styles.toggleTrackActive]}
            onPress={() => !isSaving && setLoggable(!loggable)}
            activeOpacity={0.8}>
            <View style={[styles.toggleThumb, loggable && styles.toggleThumbRight]} />
          </TouchableOpacity>
        </View>

        <View style={styles.fieldGroup}>
          <Text size="label" weight="semibold" tone="faint" upper>Result Metric</Text>
          <View style={styles.metricRow}>
            {RESULT_METRICS.map((metric) => {
              const isSelected = selectedMetric === metric;
              return (
                <TouchableOpacity
                  key={metric}
                  style={[styles.metricPill, isSelected && styles.metricPillSelected]}
                  onPress={() => !isSaving && setSelectedMetric(metric)}
                  activeOpacity={0.7}>
                  <Text
                    size="meta"
                    weight={isSelected ? 'semibold' : 'medium'}
                    tone={isSelected ? Ink.inverse : Ink.muted}>
                    {RESULT_METRIC_LABELS[metric]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.formBtnRow}>
          <View style={styles.formBtnWrap}>
            <Button
              testID="class-type-form-save-btn"
              label="Save"
              variant="primary"
              onPress={handleSave}
              loading={isSaving}
            />
          </View>
          <View style={styles.formBtnWrap}>
            <Button
              testID="class-type-form-cancel-btn"
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

// ─── Class Types Tab ──────────────────────────────────────────────────────────

interface ClassTypesTabProps {
  gymId: string;
  token: string;
  isMobile: boolean;
}

export function ClassTypesTab({ gymId, token, isMobile }: ClassTypesTabProps) {
  const [classTypes, setClassTypes] = useState<ClassTypeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingClassType, setEditingClassType] = useState<ClassTypeItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchClassTypes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = createApiClient({ token });
      const data = await client.get<GetClassTypesResponse>(
        `/api/gyms/${gymId}/configuration/class-types`
      );
      setClassTypes(data.classTypes ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load class types';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [token, gymId]);

  useEffect(() => {
    fetchClassTypes();
  }, [fetchClassTypes]);

  const handleAddPress = useCallback(() => {
    setEditingClassType(null);
    setFormMode('add');
  }, []);

  const handleEditPress = useCallback((classType: ClassTypeItem) => {
    setEditingClassType(classType);
    setFormMode('edit');
  }, []);

  const handleDeletePress = useCallback(
    (classType: ClassTypeItem) => {
      Alert.alert(
        'Delete Class Type',
        `Are you sure you want to delete "${classType.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const client = createApiClient({ token });
                const body: ConfigureClassTypesDto = {
                  operation: 'delete',
                  classTypeId: classType.id,
                };
                await client.post<ConfigureClassTypesResponse>(
                  `/api/gyms/${gymId}/configuration/class-types`,
                  body as unknown as Record<string, unknown>
                );
                await fetchClassTypes();
              } catch (err) {
                const msg = err instanceof Error ? err.message : 'Failed to delete class type';
                Alert.alert('Error', msg);
              }
            },
          },
        ]
      );
    },
    [token, gymId, fetchClassTypes]
  );

  const handleSave = useCallback(
    async (name: string, loggable: boolean, resultMetrics: ResultMetric) => {
      setIsSaving(true);
      try {
        const client = createApiClient({ token });
        let body: ConfigureClassTypesDto;
        if (formMode === 'add') {
          body = { operation: 'create', name, loggable, resultMetrics };
        } else {
          body = {
            operation: 'update',
            classTypeId: editingClassType?.id,
            name,
            loggable,
            resultMetrics,
          };
        }
        await client.post<ConfigureClassTypesResponse>(
          `/api/gyms/${gymId}/configuration/class-types`,
          body as unknown as Record<string, unknown>
        );
        setFormMode(null);
        setEditingClassType(null);
        await fetchClassTypes();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save class type';
        Alert.alert('Error', msg);
      } finally {
        setIsSaving(false);
      }
    },
    [token, gymId, formMode, editingClassType, fetchClassTypes]
  );

  const handleCancel = useCallback(() => {
    setFormMode(null);
    setEditingClassType(null);
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
        <TouchableOpacity style={styles.retryBtn} onPress={fetchClassTypes}>
          <Text size="body" tone="strong">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (formMode === 'add' || formMode === 'edit') {
    return (
      <ClassTypeForm
        mode={formMode}
        initialName={editingClassType?.name ?? ''}
        initialLoggable={editingClassType?.loggable ?? false}
        initialMetric={editingClassType?.resultMetrics ?? 'none'}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  if (classTypes.length === 0) {
    return <EmptyClassTypes onAddPress={handleAddPress} />;
  }

  if (isMobile) {
    return (
      <ClassTypesCardList
        classTypes={classTypes}
        onEdit={handleEditPress}
        onDelete={handleDeletePress}
        onAddPress={handleAddPress}
      />
    );
  }

  return (
    <ClassTypesTable
      classTypes={classTypes}
      onEdit={handleEditPress}
      onDelete={handleDeletePress}
      onAddPress={handleAddPress}
    />
  );
}
