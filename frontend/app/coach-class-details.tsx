import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { AppColors } from '@/constants/theme';
import { styles } from './coach-class-details.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

type CoachClassItem = components['schemas']['CoachClassItemDto'];
type AddOrEditProgrammingResponse = components['schemas']['AddOrEditProgrammingResponseDto'];
type GetClassProgrammingResponse = components['schemas']['GetClassProgrammingResponseDto'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(date: string, time: string): string {
  const d = new Date(`${date}T${time}`);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const dayName = dayNames[d.getDay()];
  const day = d.getDate();
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${dayName}, ${day} ${month} ${year} · ${hour}:${minute}`;
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

  const params = useLocalSearchParams<{
    classId: string;
    classTypeName: string;
    scheduledDate: string;
    scheduledTime: string;
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
    spaceName,
    capacity,
    bookedCount,
    state,
  } = params;

  const capacityNum = capacity ? parseInt(capacity, 10) : 0;
  const bookedCountNum = bookedCount ? parseInt(bookedCount, 10) : 0;
  const classState: CoachClassItem['state'] = state ?? 'published';

  // Programming form state
  const [wodContent, setWodContent] = useState('');
  const [notesContent, setNotesContent] = useState('');
  const [loggable, setLoggable] = useState(false);

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
          const notesMarker = '\n\nNotes:\n';
          const notesIndex = data.content.indexOf(notesMarker);
          if (notesIndex !== -1) {
            setWodContent(data.content.slice(0, notesIndex));
            setNotesContent(data.content.slice(notesIndex + notesMarker.length));
          } else {
            setWodContent(data.content);
          }
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

    const trimmedWod = wodContent.trim();
    if (!trimmedWod) {
      setSubmitError('Workout details are required.');
      return;
    }

    const combinedContent = notesContent.trim()
      ? `${trimmedWod}\n\nNotes:\n${notesContent.trim()}`
      : trimmedWod;

    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      const client = createApiClient({ token });
      const result = await client.post<AddOrEditProgrammingResponse>(
        `/api/gyms/${currentGymId}/classes/${classId}/programming`,
        {
          classId,
          content: combinedContent,
          loggable,
        },
      );
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
  const formattedDateTime = scheduledDate && scheduledTime
    ? formatDateTime(scheduledDate, scheduledTime)
    : '—';

  return (
    <View style={styles.root} testID="coach-class-details-screen">
      <Sidebar />

      <View style={styles.main}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
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
                <Text style={styles.bookedRowText}>{bookedCountNum} athletes booked</Text>
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
                  <Text style={styles.fieldLabel}>WORKOUT DETAILS</Text>
                  <View testID="programming-wod-content" style={styles.wodContent}>
                    <Text style={styles.wodText}>{savedProgramming.content}</Text>
                  </View>
                </>
              ) : existingProgramming !== null && existingProgramming.content !== null ? (
                <>
                  <Text style={styles.fieldLabel}>WORKOUT DETAILS</Text>
                  <View testID="programming-wod-content" style={styles.wodContent}>
                    <Text style={styles.wodText}>{existingProgramming.content}</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>WORKOUT DETAILS</Text>
                  <View style={styles.emptyProgramming}>
                    <Text style={styles.emptyProgrammingText}>No programming added yet.</Text>
                  </View>
                </>
              )}

              <View style={[styles.separator, styles.separatorSpacing]} />

              {/* Edit Programming Form */}
              <Text style={styles.formTitle}>Edit Programming</Text>

              <Text style={[styles.fieldLabel, styles.fieldLabelSpacing]}>WORKOUT DETAILS</Text>
              <TextInput
                testID="programming-wod-input"
                style={styles.textInputLarge}
                placeholder="Describe the workout…"
                placeholderTextColor={AppColors.darkTextMuted}
                value={wodContent}
                onChangeText={setWodContent}
                multiline
                textAlignVertical="top"
              />

              <Text style={[styles.fieldLabel, styles.fieldLabelSpacing]}>NOTES</Text>
              <TextInput
                testID="programming-notes-input"
                style={styles.textInputSmall}
                placeholder="Add notes or scaling instructions…"
                placeholderTextColor={AppColors.darkTextMuted}
                value={notesContent}
                onChangeText={setNotesContent}
                multiline
                textAlignVertical="top"
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
