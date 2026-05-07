import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
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

const INPUT_PLACEHOLDER_COLOR = '#9CA3AF';
const PRIMARY_BTN_TEXT_COLOR = '#FFFFFF';
const BODY_TEXT_COLOR = '#111827';

// ─── Empty State ─────────────────────────────────────────────────────────────

interface EmptyClassTypesProps {
  onAddPress: () => void;
}

function EmptyClassTypes({ onAddPress }: EmptyClassTypesProps) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>⬡</Text>
      </View>
      <Text style={styles.emptyTitle}>No class types configured yet</Text>
      <Text style={styles.emptyDesc}>
        Add your first class type to start organizing your gym's programming.
      </Text>
      <TouchableOpacity style={styles.addBtn} onPress={onAddPress} activeOpacity={0.8}>
        <Text style={styles.addBtnPlus}>+</Text>
        <Text style={styles.addBtnText}>Add Class Type</Text>
      </TouchableOpacity>
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
        <Text style={styles.sectionTitle}>Class Types</Text>
        <TouchableOpacity style={styles.addBtn} onPress={onAddPress} activeOpacity={0.8}>
          <Text style={styles.addBtnPlus}>+</Text>
          <Text style={styles.addBtnText}>Add Class Type</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <View style={styles.colName}>
            <Text style={styles.tableHeaderText}>Name</Text>
          </View>
          <View style={styles.colLoggable}>
            <Text style={styles.tableHeaderText}>Loggable</Text>
          </View>
          <View style={styles.colMetric}>
            <Text style={styles.tableHeaderText}>Result Metric</Text>
          </View>
          <View style={styles.colClassTypeActions}>
            <Text style={styles.tableHeaderText}>Actions</Text>
          </View>
        </View>

        {classTypes.map((classType) => (
          <View key={classType.id} style={styles.tableRow}>
            <View style={styles.colName}>
              <Text style={styles.rowText}>{classType.name}</Text>
            </View>
            <View style={styles.colLoggable}>
              {classType.loggable ? (
                <View style={styles.badgeYes}>
                  <Text style={styles.badgeYesText}>Yes</Text>
                </View>
              ) : (
                <View style={styles.badgeNo}>
                  <Text style={styles.badgeNoText}>No</Text>
                </View>
              )}
            </View>
            <View style={styles.colMetric}>
              <Text style={styles.rowText}>
                {RESULT_METRIC_LABELS[classType.resultMetrics]}
              </Text>
            </View>
            <View style={styles.colClassTypeActionsRow}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => onEdit(classType)}
                activeOpacity={0.7}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => onDelete(classType)}
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
      <Text style={styles.formTitle}>
        {mode === 'add' ? 'Add Class Type' : 'Edit Class Type'}
      </Text>
      <View style={styles.classTypeFormCard}>
        <Text style={styles.inputLabel}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. CrossFit WOD"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={name}
          onChangeText={setName}
          editable={!isSaving}
        />

        <View style={styles.toggleRow}>
          <Text style={styles.inputLabel}>Loggable</Text>
          <TouchableOpacity
            style={[styles.toggleTrack, loggable && styles.toggleTrackActive]}
            onPress={() => !isSaving && setLoggable(!loggable)}
            activeOpacity={0.8}>
            <View style={[styles.toggleThumb, loggable && styles.toggleThumbRight]} />
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>Result Metric</Text>
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
                  style={[
                    styles.metricPillText,
                    isSelected && styles.metricPillTextSelected,
                  ]}>
                  {RESULT_METRIC_LABELS[metric]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.formBtnRow}>
          <TouchableOpacity
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

// ─── Class Types Tab ──────────────────────────────────────────────────────────

interface ClassTypesTabProps {
  gymId: string;
  token: string;
}

export function ClassTypesTab({ gymId, token }: ClassTypesTabProps) {
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
        <ActivityIndicator size="large" color={BODY_TEXT_COLOR} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.feedbackContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchClassTypes}>
          <Text style={styles.retryBtnText}>Retry</Text>
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

  return (
    <ClassTypesTable
      classTypes={classTypes}
      onEdit={handleEditPress}
      onDelete={handleDeletePress}
      onAddPress={handleAddPress}
    />
  );
}
