import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.black,
  },

  // Subtitle row
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  subtitleText: {
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.xs,
    fontWeight: '400' as const,
    color: COLORS.fontSecondary,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },

  // Programming
  progSection: {
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionLabel: {
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.fontPrimary,
  },
  progContent: {
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.sm,
    fontWeight: '400' as const,
    color: '#444444',
    lineHeight: FONT_SIZES.sm * 1.4,
  },
  progToggle: {
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.accent,
    marginTop: 4,
  },

  // Warning
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.accentLight,
    borderRadius: 8,
  },
  warningText: {
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.xs,
    fontWeight: '400' as const,
    color: COLORS.fontSecondary,
    flex: 1,
  },

  // Form section
  formSection: {
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  formTitle: {
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.fontPrimary,
  },

  // Edit state indicator
  editStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editStateLabel: {
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    color: COLORS.fontTertiary,
  },

  // Field group
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.fontSecondary,
    letterSpacing: 0.5,
  },

  // Metric type selector chips
  metricTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricTypeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.accentLight,
  },
  metricTypeChipSelected: {
    backgroundColor: COLORS.accent,
  },
  metricTypeChipText: {
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.fontSecondary,
  },
  metricTypeChipTextSelected: {
    color: COLORS.white,
  },

  // Metric row (input + unit)
  metricRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  metricInputWrap: {
    flex: 1,
    gap: 6,
  },
  metricInput: {
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.fontPrimary,
  },
  metricInputActive: {
    borderWidth: 2,
    borderColor: COLORS.fontPrimary,
  },

  // Unit selector
  unitWrap: {
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitText: {
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.accent,
  },
  unitSelectorRow: {
    flexDirection: 'column',
    gap: 4,
  },
  unitChip: {
    height: 22,
    borderRadius: 6,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitChipSelected: {
    backgroundColor: COLORS.accent,
  },
  unitChipText: {
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.fontSecondary,
  },
  unitChipTextSelected: {
    color: COLORS.white,
  },

  // Notes
  notesWrap: {
    gap: 6,
  },
  notesInput: {
    minHeight: 72,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.base,
    fontWeight: '400' as const,
    color: COLORS.fontPrimary,
    textAlignVertical: 'top',
  },

  // Error card
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
    borderRadius: 6,
    padding: 12,
  },
  errorCardText: {
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.errorText,
  },

  // Action section
  actionSection: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  saveBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },

  // Error screen
  errorText: {
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.lg,
    color: COLORS.errorText,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorBackBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: COLORS.divider,
  },
  errorBackBtnText: {
    fontFamily: 'Inter',
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.black,
  },
});
