import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SafeScreen } from '@/components/SafeScreen';
import { CoachSidebar } from '@/components/CoachSidebar';
import { Text, Icon, Button, StatusChip } from '@/components/cleanink';
import { Accent, Ground, Ink, Line, Space } from '@/constants/design';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { formatDayMonth, formatTimeRange } from '@/utils/datetime';
import {
  STATE_LABEL,
  STATE_CHIP_TONE,
  isProgrammingEditable,
  type ClassState,
} from './class-management/classStates';
import { styles, mobileStyles } from './coach-class-details.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

type AddOrEditProgrammingResponse = components['schemas']['AddOrEditProgrammingResponseDto'];
type GetClassProgrammingResponse = components['schemas']['GetClassProgrammingResponseDto'];

/** Minimum visible height of the auto-growing programming input, in px. */
const PROGRAMMING_INPUT_MIN_HEIGHT = 140;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(date: string, time: string, duration: number): string {
  return `${formatDayMonth(date)} · ${formatTimeRange(time, duration)}`;
}

function formatHeaderTitle(date: string, time: string): string {
  const d = new Date(`${date}T${time}`);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const dayName = dayNames[d.getDay()];
  const day = d.getDate();
  const month = monthNames[d.getMonth()];
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `WOD — ${dayName} ${day} ${month} · ${hour}:${minute}`;
}

function formatLastUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CoachClassDetailsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentGymId } = useGym();
  const { isMobile } = useResponsiveLayout();

  const params = useLocalSearchParams<{
    classId: string;
    classTypeName: string;
    scheduledDate: string;
    scheduledTime: string;
    duration: string;
    spaceName: string;
    capacity: string;
    bookedCount: string;
    state: ClassState;
  }>();

  const {
    classId,
    classTypeName,
    scheduledDate,
    scheduledTime,
    duration,
    spaceName,
    capacity,
    bookedCount,
    state,
  } = params;

  const capacityNum = capacity ? parseInt(capacity, 10) : 0;
  const bookedCountNum = bookedCount ? parseInt(bookedCount, 10) : 0;
  const classState: ClassState = state ?? 'published';
  const canEditProgramming = isProgrammingEditable(classState);

  // Programming form state — a single `content` string, held verbatim
  // (see DECISIONS.md → "Programming Content Shape").
  const [content, setContent] = useState('');
  const [loggable, setLoggable] = useState(false);
  const [inputHeight, setInputHeight] = useState(PROGRAMMING_INPUT_MIN_HEIGHT);

  // Mobile: keep the programming input AND its Save button clear of the
  // on-screen keyboard. Shared with the owner ProgrammingPanel — see
  // useKeyboardAwareScroll for why measureInWindow is required here.
  const kb = useKeyboardAwareScroll();

  // Existing programming fetch state
  const [isProgrammingLoading, setIsProgrammingLoading] = useState(true);
  const [existingProgramming, setExistingProgramming] = useState<GetClassProgrammingResponse | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedProgramming, setSavedProgramming] = useState<AddOrEditProgrammingResponse | null>(null);
  const [didSave, setDidSave] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !currentGymId || !classId) {
      setIsProgrammingLoading(false);
      return;
    }

    const client = createApiClient({ token });

    client
      .get<GetClassProgrammingResponse>(`/api/gyms/${currentGymId}/classes/${classId}/programming`)
      .then((data) => {
        setExistingProgramming(data);
        setLastUpdatedAt(data.lastUpdatedAt);
        if (data.content !== null) {
          setLoggable(data.loggable);
          setContent(data.content);
        }
      })
      .catch(() => {
        // Non-fatal: leave form empty on fetch failure
      })
      .finally(() => {
        setIsProgrammingLoading(false);
      });
  }, [token, currentGymId, classId]);

  const handleSaveProgramming = async () => {
    if (!token || !currentGymId || !classId) return;

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setSubmitError('Programming cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setDidSave(false);

    try {
      const client = createApiClient({ token });
      const result = await client.post<AddOrEditProgrammingResponse>(
        `/api/gyms/${currentGymId}/classes/${classId}/programming`,
        {
          classId,
          content: trimmedContent,
          loggable,
        },
      );
      setContent(result.content);
      setSavedProgramming(result);
      setLastUpdatedAt(result.lastModifiedAt);
      setDidSave(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save programming.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAttendance = () => {
    router.push({
      pathname: '/coach-mark-attendance',
      params: {
        classId,
        gymId: currentGymId ?? '',
        classTypeName: classTypeName ?? '',
        scheduledDate: scheduledDate ?? '',
        scheduledTime: scheduledTime ?? '',
        state: classState,
        bookedCount: String(bookedCountNum),
      },
    });
  };

  const headerTitle = scheduledDate && scheduledTime
    ? formatHeaderTitle(scheduledDate, scheduledTime)
    : classTypeName ?? 'Class Details';
  const durationMinutes = duration ? parseInt(duration, 10) : 0;
  const formattedDateTime = scheduledDate && scheduledTime
    ? formatDateTime(scheduledDate, scheduledTime, durationMinutes)
    : '—';

  // Resolve the WOD content to display (post-save wins over the fetched value).
  const displayedProgramming = savedProgramming?.content
    ?? (existingProgramming?.content ?? null);

  // ─── Info fields (shared between layouts) ──────────────────────────────────

  const infoItems: { label: string; value: string }[] = [
    { label: 'CLASS TYPE', value: classTypeName ?? '—' },
    { label: 'DATE & TIME', value: formattedDateTime },
    { label: 'SPACE', value: spaceName ?? '—' },
    { label: 'CAPACITY', value: `${bookedCountNum} / ${capacityNum} booked` },
  ];

  // ─── Loggable toggle (shared) ──────────────────────────────────────────────

  // Past the editable states the toggle becomes a read-only chip — there is
  // nothing to save it with, so an interactive switch would be a dead control.
  const loggableToggle = (s: typeof styles | typeof mobileStyles) =>
    canEditProgramming ? (
      <View style={s.loggableRow}>
        <Text size="meta" tone="muted">Loggable</Text>
        <Switch
          value={loggable}
          onValueChange={setLoggable}
          disabled={isSubmitting}
          trackColor={{ false: Line.divider, true: Accent.base }}
          thumbColor={Ground.surface}
          ios_backgroundColor={Line.divider}
          // activeThumbColor is a react-native-web-only prop (absent from
          // core RN Switch types) — keeps the on-state thumb white instead
          // of the web default green.
          {...{ activeThumbColor: Ground.surface }}
        />
      </View>
    ) : (
      <StatusChip tone="neutral" label={loggable ? 'Loggable' : 'Not loggable'} />
    );

  // ─── Programming display + edit form (shared) ──────────────────────────────

  const programmingBody = (s: typeof styles | typeof mobileStyles) => (
    <>
      {isProgrammingLoading ? (
        <View style={s.progFeedback}>
          <ActivityIndicator size="small" color={Ink.muted} />
        </View>
      ) : displayedProgramming !== null ? (
        <View style={s.fieldBlock}>
          <Text size="label" weight="semibold" tone="faint" upper>Programming</Text>
          <View testID="programming-wod-content" style={s.wodContent}>
            <Text size="body">{displayedProgramming}</Text>
          </View>
        </View>
      ) : (
        <View style={s.fieldBlock}>
          <Text size="label" weight="semibold" tone="faint" upper>Programming</Text>
          <View style={s.emptyProgramming}>
            <Text size="body" tone="faint">No programming added yet.</Text>
          </View>
        </View>
      )}

      {/* Edit form — only while the class is still editable. Past that the
          backend rejects the save outright, so no form and no Save is offered;
          the read-only WOD content above is the whole story. */}
      {!canEditProgramming ? (
        <Text testID="programming-locked-notice" size="meta" tone="faint" style={s.lockedNotice}>
          Programming can no longer be edited — this class is {STATE_LABEL[classState].toLowerCase()}.
        </Text>
      ) : (
        <>
          <View style={s.separator} />

          {/* Edit Programming Form. The input, the error banner and the Save
              row are measured as ONE group so the keyboard-follow scroll
              clears the Save button too — clearing only the input leaves it
              under the keyboard's predictive-text strip. */}
          <View ref={kb.keepVisibleRef} collapsable={false} style={s.editGroup}>
            <View style={s.fieldBlock}>
              <Text size="title" weight="semibold">Edit Programming</Text>
              <Text size="label" weight="semibold" tone="faint" upper>Programming</Text>
              <TextInput
                testID="programming-wod-input"
                onFocus={kb.onInputFocus}
                onBlur={kb.onInputBlur}
                style={[
                  s.progInput,
                  { height: Math.max(PROGRAMMING_INPUT_MIN_HEIGHT, inputHeight) },
                ]}
                placeholder="Describe the workout, scaling and any notes…"
                placeholderTextColor={Ink.faint}
                value={content}
                onChangeText={(t) => {
                  setContent(t);
                  if (didSave) setDidSave(false);
                }}
                onContentSizeChange={(e) => {
                  // Track the measured content height verbatim. Padding it out (or
                  // re-measuring the height we just applied) feeds the new height
                  // straight back into contentSize and loops until React aborts
                  // with "Maximum update depth exceeded". The 1px deadband absorbs
                  // sub-pixel jitter from web's fractional scrollHeight.
                  const measured = Math.ceil(e.nativeEvent.contentSize.height);
                  setInputHeight((prev) => (Math.abs(prev - measured) > 1 ? measured : prev));
                  // Growing pushes the caret line down, back under the keyboard —
                  // follow it. Unanimated so the scroll keeps pace with typing.
                  kb.scrollFocusedIntoView(false);
                }}
                multiline
                textAlignVertical="top"
                editable={!isSubmitting}
              />
            </View>

            {submitError !== null && (
              <View style={s.errorBanner}>
                <Text size="meta" tone="strong">{submitError}</Text>
              </View>
            )}

            <View style={s.progFooter}>
              {didSave ? (
                <Text size="meta" tone="muted">Saved</Text>
              ) : lastUpdatedAt ? (
                <Text size="meta" tone="faint">Updated {formatLastUpdated(lastUpdatedAt)}</Text>
              ) : (
                <View />
              )}
              <View style={s.saveWrap}>
                <Button
                  testID="programming-save-btn"
                  label="Save Programming"
                  variant="primary"
                  loading={isSubmitting}
                  onPress={handleSaveProgramming}
                />
              </View>
            </View>
          </View>
        </>
      )}
    </>
  );

  // ─── Mobile Layout ─────────────────────────────────────────────────────────

  if (isMobile) {
    const ms = mobileStyles;
    return (
      <SafeScreen style={ms.root} testID="coach-class-details-screen">
          {/* Keyboard handling (inset, focus-follow, auto-grow-follow) all comes
              from useKeyboardAwareScroll — see that hook for the details. */}
          <ScrollView
            ref={kb.scrollRef}
            style={ms.main}
            contentContainerStyle={[ms.scrollContent, kb.contentInsetStyle]}
            showsVerticalScrollIndicator={false}
            {...kb.scrollViewProps}>
            {/* Header */}
            <View style={ms.header}>
              <View style={ms.headerTopRow}>
                <Pressable
                  style={ms.backBtn}
                  onPress={() => router.back()}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="back" size={18} tone="muted" />
                  <Text size="body" tone="muted">Back</Text>
                </Pressable>
                <StatusChip tone={STATE_CHIP_TONE[classState]} label={STATE_LABEL[classState]} />
              </View>
              <Text size="lead" weight="bold" numberOfLines={2}>{headerTitle}</Text>
            </View>

            {/* Content — stacked */}
            <View style={ms.contentColumn}>
              {/* Info Panel */}
              <View style={ms.infoPanel}>
                <View style={ms.infoGrid}>
                  {infoItems.map((item) => (
                    <View key={item.label} style={ms.infoGridCell}>
                      <Text size="label" weight="semibold" tone="faint" upper>{item.label}</Text>
                      <Text size="body" weight="medium">{item.value}</Text>
                    </View>
                  ))}
                </View>

                <View style={ms.separator} />

                <View style={ms.fieldBlock}>
                  <Text size="label" weight="semibold" tone="faint" upper>Booked Athletes</Text>
                  <View style={ms.bookedRow}>
                    <Text size="body" tone="muted">
                      {bookedCountNum} {bookedCountNum === 1 ? 'athlete' : 'athletes'} booked
                    </Text>
                  </View>
                </View>

                <Button
                  testID="mark-attendance-nav-btn"
                  label="Mark Attendance"
                  variant="quiet"
                  onPress={handleMarkAttendance}
                />
              </View>

              {/* Programming Panel */}
              <View style={ms.progPanel}>
                <View style={ms.progHeader}>
                  <Text size="title" weight="semibold">WOD Programming</Text>
                  {loggableToggle(ms)}
                </View>
                <View style={ms.separator} />
                {programmingBody(ms)}
              </View>
            </View>
          </ScrollView>
      </SafeScreen>
    );
  }

  // ─── Desktop Layout ────────────────────────────────────────────────────────

  return (
    <View style={styles.root} testID="coach-class-details-screen">
      <CoachSidebar activeItem="classes" />

      <View style={styles.main}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="back" size={18} tone="muted" />
            <Text size="meta" tone="muted">Back to My Classes</Text>
          </Pressable>
          <Text size="screen" weight="bold" style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
          <StatusChip tone={STATE_CHIP_TONE[classState]} label={STATE_LABEL[classState]} />
        </View>

        {/* Content Row */}
        <View style={styles.contentRow}>
          {/* Info Panel */}
          <View style={styles.infoPanel}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: Space.base }}>
              <Text size="title" weight="semibold">Class Info</Text>
              <View style={styles.separator} />

              {infoItems.map((item) => (
                <View key={item.label} style={styles.fieldBlock}>
                  <Text size="label" weight="semibold" tone="faint" upper>{item.label}</Text>
                  <Text size="body" weight="medium">{item.value}</Text>
                </View>
              ))}

              <View style={styles.separator} />

              <View style={styles.fieldBlock}>
                <Text size="label" weight="semibold" tone="faint" upper>Booked Athletes</Text>
                <View style={styles.bookedRow}>
                  <Text size="body" tone="muted">
                    {bookedCountNum} {bookedCountNum === 1 ? 'athlete' : 'athletes'} booked
                  </Text>
                </View>
              </View>

              <Button
                testID="mark-attendance-nav-btn"
                label="Mark Attendance"
                variant="quiet"
                onPress={handleMarkAttendance}
              />
            </ScrollView>
          </View>

          {/* Programming Panel */}
          <View style={styles.progPanel}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: Space.base }}>
              <View style={styles.progHeader}>
                <Text size="title" weight="semibold">WOD Programming</Text>
                {loggableToggle(styles)}
              </View>
              <View style={styles.separator} />
              {programmingBody(styles)}
            </ScrollView>
          </View>
        </View>
      </View>
    </View>
  );
}
