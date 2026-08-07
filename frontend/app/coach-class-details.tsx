import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { SafeScreen } from '@/components/SafeScreen';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { AppColors, Spacing } from '@/constants/theme';
import { formatDayMonth, formatTimeRange } from '@/utils/datetime';
import { styles, mobileStyles } from './coach-class-details.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

type CoachClassItem = components['schemas']['CoachClassItemDto'];
type AddOrEditProgrammingResponse = components['schemas']['AddOrEditProgrammingResponseDto'];
type GetClassProgrammingResponse = components['schemas']['GetClassProgrammingResponseDto'];

const MOBILE_BREAKPOINT = 768;

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

interface StatusConfig {
  label: string;
  bg: string;
  textColor: string;
}

function getStatusConfig(state: CoachClassItem['state']): StatusConfig {
  switch (state) {
    case 'published':
      return { label: 'Published', bg: AppColors.successBgLight, textColor: AppColors.darkSurface };
    case 'booking_closed':
      return { label: 'Booking Closed', bg: AppColors.warningBgAmber, textColor: AppColors.warningLabel };
    case 'in_progress':
      return { label: 'In Progress', bg: AppColors.badgeBlueBgLight, textColor: AppColors.actionBlueDarker };
    case 'completed':
      return { label: 'Completed', bg: AppColors.borderFaint, textColor: AppColors.errorLabel };
    case 'archived':
      return { label: 'Archived', bg: AppColors.borderFaint, textColor: AppColors.errorLabel };
  }
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const COACH_NAV_ITEMS = [
  { label: 'My Classes', key: 'classes', enabled: true },
  { label: 'Profile', key: 'profile', enabled: false },
] as const;

function Sidebar() {
  return (
    <View style={styles.sidebar}>
      <Text style={styles.sidebarLogo}>CrossFit Manager</Text>
      <View style={styles.navSpacer} />
      <View style={styles.navGroup}>
        {COACH_NAV_ITEMS.map((item) => {
          const isDisabled = !item.enabled;
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.navItem}
              disabled={isDisabled}
              activeOpacity={isDisabled ? 1 : 0.7}>
              <Text
                style={[
                  styles.navLabel,
                  styles.navLabelInactive,
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CoachClassDetailsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentGymId } = useGym();
  const { width } = useWindowDimensions();
  const isMobile = width <= MOBILE_BREAKPOINT;

  const params = useLocalSearchParams<{
    classId: string;
    classTypeName: string;
    scheduledDate: string;
    scheduledTime: string;
    duration: string;
    spaceName: string;
    capacity: string;
    bookedCount: string;
    state: CoachClassItem['state'];
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
  const classState: CoachClassItem['state'] = state ?? 'published';

  // Programming form state — a single `content` string, held verbatim
  // (see DECISIONS.md → "Programming Content Shape").
  const [content, setContent] = useState('');
  const [loggable, setLoggable] = useState(false);
  const [inputHeight, setInputHeight] = useState(PROGRAMMING_INPUT_MIN_HEIGHT);

  // Existing programming fetch state
  const [isProgrammingLoading, setIsProgrammingLoading] = useState(true);
  const [existingProgramming, setExistingProgramming] = useState<GetClassProgrammingResponse | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedProgramming, setSavedProgramming] = useState<AddOrEditProgrammingResponse | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setSuccessMessage(null);

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
      setSuccessMessage('Programming saved successfully.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save programming.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusConfig = getStatusConfig(classState);
  const headerTitle = scheduledDate && scheduledTime
    ? formatHeaderTitle(scheduledDate, scheduledTime)
    : classTypeName ?? 'Class Details';
  const durationMinutes = duration ? parseInt(duration, 10) : 0;
  const formattedDateTime = scheduledDate && scheduledTime
    ? formatDateTime(scheduledDate, scheduledTime, durationMinutes)
    : '—';

  // ─── Mobile Layout ─────────────────────────────────────────────────────────

  if (isMobile) {
    const ms = mobileStyles;
    return (
      <SafeScreen style={ms.root} testID="coach-class-details-screen">
        <KeyboardAvoidingView
          style={ms.keyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={ms.main}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={ms.header}>
              <View style={ms.headerTopRow}>
                <TouchableOpacity
                  style={ms.backBtn}
                  onPress={() => router.back()}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={ms.backBtnText}>{'← Back'}</Text>
                </TouchableOpacity>
                <View style={[ms.statusBadge, { backgroundColor: statusConfig.bg }]}>
                  <Text style={[ms.statusBadgeText, { color: statusConfig.textColor }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              </View>
              <Text style={ms.headerTitle} numberOfLines={2}>{headerTitle}</Text>
            </View>

            {/* Content — stacked */}
            <View style={ms.contentColumn}>
              {/* Info Panel */}
              <View style={ms.infoPanel}>
                <View style={ms.infoGrid}>
                  <View style={ms.infoGridCell}>
                    <Text style={ms.infoGridCellLabel}>CLASS TYPE</Text>
                    <Text style={ms.infoGridCellValue}>{classTypeName ?? '—'}</Text>
                  </View>
                  <View style={ms.infoGridCell}>
                    <Text style={ms.infoGridCellLabel}>DATE &amp; TIME</Text>
                    <Text style={ms.infoGridCellValue}>{formattedDateTime}</Text>
                  </View>
                  <View style={ms.infoGridCell}>
                    <Text style={ms.infoGridCellLabel}>SPACE</Text>
                    <Text style={ms.infoGridCellValue}>{spaceName ?? '—'}</Text>
                  </View>
                  <View style={ms.infoGridCell}>
                    <Text style={ms.infoGridCellLabel}>CAPACITY</Text>
                    <Text style={ms.infoGridCellValue}>{bookedCountNum} / {capacityNum} booked</Text>
                  </View>
                </View>

                <View style={[ms.separator, ms.separatorSpacing]} />

                <Text style={ms.fieldLabel}>BOOKED ATHLETES</Text>
                <View style={ms.bookedRow}>
                  <Text style={ms.bookedRowText}>
                    {bookedCountNum} {bookedCountNum === 1 ? 'athlete' : 'athletes'} booked
                  </Text>
                </View>

                <TouchableOpacity
                  testID="mark-attendance-nav-btn"
                  style={ms.actionBtn}
                  onPress={() => {
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
                  }}
                  activeOpacity={0.8}>
                  <Text style={ms.actionBtnText}>Mark Attendance</Text>
                </TouchableOpacity>
              </View>

              {/* Programming Panel */}
              <View style={ms.progPanel}>
                {/* Programming header row */}
                <View style={ms.progHeader}>
                  <Text style={ms.panelTitle}>WOD Programming</Text>
                  <View style={ms.loggableRow}>
                    <Text style={ms.loggableLabel}>Loggable</Text>
                    <TouchableOpacity
                      style={[
                        ms.toggle,
                        loggable ? ms.toggleOn : ms.toggleOff,
                      ]}
                      onPress={() => setLoggable((prev) => !prev)}
                      activeOpacity={0.8}>
                      <View style={[
                        ms.toggleKnob,
                        loggable ? ms.toggleKnobRight : ms.toggleKnobLeft,
                      ]} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={ms.separator} />

                {/* Saved programming display */}
                {isProgrammingLoading ? (
                  <View style={ms.programmingLoadingContainer}>
                    <ActivityIndicator size="small" color={AppColors.darkTextMuted} />
                  </View>
                ) : savedProgramming !== null ? (
                  <>
                    <Text style={ms.fieldLabel}>PROGRAMMING</Text>
                    <View testID="programming-wod-content" style={ms.wodContent}>
                      <Text style={ms.wodText}>{savedProgramming.content}</Text>
                    </View>
                  </>
                ) : existingProgramming !== null && existingProgramming.content !== null ? (
                  <>
                    <Text style={ms.fieldLabel}>PROGRAMMING</Text>
                    <View testID="programming-wod-content" style={ms.wodContent}>
                      <Text style={ms.wodText}>{existingProgramming.content}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={ms.fieldLabel}>PROGRAMMING</Text>
                    <View style={ms.emptyProgramming}>
                      <Text style={ms.emptyProgrammingText}>No programming added yet.</Text>
                    </View>
                  </>
                )}

                <View style={[ms.separator, ms.separatorSpacing]} />

                {/* Edit Programming Form */}
                <Text style={ms.formTitle}>Edit Programming</Text>

                <Text style={ms.fieldLabel}>PROGRAMMING</Text>
                <TextInput
                  testID="programming-wod-input"
                  style={[
                    ms.textInputLarge,
                    { height: Math.max(PROGRAMMING_INPUT_MIN_HEIGHT, inputHeight) },
                  ]}
                  placeholder="Describe the workout, scaling and any notes…"
                  placeholderTextColor={AppColors.darkTextMuted}
                  value={content}
                  onChangeText={setContent}
                  onContentSizeChange={(e) =>
                    setInputHeight(e.nativeEvent.contentSize.height + Spacing.base)
                  }
                  multiline
                  textAlignVertical="top"
                  editable={!isSubmitting}
                />

                {successMessage !== null && (
                  <View style={ms.successBanner}>
                    <Text style={ms.successText}>{successMessage}</Text>
                  </View>
                )}

                {submitError !== null && (
                  <Text style={ms.errorText}>{submitError}</Text>
                )}

                <TouchableOpacity
                  testID="programming-save-btn"
                  style={[ms.actionBtn, isSubmitting && ms.actionBtnDisabled]}
                  onPress={handleSaveProgramming}
                  disabled={isSubmitting}
                  activeOpacity={0.8}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={AppColors.backgroundWhite} />
                  ) : (
                    <Text style={ms.actionBtnText}>Save Programming</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeScreen>
    );
  }

  // ─── Desktop Layout ────────────────────────────────────────────────────────

  return (
    <View style={styles.root} testID="coach-class-details-screen">
      <Sidebar />

      <View style={styles.main}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.backBtnText}>{'← Back to My Classes'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusConfig.textColor }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Content Row */}
        <View style={styles.contentRow}>
          {/* Info Panel */}
          <View style={styles.infoPanel}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.panelTitle}>Class Info</Text>
              <View style={styles.separator} />

              <Text style={styles.fieldLabel}>CLASS TYPE</Text>
              <Text style={styles.fieldValueBold}>{classTypeName ?? '—'}</Text>

              <Text style={[styles.fieldLabel, styles.fieldLabelSpacing]}>DATE &amp; TIME</Text>
              <Text style={styles.fieldValue}>{formattedDateTime}</Text>

              <Text style={[styles.fieldLabel, styles.fieldLabelSpacing]}>SPACE</Text>
              <Text style={styles.fieldValue}>{spaceName ?? '—'}</Text>

              <Text style={[styles.fieldLabel, styles.fieldLabelSpacing]}>CAPACITY</Text>
              <Text style={styles.fieldValue}>{bookedCountNum} booked / {capacityNum} spots</Text>

              <View style={[styles.separator, styles.separatorSpacing]} />

              <Text style={styles.fieldLabel}>BOOKED ATHLETES</Text>
              <View style={styles.bookedRow}>
                <Text style={styles.bookedRowText}>
                  {bookedCountNum} {bookedCountNum === 1 ? 'athlete' : 'athletes'} booked
                </Text>
              </View>

              <TouchableOpacity
                testID="mark-attendance-nav-btn"
                style={styles.actionBtn}
                onPress={() => {
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
                }}
                activeOpacity={0.8}>
                <Text style={styles.actionBtnText}>Mark Attendance</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Programming Panel */}
          <View style={styles.progPanel}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Programming header row */}
              <View style={styles.progHeader}>
                <Text style={styles.panelTitle}>WOD Programming</Text>
                <View style={styles.loggableRow}>
                  <Text style={styles.loggableLabel}>Loggable</Text>
                  <TouchableOpacity
                    style={[
                      styles.toggle,
                      loggable ? styles.toggleOn : styles.toggleOff,
                    ]}
                    onPress={() => setLoggable((prev) => !prev)}
                    activeOpacity={0.8}>
                    <View style={[
                      styles.toggleKnob,
                      loggable ? styles.toggleKnobRight : styles.toggleKnobLeft,
                    ]} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.separator} />

              {/* Saved programming display */}
              {isProgrammingLoading ? (
                <View style={styles.programmingLoadingContainer}>
                  <ActivityIndicator size="small" color={AppColors.darkTextMuted} />
                </View>
              ) : savedProgramming !== null ? (
                <>
                  <Text style={styles.fieldLabel}>PROGRAMMING</Text>
                  <View testID="programming-wod-content" style={styles.wodContent}>
                    <Text style={styles.wodText}>{savedProgramming.content}</Text>
                  </View>
                </>
              ) : existingProgramming !== null && existingProgramming.content !== null ? (
                <>
                  <Text style={styles.fieldLabel}>PROGRAMMING</Text>
                  <View testID="programming-wod-content" style={styles.wodContent}>
                    <Text style={styles.wodText}>{existingProgramming.content}</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>PROGRAMMING</Text>
                  <View style={styles.emptyProgramming}>
                    <Text style={styles.emptyProgrammingText}>No programming added yet.</Text>
                  </View>
                </>
              )}

              <View style={[styles.separator, styles.separatorSpacing]} />

              {/* Edit Programming Form */}
              <Text style={styles.formTitle}>Edit Programming</Text>

              <Text style={[styles.fieldLabel, styles.fieldLabelSpacing]}>PROGRAMMING</Text>
              <TextInput
                testID="programming-wod-input"
                style={[
                  styles.textInputLarge,
                  { height: Math.max(PROGRAMMING_INPUT_MIN_HEIGHT, inputHeight) },
                ]}
                placeholder="Describe the workout, scaling and any notes…"
                placeholderTextColor={AppColors.darkTextMuted}
                value={content}
                onChangeText={setContent}
                onContentSizeChange={(e) =>
                  setInputHeight(e.nativeEvent.contentSize.height + Spacing.base)
                }
                multiline
                textAlignVertical="top"
                editable={!isSubmitting}
              />

              {successMessage !== null && (
                <View style={styles.successBanner}>
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              )}

              {submitError !== null && (
                <Text style={styles.errorText}>{submitError}</Text>
              )}

              <TouchableOpacity
                testID="programming-save-btn"
                style={[styles.actionBtn, isSubmitting && styles.actionBtnDisabled]}
                onPress={handleSaveProgramming}
                disabled={isSubmitting}
                activeOpacity={0.8}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={AppColors.backgroundWhite} />
                ) : (
                  <Text style={styles.actionBtnText}>Save Programming</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </View>
    </View>
  );
}
