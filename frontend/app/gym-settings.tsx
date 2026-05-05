import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';

// ─── Types ────────────────────────────────────────────────────────────────────

type SpaceItem = components['schemas']['SpaceItemDto'];
type GetSpacesResponse = components['schemas']['GetSpacesResponseDto'];
type CreateSpaceDto = components['schemas']['CreateSpaceDto'];
type CreateSpaceResponse = components['schemas']['CreateSpaceResponseDto'];
type UpdateSpaceDto = components['schemas']['UpdateSpaceDto'];
type UpdateSpaceResponse = components['schemas']['UpdateSpaceResponseDto'];
type DeleteSpaceResponse = components['schemas']['DeleteSpaceResponseDto'];

type ClassTypeItem = components['schemas']['ClassTypeItemDto'];
type GetClassTypesResponse = components['schemas']['GetClassTypesResponseDto'];
type ConfigureClassTypesDto = components['schemas']['ConfigureClassTypesDto'];
type ConfigureClassTypesResponse = components['schemas']['ConfigureClassTypesResponseDto'];
type ResultMetric = ClassTypeItem['resultMetrics'];

type ActiveTab = 'spaces' | 'class-types' | 'booking-rules';
type FormMode = 'add' | 'edit' | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const RESULT_METRICS: ResultMetric[] = ['time', 'reps', 'weight', 'rounds', 'none'];

const RESULT_METRIC_LABELS: Record<ResultMetric, string> = {
  time: 'Time',
  reps: 'Reps',
  weight: 'Weight',
  rounds: 'Rounds',
  none: 'None',
};

// ─── Design Tokens ────────────────────────────────────────────────────────────

const COLOR = {
  white: '#FFFFFF',
  sidebarBg: '#F3F4F6',
  bodyText: '#111827',
  subText: '#6B7280',
  mutedText: '#9CA3AF',
  borderLight: '#E5E7EB',
  borderMid: '#D1D5DB',
  activeNavBg: '#E5E7EB',
  inactiveNavText: '#6B7280',
  primaryBtnBg: '#1A1A1A',
  primaryBtnText: '#FFFFFF',
  tableHeaderBg: '#F9FAFB',
  tableHeaderText: '#6B7280',
  editBtnText: '#374151',
  deleteBtnText: '#DC2626',
  deleteBtnBorder: '#FECACA',
  tabActiveBorder: '#1A1A1A',
  tabActiveText: '#1A1A1A',
  tabInactiveText: '#888888',
  tabInactiveBorder: '#D9D9D9',
  formCardBg: '#FFFFFF',
  formCardBorder: '#E5E7EB',
  inputBorder: '#D1D5DB',
  inputPlaceholder: '#9CA3AF',
  labelText: '#374151',
  sectionTitle: '#111827',
  emptyIconBg: '#F0F0F0',
  emptyIconText: '#AAAAAA',
  emptyTitle: '#333333',
  emptyDesc: '#888888',
  errorText: '#DC2626',
  badgeYesBg: '#D1FAE5',
  badgeYesText: '#065F46',
  badgeNoBg: '#F3F4F6',
  badgeNoText: '#6B7280',
  toggleActiveBg: '#1A1A1A',
  metricSelectedBg: '#1A1A1A',
  metricSelectedText: '#FFFFFF',
  metricUnselectedText: '#374151',
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS: { label: string; key: string; enabled: boolean }[] = [
  { label: 'Dashboard', key: 'dashboard', enabled: false },
  { label: 'Schedule', key: 'schedule', enabled: true },
  { label: 'Classes', key: 'classes', enabled: true },
  { label: 'Athletes', key: 'athletes', enabled: false },
  { label: 'Coaches', key: 'coaches', enabled: true },
  { label: 'Settings', key: 'settings', enabled: true },
];

interface SidebarProps {
  onNavigate: (key: string) => void;
}

function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarLogo}>
        <View style={styles.sidebarLogoIcon} />
        <Text style={styles.sidebarLogoText}>CrossFit Box</Text>
      </View>
      <View style={styles.navGroup}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === 'settings';
          const isDisabled = !item.enabled;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.navItem,
                isActive && styles.navItemActive,
                isDisabled && styles.navItemDisabled,
              ]}
              onPress={isDisabled ? undefined : () => onNavigate(item.key)}
              disabled={isDisabled}
              activeOpacity={isDisabled ? 1 : 0.7}>
              <View
                style={[
                  styles.navIcon,
                  isActive ? styles.navIconActive : styles.navIconInactive,
                  isDisabled && styles.navIconMuted,
                ]}
              />
              <Text
                style={[
                  styles.navLabel,
                  isActive ? styles.navLabelActive : styles.navLabelInactive,
                  isDisabled && styles.navLabelMuted,
                ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

interface TabBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const TABS: { key: ActiveTab; label: string }[] = [
  { key: 'spaces', label: 'Spaces' },
  { key: 'class-types', label: 'Class Types' },
  { key: 'booking-rules', label: 'Booking Rules' },
];

function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <View style={styles.tabBar}>
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive ? styles.tabActive : styles.tabInactive]}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}>
            <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      <View style={styles.tabFill} />
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

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
      <TouchableOpacity style={styles.addBtn} onPress={onAddPress} activeOpacity={0.8}>
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
        <TouchableOpacity style={styles.addBtn} onPress={onAddPress} activeOpacity={0.8}>
          <Text style={styles.addBtnPlus}>+</Text>
          <Text style={styles.addBtnText}>Add Space</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.table}>
        {/* Table header */}
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

        {/* Table rows */}
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
                style={styles.editBtn}
                onPress={() => onEdit(space)}
                activeOpacity={0.7}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
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
          style={styles.input}
          placeholder="e.g. Main Floor"
          placeholderTextColor={COLOR.inputPlaceholder}
          value={name}
          onChangeText={setName}
          editable={!isSaving}
        />

        <Text style={styles.inputLabel}>Base Capacity</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 20"
          placeholderTextColor={COLOR.inputPlaceholder}
          value={capacity}
          onChangeText={setCapacity}
          keyboardType="numeric"
          editable={!isSaving}
        />

        <View style={styles.formBtnRow}>
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}>
            {isSaving ? (
              <ActivityIndicator size="small" color={COLOR.primaryBtnText} />
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

// ─── Spaces Tab ───────────────────────────────────────────────────────────────

interface SpacesTabProps {
  gymId: string;
  token: string;
}

function SpacesTab({ gymId, token }: SpacesTabProps) {
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
        <ActivityIndicator size="large" color={COLOR.bodyText} />
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

  return (
    <SpacesTable
      spaces={spaces}
      onEdit={handleEditPress}
      onDelete={handleDeletePress}
      onAddPress={handleAddPress}
    />
  );
}

// ─── Empty Class Types ────────────────────────────────────────────────────────

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
        {/* Table header */}
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

        {/* Table rows */}
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
          placeholderTextColor={COLOR.inputPlaceholder}
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
              <ActivityIndicator size="small" color={COLOR.primaryBtnText} />
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

function ClassTypesTab({ gymId, token }: ClassTypesTabProps) {
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
        <ActivityIndicator size="large" color={COLOR.bodyText} />
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

// ─── Placeholder Tab ──────────────────────────────────────────────────────────

function PlaceholderTab({ label }: { label: string }) {
  return (
    <View style={styles.feedbackContainer}>
      <Text style={styles.placeholderText}>{label} — Coming soon</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GymSettings() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentGymId } = useGym();
  const [activeTab, setActiveTab] = useState<ActiveTab>('spaces');

  const handleNavigate = useCallback(
    (key: string) => {
      if (key === 'schedule') router.push('/schedule-dashboard' as never);
      if (key === 'coaches') router.push('/coaches' as never);
      if (key === 'classes') router.push('/schedule-dashboard' as never);
    },
    [router]
  );

  return (
    <View style={styles.root}>
      <Sidebar onNavigate={handleNavigate} />

      <View style={styles.main}>
        <Text style={styles.pageTitle}>Gym Settings</Text>

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {activeTab === 'spaces' && token && currentGymId ? (
            <SpacesTab gymId={currentGymId} token={token} />
          ) : activeTab === 'spaces' ? (
            <View style={styles.feedbackContainer}>
              <ActivityIndicator size="large" color={COLOR.bodyText} />
            </View>
          ) : activeTab === 'class-types' && token && currentGymId ? (
            <ClassTypesTab gymId={currentGymId} token={token} />
          ) : activeTab === 'class-types' ? (
            <View style={styles.feedbackContainer}>
              <ActivityIndicator size="large" color={COLOR.bodyText} />
            </View>
          ) : (
            <PlaceholderTab label="Booking Rules" />
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLOR.white,
  },

  // Sidebar
  sidebar: {
    width: 220,
    backgroundColor: COLOR.sidebarBg,
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 4,
  },
  sidebarLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 20,
  },
  sidebarLogoIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#6B7280',
  },
  sidebarLogoText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.bodyText,
  },
  navGroup: {
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  navItemActive: {
    backgroundColor: COLOR.activeNavBg,
  },
  navItemDisabled: {
    opacity: 0.4,
  },
  navIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  navIconActive: {
    backgroundColor: '#374151',
  },
  navIconInactive: {
    backgroundColor: '#9CA3AF',
  },
  navIconMuted: {
    backgroundColor: '#9CA3AF',
  },
  navLabel: {
    fontSize: 14,
  },
  navLabelActive: {
    fontWeight: '500',
    color: COLOR.bodyText,
  },
  navLabelInactive: {
    fontWeight: '400',
    color: COLOR.inactiveNavText,
  },
  navLabelMuted: {
    color: COLOR.mutedText,
  },

  // Main area
  main: {
    flex: 1,
    paddingHorizontal: 48,
    paddingVertical: 40,
    gap: 24,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: 'Inter',
  },
  tabContent: {
    flex: 1,
  },

  // Tab bar (matches design: padding [10,20], active bottom border 2px #1A1A1A, inactive #D9D9D9)
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLOR.tabActiveBorder,
  },
  tabInactive: {
    borderBottomWidth: 1,
    borderBottomColor: COLOR.tabInactiveBorder,
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
  tabTextActive: {
    fontWeight: '600',
    color: COLOR.tabActiveText,
  },
  tabTextInactive: {
    fontWeight: '400',
    color: COLOR.tabInactiveText,
  },
  tabFill: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.tabInactiveBorder,
    height: 38,
  },

  // Content area (used by both list and form states)
  content: {
    gap: 16,
    paddingVertical: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.sectionTitle,
    fontFamily: 'Inter',
  },

  // Add button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLOR.primaryBtnBg,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  addBtnPlus: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.primaryBtnText,
    fontFamily: 'Inter',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLOR.primaryBtnText,
    fontFamily: 'Inter',
  },

  // Table
  table: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR.borderLight,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.tableHeaderBg,
    height: 48,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.tableHeaderText,
    fontFamily: 'Inter',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLOR.borderLight,
  },
  colName: {
    flex: 1,
  },
  colCapacity: {
    width: 160,
  },
  colActions: {
    width: 160,
    alignItems: 'flex-end',
  },
  colActionsRow: {
    width: 160,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  rowText: {
    fontSize: 14,
    color: COLOR.bodyText,
    fontFamily: 'Inter',
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLOR.borderMid,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLOR.editBtnText,
    fontFamily: 'Inter',
  },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLOR.deleteBtnBorder,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLOR.deleteBtnText,
    fontFamily: 'Inter',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLOR.emptyIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: {
    fontSize: 24,
    color: COLOR.emptyIconText,
    fontFamily: 'Inter',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.emptyTitle,
    fontFamily: 'Inter',
  },
  emptyDesc: {
    fontSize: 14,
    color: COLOR.emptyDesc,
    fontFamily: 'Inter',
    textAlign: 'center',
    maxWidth: 360,
  },

  // Form
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.bodyText,
    fontFamily: 'Inter',
  },
  formCard: {
    backgroundColor: COLOR.formCardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.formCardBorder,
    padding: 28,
    gap: 20,
    width: 480,
  },
  formCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.labelText,
    fontFamily: 'Inter',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.bodyText,
    fontFamily: 'Inter',
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: COLOR.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLOR.bodyText,
    fontFamily: 'Inter',
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.primaryBtnBg,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.primaryBtnText,
    fontFamily: 'Inter',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLOR.borderMid,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLOR.labelText,
    fontFamily: 'Inter',
  },

  // Class Types table columns
  colLoggable: {
    width: 100,
  },
  colMetric: {
    width: 120,
  },
  colClassTypeActions: {
    width: 140,
    alignItems: 'flex-end',
  },
  colClassTypeActionsRow: {
    width: 140,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },

  // Loggable badges
  badgeYes: {
    alignSelf: 'flex-start',
    backgroundColor: COLOR.badgeYesBg,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeYesText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.badgeYesText,
    fontFamily: 'Inter',
  },
  badgeNo: {
    alignSelf: 'flex-start',
    backgroundColor: COLOR.badgeNoBg,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeNoText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.badgeNoText,
    fontFamily: 'Inter',
  },

  // Class type form card (wider than space form: 520)
  classTypeFormCard: {
    backgroundColor: COLOR.formCardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.formCardBorder,
    padding: 28,
    gap: 20,
    width: 520,
  },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLOR.borderMid,
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: COLOR.toggleActiveBg,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLOR.white,
    alignSelf: 'flex-start',
  },
  toggleThumbRight: {
    alignSelf: 'flex-end',
  },

  // Result metric pill selector
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricPill: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLOR.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  metricPillSelected: {
    backgroundColor: COLOR.metricSelectedBg,
    borderColor: COLOR.metricSelectedBg,
  },
  metricPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLOR.metricUnselectedText,
    fontFamily: 'Inter',
  },
  metricPillTextSelected: {
    fontWeight: '600',
    color: COLOR.metricSelectedText,
  },

  // Feedback (loading / error / placeholder)
  feedbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: COLOR.errorText,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLOR.borderMid,
  },
  retryBtnText: {
    fontSize: 14,
    color: COLOR.bodyText,
    fontFamily: 'Inter',
  },
  placeholderText: {
    fontSize: 14,
    color: COLOR.mutedText,
    fontFamily: 'Inter',
  },
});
