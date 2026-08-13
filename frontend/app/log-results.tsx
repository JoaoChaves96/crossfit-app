/*
 * ─── Clean Ink · Log Results (form-heavy athlete screen) ─────────────────────
 * The reference for how Clean Ink handles inputs, selects, and metadata rows on
 * a form surface: hairline-bordered fields that focus to the one crimson accent,
 * muted uppercase micro-labels, selection carried by FilterChips (accent) and a
 * SegmentedToggle for units, and one primary crimson action. Monochrome ground,
 * drawn Ionicons, Hanken Grotesk throughout — no native chrome, no emoji.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { styles, desktopStyles } from './log-results.styles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { DesktopTopNav } from '@/components/DesktopTopNav';
import { SafeScreen } from '@/components/SafeScreen';
import { formatDayMonth } from '@/utils/datetime';
import { components } from '@/types/api.gen';
import { Space, Ink, Accent, Status } from '@/constants/design';
import {
  Text,
  Icon,
  Button,
  SegmentedToggle,
  FilterChips,
} from '@/components/cleanink';

// --- Types from generated schema ---
type ClassScheduleItem = components['schemas']['ClassScheduleItemDto'];
type GetClassScheduleResponse = components['schemas']['GetClassScheduleResponseDto'];
type GetClassProgrammingResponse = components['schemas']['GetClassProgrammingResponseDto'];
type GetMyClassResultResponse = components['schemas']['GetMyClassResultResponseDto'];
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

// Metric-type chip labels are the display text; map back to the type on change.
const METRIC_TYPE_OPTIONS = ALL_METRIC_TYPES.map((t) => METRIC_LABELS[t]);
const METRIC_TYPE_BY_LABEL: Record<string, MetricType> = ALL_METRIC_TYPES.reduce(
  (acc, t) => {
    acc[METRIC_LABELS[t]] = t;
    return acc;
  },
  {} as Record<string, MetricType>,
);

// --- Sub-components ---

function LoadingScreen() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={Accent.base} />
    </View>
  );
}

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <View style={styles.centered}>
      <Text size="body" tone={Status.danger} style={{ textAlign: 'center' }}>
        {message}
      </Text>
      <View style={{ width: 160 }}>
        <Button variant="quiet" label="Go Back" onPress={onBack} />
      </View>
    </View>
  );
}

function ProgrammingSection({ content }: { content: string }) {
  const [collapsed, setCollapsed] = useState(true);
  const preview = content.length > 120 ? content.slice(0, 120) + '…' : content;

  return (
    <View style={styles.card}>
      <Text size="label" weight="semibold" tone={Ink.muted} upper>
        Programming
      </Text>
      <Text size="body" tone={Ink.muted} style={styles.progContent}>
        {collapsed ? preview : content}
      </Text>
      {content.length > 120 && (
        <TouchableOpacity onPress={() => setCollapsed((c) => !c)} activeOpacity={0.7} style={styles.progToggle}>
          <Text size="meta" weight="semibold" tone={Accent.base}>
            {collapsed ? 'Show more' : 'Show less'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// A muted uppercase micro-label for form fields.
function FieldLabel({ children }: { children: string }) {
  return (
    <Text size="label" weight="semibold" tone={Ink.muted} upper>
      {children}
    </Text>
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
      <View style={styles.unitStatic}>
        <Text size="body" weight="semibold" tone={Ink.faint}>
          {units[0] === 'none' ? '' : units[0]}
        </Text>
      </View>
    );
  }

  return (
    <SegmentedToggle<MetricUnit>
      options={units.map((u) => ({ value: u, label: u }))}
      value={selected}
      onChange={onChange}
    />
  );
}

// --- Main screen ---

export default function LogResultsScreen() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { currentGymId, isLoading: gymLoading } = useGym();
  const { isDesktop } = useResponsiveLayout();
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
  const [focusedField, setFocusedField] = useState<'value' | 'notes' | null>(null);

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
          client.get<GetMyClassResultResponse>(
            `/api/gyms/${gymId}/classes/${classId}/results/me`,
          ),
        ]);

        const found = scheduleRes.classes.find((c) => c.id === classId) ?? null;
        setClassData(found);
        setProgramming(programmingRes);

        const myResult = resultsRes.result;
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
  const scheduledDate = classData ? formatDayMonth(classData.scheduledDate) : '';
  const hasProgramming =
    programming !== null && typeof programming.content === 'string' && programming.content.trim() !== '';
  const isLoggable = programming?.loggable ?? true;

  const metricLabel = METRIC_LABELS[metricType];
  const isNoteType = metricType === 'note';
  const btnLabel = isEditMode ? 'UPDATE RESULT' : 'SAVE RESULT';

  // ── Shared form content ────────────────────────────────────────────────────
  const formContent = (
    <>
      {/* Programming section */}
      {hasProgramming && <ProgrammingSection content={programming!.content as string} />}

      {/* Not loggable warning */}
      {!isLoggable && (
        <View style={styles.warningCard}>
          <Icon name="info" size={16} tone={Ink.muted} />
          <Text size="meta" tone={Ink.muted} style={styles.warningText}>
            Result logging is not enabled for this class.
          </Text>
        </View>
      )}

      {/* Form section */}
      <View style={styles.card}>
        <Text size="title" weight="semibold" tracking="snug">
          Your Result
        </Text>

        {/* Edit mode indicator */}
        {isEditMode && (
          <View style={styles.editStateRow}>
            <Icon name="edit" size={14} tone={Ink.faint} />
            <Text size="meta" weight="medium" tone={Ink.faint}>
              Edit state — result already logged
            </Text>
          </View>
        )}

        {/* Metric type selector (only in new result mode) */}
        {!isEditMode && (
          <View style={styles.fieldGroup}>
            <FieldLabel>METRIC TYPE</FieldLabel>
            <FilterChips
              options={METRIC_TYPE_OPTIONS}
              active={METRIC_LABELS[metricType]}
              onChange={(label) => setMetricType(METRIC_TYPE_BY_LABEL[label])}
            />
          </View>
        )}

        {/* Metric value input row */}
        <View style={styles.metricRow}>
          <View style={styles.metricInputWrap}>
            <FieldLabel>{metricLabel}</FieldLabel>
            {isNoteType ? (
              <TextInput
                testID="log-results-value-input"
                style={[
                  styles.input,
                  styles.inputMultiline,
                  focusedField === 'value' && styles.inputFocused,
                ]}
                value={metricValue}
                onChangeText={setMetricValue}
                onFocus={() => setFocusedField('value')}
                onBlur={() => setFocusedField(null)}
                placeholder="Add a note…"
                placeholderTextColor={Ink.faint}
                multiline
                numberOfLines={2}
                autoCapitalize="sentences"
              />
            ) : (
              <TextInput
                testID="log-results-value-input"
                style={[styles.input, focusedField === 'value' && styles.inputFocused]}
                value={metricValue}
                onChangeText={setMetricValue}
                onFocus={() => setFocusedField('value')}
                onBlur={() => setFocusedField(null)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Ink.faint}
              />
            )}
          </View>

          {!isNoteType && (
            <View style={styles.unitColumn}>
              <UnitSelector metricType={metricType} selected={unit} onChange={setUnit} />
            </View>
          )}
        </View>

        {/* Notes field */}
        <View style={styles.notesWrap}>
          <FieldLabel>NOTES (optional)</FieldLabel>
          <TextInput
            style={[
              styles.input,
              styles.inputMultiline,
              focusedField === 'notes' && styles.inputFocused,
            ]}
            value={notes}
            onChangeText={setNotes}
            onFocus={() => setFocusedField('notes')}
            onBlur={() => setFocusedField(null)}
            placeholder="Add a note…"
            placeholderTextColor={Ink.faint}
            multiline
            numberOfLines={3}
            autoCapitalize="sentences"
          />
        </View>

        {/* Submit error */}
        {submitError !== null && (
          <View style={styles.errorCard}>
            <Text testID="log-results-error" size="body" weight="medium" tone={Status.danger}>
              {submitError}
            </Text>
          </View>
        )}
      </View>
    </>
  );

  const saveButton = (
    <View style={isDesktop ? desktopStyles.actionSection : styles.actionSection}>
      <Button
        testID="log-results-save-btn"
        variant="primary"
        label={btnLabel}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!isLoggable || isSubmitting}
      />
    </View>
  );

  // ── Desktop layout ─────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={desktopStyles.screen}>
        <DesktopTopNav />
        <ScrollView
          contentContainerStyle={desktopStyles.contentArea}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={desktopStyles.innerWrap}>
            {/* Back row */}
            <TouchableOpacity style={desktopStyles.backRow} onPress={() => router.back()} activeOpacity={0.7}>
              <Icon name="back" size={20} tone={Ink.strong} />
              <Text size="lead" weight="bold" tracking="tight">
                {classTypeName}
              </Text>
            </TouchableOpacity>

            {/* Subtitle */}
            {scheduledDate !== '' && (
              <View style={styles.subtitleRow}>
                <Icon name="calendar" size={14} tone={Ink.muted} />
                <Text size="meta" tone={Ink.muted}>
                  {scheduledDate}
                </Text>
              </View>
            )}

            {formContent}
            {saveButton}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {/* Header */}
      <SafeScreen style={styles.header} extraTopPadding={Space.md}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="back" size={24} tone={Ink.strong} />
        </TouchableOpacity>
        <Text size="screen" weight="bold" tracking="tight">
          {classTypeName}
        </Text>
      </SafeScreen>

      {/* Subtitle */}
      {scheduledDate !== '' && (
        <View style={styles.subtitleRow}>
          <Icon name="calendar" size={14} tone={Ink.muted} />
          <Text size="meta" tone={Ink.muted}>
            {scheduledDate}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {formContent}
      </ScrollView>

      {saveButton}
    </View>
  );
}
