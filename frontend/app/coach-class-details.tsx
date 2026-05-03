import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
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

// ─── Types ────────────────────────────────────────────────────────────────────

type CoachClassItem = components['schemas']['CoachClassItemDto'];
type AddOrEditProgrammingResponse = components['schemas']['AddOrEditProgrammingResponseDto'];
type GetClassProgrammingResponse = components['schemas']['GetClassProgrammingResponseDto'];

// ─── Design Tokens ────────────────────────────────────────────────────────────

const COLOR = {
  rootBg: '#F2F3F5',
  white: '#FFFFFF',

  sidebarBg: '#1E1E2D',
  sidebarLogoText: '#FFFFFF',
  navActiveItemBg: '#2D2D42',
  navActiveText: '#FFFFFF',
  navInactiveText: '#8888A0',

  titleText: '#1A1A2E',
  bodyText: '#1A1A2E',
  secondaryText: '#555568',
  mutedText: '#8888A0',
  darkBodyText: '#333345',

  cardBg: '#FFFFFF',
  cardBorder: '#E4E4EA',
  separator: '#E4E4EA',

  infoFieldBg: '#F2F3F5',
  inputBg: '#FFFFFF',
  inputBorder: '#E4E4EA',
  placeholderText: '#8888A0',

  actionBtnBg: '#1A1A2E',
  actionBtnText: '#FFFFFF',

  backBtnBg: '#FFFFFF',
  backBtnBorder: '#E4E4EA',
  backBtnText: '#555568',

  statusPublishedBg: '#D4EDDA',
  statusPublishedText: '#1A1A2E',
  statusBookingClosedBg: '#FFF3CD',
  statusBookingClosedText: '#856404',
  statusInProgressBg: '#CCE5FF',
  statusInProgressText: '#004085',
  statusCompletedBg: '#E2E3E5',
  statusCompletedText: '#383D41',

  errorText: '#DC2626',
  successBg: '#D4EDDA',
  successText: '#155724',

  toggleOnBg: '#1A1A2E',
  toggleKnob: '#FFFFFF',

  borderMid: '#D1D5DB',
};

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
      return { label: 'Published', bg: COLOR.statusPublishedBg, textColor: COLOR.statusPublishedText };
    case 'booking_closed':
      return { label: 'Booking Closed', bg: COLOR.statusBookingClosedBg, textColor: COLOR.statusBookingClosedText };
    case 'in_progress':
      return { label: 'In Progress', bg: COLOR.statusInProgressBg, textColor: COLOR.statusInProgressText };
    case 'completed':
      return { label: 'Completed', bg: COLOR.statusCompletedBg, textColor: COLOR.statusCompletedText };
    case 'archived':
      return { label: 'Archived', bg: COLOR.statusCompletedBg, textColor: COLOR.statusCompletedText };
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
    <View style={styles.root}>
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
                  <ActivityIndicator size="small" color={COLOR.mutedText} />
                </View>
              ) : savedProgramming !== null ? (
                <>
                  <Text style={styles.fieldLabel}>WORKOUT DETAILS</Text>
                  <View style={styles.wodContent}>
                    <Text style={styles.wodText}>{savedProgramming.content}</Text>
                  </View>
                </>
              ) : existingProgramming !== null && existingProgramming.content !== null ? (
                <>
                  <Text style={styles.fieldLabel}>WORKOUT DETAILS</Text>
                  <View style={styles.wodContent}>
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
                style={styles.textInputLarge}
                placeholder="Describe the workout…"
                placeholderTextColor={COLOR.placeholderText}
                value={wodContent}
                onChangeText={setWodContent}
                multiline
                textAlignVertical="top"
              />

              <Text style={[styles.fieldLabel, styles.fieldLabelSpacing]}>NOTES</Text>
              <TextInput
                style={styles.textInputSmall}
                placeholder="Add notes or scaling instructions…"
                placeholderTextColor={COLOR.placeholderText}
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
                style={[styles.actionBtn, isSubmitting && styles.actionBtnDisabled]}
                onPress={handleSaveProgramming}
                disabled={isSubmitting}
                activeOpacity={0.8}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={COLOR.actionBtnText} />
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLOR.rootBg,
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
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.sidebarLogoText,
    letterSpacing: 0.5,
  },
  navSpacer: {
    height: 24,
  },
  navGroup: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    height: 40,
  },
  navLabel: {
    fontSize: 14,
  },
  navLabelInactive: {
    fontWeight: '400',
    color: COLOR.navInactiveText,
  },

  // Main area
  main: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 24,
    gap: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: COLOR.backBtnBg,
    borderWidth: 1,
    borderColor: COLOR.backBtnBorder,
  },
  backBtnText: {
    fontSize: 13,
    color: COLOR.backBtnText,
    fontWeight: '400',
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: COLOR.titleText,
    textAlign: 'center',
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Content row
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },

  // Info panel
  infoPanel: {
    width: 320,
    backgroundColor: COLOR.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLOR.cardBorder,
    padding: 24,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.titleText,
    marginBottom: 16,
  },
  separator: {
    height: 1,
    backgroundColor: COLOR.separator,
  },
  separatorSpacing: {
    marginTop: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLOR.mutedText,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 16,
  },
  fieldLabelSpacing: {
    marginTop: 16,
  },
  fieldValueBold: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.titleText,
    marginTop: 4,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '400',
    color: COLOR.secondaryText,
    marginTop: 4,
  },
  bookedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLOR.infoFieldBg,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  bookedRowText: {
    fontSize: 13,
    color: COLOR.darkBodyText,
  },
  actionBtn: {
    backgroundColor: COLOR.actionBtnBg,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.actionBtnText,
  },

  // Programming panel
  progPanel: {
    flex: 1,
    backgroundColor: COLOR.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLOR.cardBorder,
    padding: 24,
  },
  progHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  loggableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loggableLabel: {
    fontSize: 13,
    color: COLOR.mutedText,
    fontWeight: '400',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: COLOR.toggleOnBg,
    alignItems: 'flex-end',
  },
  toggleOff: {
    backgroundColor: COLOR.mutedText,
    alignItems: 'flex-start',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLOR.toggleKnob,
  },
  toggleKnobRight: {},
  toggleKnobLeft: {},

  // Programming loading
  programmingLoadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // WOD display
  wodContent: {
    backgroundColor: COLOR.infoFieldBg,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  wodText: {
    fontSize: 14,
    color: COLOR.darkBodyText,
    lineHeight: 22,
  },
  emptyProgramming: {
    backgroundColor: COLOR.infoFieldBg,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  emptyProgrammingText: {
    fontSize: 14,
    color: COLOR.mutedText,
    fontStyle: 'italic',
  },

  // Form
  formTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.titleText,
    marginTop: 16,
  },
  textInputLarge: {
    height: 80,
    backgroundColor: COLOR.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR.inputBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: COLOR.darkBodyText,
    marginTop: 8,
  },
  textInputSmall: {
    height: 56,
    backgroundColor: COLOR.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR.inputBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: COLOR.darkBodyText,
    marginTop: 8,
  },

  // Success / error
  successBanner: {
    backgroundColor: COLOR.successBg,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
  },
  successText: {
    fontSize: 13,
    color: COLOR.successText,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 13,
    color: COLOR.errorText,
    marginTop: 12,
  },
});
