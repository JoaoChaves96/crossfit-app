import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { styles } from './log-results.styles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';

// --- Design tokens ---
const COLORS = {
  bg: '#FFFFFF',
  fontPrimary: '#1A1A1A',
  fontSecondary: '#666666',
  fontTertiary: '#999999',
  border: '#E0E0E0',
  divider: '#E5E5E5',
  accent: '#333333',
  accentLight: '#F0F0F0',
  black: '#000000',
  white: '#FFFFFF',
  danger: '#D32F2F',
  errorBg: '#FFEBEE',
  errorText: '#C62828',
} as const;

const FONT_SIZES = {
  xs: 12,
  sm: 13,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
} as const;

// --- Types from generated schema ---
type ClassScheduleItem = components['schemas']['ClassScheduleItemDto'];
type GetClassScheduleResponse = components['schemas']['GetClassScheduleResponseDto'];
type GetClassProgrammingResponse = components['schemas']['GetClassProgrammingResponseDto'];
type GetClassResultsResponse = components['schemas']['GetClassResultsResponseDto'];
type ClassResultItem = components['schemas']['ClassResultItemDto'];
type LogResultDto = components['schemas']['LogResultDto'];
type LogResultResponse = components['schemas']['LogResultResponseDto'];
type EditResultResponse = components['schemas']['EditResultResponseDto'];

type MetricType = LogResultDto['metricType'];
type MetricUnit = LogResultDto['unit'];

// --- Constants ---
const METRIC_LABELS: Record<MetricType, string> = {
  time: 'TIME',
  reps: 'REPS',
  weight: 'WEIGHT',
  rounds: 'ROUNDS',
  note: 'NOTE',
};

const METRIC_UNITS: Record<MetricType, MetricUnit[]> = {
  time: ['seconds', 'minutes'],
  reps: ['reps'],
  weight: ['kg', 'lb'],
  rounds: ['rounds'],
  note: ['none'],
};

const DEFAULT_UNIT: Record<MetricType, MetricUnit> = {
  time: 'seconds',
  reps: 'reps',
  weight: 'kg',
  rounds: 'rounds',
  note: 'none',
};

const ALL_METRIC_TYPES: MetricType[] = ['time', 'reps', 'weight', 'rounds', 'note'];

// --- Sub-components ---

function LoadingScreen() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={COLORS.accent} />
    </View>
  );
}

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity style={styles.errorBackBtn} onPress={onBack}>
        <Text style={styles.errorBackBtnText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function ProgrammingSection({ content }: { content: string }) {
  const [collapsed, setCollapsed] = useState(true);
  const preview = content.length > 120 ? content.slice(0, 120) + '…' : content;

  return (
    <View style={styles.progSection}>
      <Text style={styles.sectionLabel}>Programming</Text>
      <Text style={styles.progContent}>{collapsed ? preview : content}</Text>
      {content.length > 120 && (
        <TouchableOpacity onPress={() => setCollapsed((c) => !c)} activeOpacity={0.7}>
          <Text style={styles.progToggle}>{collapsed ? 'Show more' : 'Show less'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function MetricTypeSelector({
  selected,
  onChange,
}: {
  selected: MetricType;
  onChange: (type: MetricType) => void;
}) {
  return (
    <View style={styles.metricTypeRow}>
      {ALL_METRIC_TYPES.map((type) => (
        <TouchableOpacity
          key={type}
          style={[
            styles.metricTypeChip,
            selected === type && styles.metricTypeChipSelected,
          ]}
          onPress={() => onChange(type)}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.metricTypeChipText,
              selected === type && styles.metricTypeChipTextSelected,
            ]}
          >
            {type.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function UnitSelector({
  metricType,
  selected,
  onChange,
}: {
  metricType: MetricType;
  selected: MetricUnit;
  onChange: (unit: MetricUnit) => void;
}) {
  const units = METRIC_UNITS[metricType];
  if (units.length <= 1) {
    return (
      <View style={styles.unitWrap}>
        <Text style={styles.unitText}>{units[0] === 'none' ? '' : units[0]}</Text>
      </View>
    );
  }

  return (
    <View style={styles.unitSelectorRow}>
      {units.map((unit) => (
        <TouchableOpacity
          key={unit}
          style={[
            styles.unitChip,
            selected === unit && styles.unitChipSelected,
          ]}
          onPress={() => onChange(unit)}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.unitChipText,
              selected === unit && styles.unitChipTextSelected,
            ]}
          >
            {unit}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// --- Main screen ---

export default function LogResultsScreen() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { currentGymId, isLoading: gymLoading } = useGym();
  const params = useLocalSearchParams<{ classId: string; gymId: string }>();
  const classId = params.classId;
  const gymId = params.gymId ?? currentGymId ?? '';

  // Fetch state
  const [classData, setClassData] = useState<ClassScheduleItem | null>(null);
  const [programming, setProgramming] = useState<GetClassProgrammingResponse | null>(null);
  const [existingResult, setExistingResult] = useState<ClassResultItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form state
  const [metricType, setMetricType] = useState<MetricType>('time');
  const [metricValue, setMetricValue] = useState('');
  const [unit, setUnit] = useState<MetricUnit>('seconds');
  const [notes, setNotes] = useState('');

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditMode = existingResult !== null;

  useEffect(() => {
    if (authLoading || gymLoading || !token || !gymId || !classId) {
      if (!authLoading && !gymLoading) {
        setIsLoading(false);
      }
      return;
    }

    const client = createApiClient({ token });

    const load = async () => {
      setIsLoading(true);
      setFetchError(null);

      try {
        const [scheduleRes, programmingRes, resultsRes] = await Promise.all([
          client.get<GetClassScheduleResponse>(`/api/gyms/${gymId}/classes`),
          client.get<GetClassProgrammingResponse>(
            `/api/gyms/${gymId}/classes/${classId}/programming`,
          ),
          client.get<GetClassResultsResponse>(
            `/api/gyms/${gymId}/classes/${classId}/results`,
          ),
        ]);

        const found = scheduleRes.classes.find((c) => c.id === classId) ?? null;
        setClassData(found);
        setProgramming(programmingRes);

        const myResult = resultsRes.results.length > 0 ? resultsRes.results[0] : null;
        if (myResult !== null) {
          setExistingResult(myResult);
          setMetricType(myResult.metricType);
          setMetricValue(myResult.value);
          setUnit(myResult.unit);
          setNotes(typeof myResult.notes === 'string' ? myResult.notes : '');
        }
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Failed to load class data');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [authLoading, gymLoading, token, gymId, classId]);

  // Reset unit when metric type changes
  useEffect(() => {
    setUnit(DEFAULT_UNIT[metricType]);
  }, [metricType]);

  const handleSubmit = async () => {
    if (!token || !gymId || !classId) return;

    const trimmedValue = metricValue.trim();
    if (metricType !== 'note' && trimmedValue === '') {
      setSubmitError('Please enter a value for your result.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const client = createApiClient({ token });

      if (isEditMode && existingResult !== null) {
        const body: components['schemas']['EditResultDto'] = {
          resultId: existingResult.id,
          metricType,
          value: trimmedValue,
          unit,
          ...(notes.trim() !== '' ? { notes: notes.trim() } : {}),
        };
        await client.patch<EditResultResponse>(
          `/api/gyms/${gymId}/classes/results/${existingResult.id}`,
          body as unknown as Record<string, unknown>,
        );
      } else {
        const body: LogResultDto = {
          classId,
          metricType,
          value: trimmedValue,
          unit,
          ...(notes.trim() !== '' ? { notes: notes.trim() } : {}),
        };
        await client.post<LogResultResponse>(
          `/api/gyms/${gymId}/classes/${classId}/results`,
          body as unknown as Record<string, unknown>,
        );
      }

      router.back();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit result');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingScreen />;

  if (fetchError !== null) {
    return <ErrorScreen message={fetchError} onBack={() => router.back()} />;
  }

  const classTypeName = classData?.classTypeName ?? 'Class';
  const scheduledDate = classData
    ? `${classData.scheduledDate} · ${classData.scheduledTime}`
    : '';
  const hasProgramming =
    programming !== null && typeof programming.content === 'string' && programming.content.trim() !== '';
  const isLoggable = programming?.loggable ?? true;

  const metricLabel = METRIC_LABELS[metricType];
  const isNoteType = metricType === 'note';
  const btnLabel = isEditMode ? 'UPDATE RESULT' : 'SAVE RESULT';

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{classTypeName}</Text>
      </View>

      {/* Subtitle */}
      {scheduledDate !== '' && (
        <View style={styles.subtitleRow}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.fontSecondary} />
          <Text style={styles.subtitleText}>{scheduledDate}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Programming section */}
        {hasProgramming && (
          <>
            <ProgrammingSection content={programming!.content as string} />
            <Divider />
          </>
        )}

        {/* Not loggable warning */}
        {!isLoggable && (
          <View style={styles.warningCard}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.fontSecondary} />
            <Text style={styles.warningText}>
              Result logging is not enabled for this class.
            </Text>
          </View>
        )}

        {/* Form section */}
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Your Result</Text>

          {/* Edit mode indicator */}
          {isEditMode && (
            <View style={styles.editStateRow}>
              <Ionicons name="pencil-outline" size={14} color={COLORS.fontTertiary} />
              <Text style={styles.editStateLabel}>Edit state — result already logged</Text>
            </View>
          )}

          {/* Metric type selector (only in new result mode) */}
          {!isEditMode && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>METRIC TYPE</Text>
              <MetricTypeSelector selected={metricType} onChange={setMetricType} />
            </View>
          )}

          {/* Metric value input row */}
          <View style={styles.metricRow}>
            <View style={styles.metricInputWrap}>
              <Text style={styles.fieldLabel}>{metricLabel}</Text>
              {isNoteType ? (
                <TextInput
                  testID="log-results-value-input"
                  style={[styles.metricInput, isEditMode && styles.metricInputActive]}
                  value={metricValue}
                  onChangeText={setMetricValue}
                  placeholder="Add a note…"
                  placeholderTextColor={COLORS.fontTertiary}
                  multiline
                  numberOfLines={2}
                  autoCapitalize="sentences"
                />
              ) : (
                <TextInput
                  testID="log-results-value-input"
                  style={[styles.metricInput, isEditMode && styles.metricInputActive]}
                  value={metricValue}
                  onChangeText={setMetricValue}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={COLORS.fontTertiary}
                />
              )}
            </View>

            {!isNoteType && (
              <UnitSelector
                metricType={metricType}
                selected={unit}
                onChange={setUnit}
              />
            )}
          </View>

          {/* Notes field */}
          <View style={styles.notesWrap}>
            <Text style={styles.fieldLabel}>NOTES (optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a note…"
              placeholderTextColor={COLORS.fontTertiary}
              multiline
              numberOfLines={3}
              autoCapitalize="sentences"
            />
          </View>

          {/* Submit error */}
          {submitError !== null && (
            <View style={styles.errorCard}>
              <Text style={styles.errorCardText}>{submitError}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action button */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          testID="log-results-save-btn"
          style={[styles.saveBtn, (!isLoggable || isSubmitting) && styles.saveBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isLoggable || isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>{btnLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

