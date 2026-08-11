import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SafeScreen } from '@/components/SafeScreen';
import { CoachSidebar } from '@/components/CoachSidebar';
import { Text, Icon, StatusChip, Button } from '@/components/cleanink';
import { Ink, Space, Status } from '@/constants/design';
import { ApiError, createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { STATE_LABEL, STATE_CHIP_TONE, type ClassState } from './class-management/classStates';
import { styles, mobileStyles } from './coach-mark-attendance.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

type MarkAttendanceDto = components['schemas']['MarkAttendanceDto'];
type MarkAttendanceResponse = components['schemas']['MarkAttendanceResponseDto'];
type AttendanceRecordDto = components['schemas']['AttendanceRecordDto'];
type ClassBookingItem = components['schemas']['ClassBookingItemDto'];
type GetClassBookingsResponse = components['schemas']['GetClassBookingsResponseDto'];

interface AthleteSlot {
  athleteUserId: string;
  label: string;
  present: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Everyone starts marked present — a deliberate earlier UX decision. */
function buildSlotsFromBookings(bookings: ClassBookingItem[]): AthleteSlot[] {
  return bookings.map((b) => ({
    athleteUserId: b.athleteUserId,
    label: b.displayName,
    present: true,
  }));
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDateTime(date: string, time: string): string {
  const d = new Date(`${date}T${time}`);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const dayName = dayNames[d.getDay()];
  const day = d.getDate();
  const month = monthNames[d.getMonth()];
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${dayName} ${day} ${month} · ${hour}:${minute}`;
}

// ─── Stat Card (desktop) ────────────────────────────────────────────────────
// Monochrome: a prominent ink count over a quiet uppercase caption. No color
// per stat — structure comes from the hairline card and tonal ground.

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text size="lead" weight="bold" tone="strong">{value}</Text>
      <Text size="label" weight="semibold" tone="faint" upper>{label}</Text>
    </View>
  );
}

// ─── Present/Absent Toggle ────────────────────────────────────────────────────
// A two-state per-row control. Selection reads through elevation + weight, not
// color: Present is the affirmative default (lifted white surface + check),
// Absent is the deliberate deviation (quiet sunken ground).

interface AttendanceToggleProps {
  slot: AthleteSlot;
  onToggle: (athleteUserId: string, present: boolean) => void;
  mobile?: boolean;
}

function AttendanceToggle({ slot, onToggle, mobile }: AttendanceToggleProps) {
  const s = mobile ? mobileStyles : styles;
  return (
    <Pressable
      testID={`athlete-toggle-btn-${slot.athleteUserId}`}
      style={[s.toggleBtn, slot.present ? s.toggleBtnPresent : s.toggleBtnAbsent]}
      onPress={() => onToggle(slot.athleteUserId, !slot.present)}>
      <Icon
        name={slot.present ? 'check' : 'close'}
        size={16}
        tone={slot.present ? 'strong' : 'faint'}
      />
      <Text
        size={mobile ? 'body' : 'meta'}
        weight={slot.present ? 'semibold' : 'medium'}
        tone={slot.present ? 'strong' : 'faint'}>
        {slot.present ? 'Present' : 'Absent'}
      </Text>
    </Pressable>
  );
}

// ─── Athlete Row (desktop) ───────────────────────────────────────────────────

interface AthleteRowProps {
  slot: AthleteSlot;
  onToggle: (athleteUserId: string, present: boolean) => void;
}

function AthleteRow({ slot, onToggle }: AthleteRowProps) {
  return (
    <View style={styles.tableRow}>
      <View style={styles.colAthlete}>
        <View style={styles.avatar}>
          <Text size="label" weight="semibold" tone="muted">{getInitials(slot.label)}</Text>
        </View>
        <Text size="meta">{slot.label}</Text>
      </View>
      <View style={styles.colStatus}>
        <AttendanceToggle slot={slot} onToggle={onToggle} />
      </View>
    </View>
  );
}

// ─── Mobile Athlete Row (generous touch target) ──────────────────────────────

function MobileAthleteRow({ slot, onToggle, isFirst }: AthleteRowProps & { isFirst?: boolean }) {
  return (
    <View style={[mobileStyles.athleteRow, isFirst && mobileStyles.athleteRowFirst]}>
      <View style={mobileStyles.athleteNameCell}>
        <View style={mobileStyles.avatar}>
          <Text size="label" weight="semibold" tone="muted">{getInitials(slot.label)}</Text>
        </View>
        <Text size="body" weight="medium">{slot.label}</Text>
      </View>
      <AttendanceToggle slot={slot} onToggle={onToggle} mobile />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CoachMarkAttendanceScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentGymId } = useGym();
  const { isMobile } = useResponsiveLayout();

  const params = useLocalSearchParams<{
    classId: string;
    classTypeName: string;
    scheduledDate: string;
    scheduledTime: string;
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
    spaceName,
    bookedCount,
    state,
  } = params;

  const bookedCountNum = bookedCount ? parseInt(bookedCount, 10) : 0;
  const classState: ClassState = state ?? 'in_progress';

  const [slots, setSlots] = useState<AthleteSlot[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !currentGymId || !classId) return;

    let cancelled = false;
    const client = createApiClient({ token });

    setIsLoadingBookings(true);
    setBookingsError(null);

    client
      .get<GetClassBookingsResponse>(
        `/api/gyms/${currentGymId}/classes/${classId}/bookings`,
      )
      .then((response) => {
        if (!cancelled) {
          setSlots(buildSlotsFromBookings(response.bookings));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load bookings.';
          setBookingsError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingBookings(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, currentGymId, classId]);

  const markedPresentCount = slots.filter((s) => s.present).length;
  const markedAbsentCount = slots.filter((s) => !s.present).length;

  const handleToggle = (athleteUserId: string, present: boolean) => {
    setSlots((prev) =>
      prev.map((s) => (s.athleteUserId === athleteUserId ? { ...s, present } : s)),
    );
    setSuccessMessage(null);
    setSubmitError(null);
  };

  const allPresent = slots.length > 0 && slots.every((s) => s.present);

  const handleSelectAll = () => {
    setSlots((prev) => prev.map((s) => ({ ...s, present: !allPresent })));
    setSuccessMessage(null);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!token || !currentGymId || !classId) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

    const attendanceRecords: AttendanceRecordDto[] = slots.map((s) => ({
      athleteUserId: s.athleteUserId,
      present: s.present,
    }));

    const body: MarkAttendanceDto = {
      classId,
      attendanceRecords,
    };

    try {
      const client = createApiClient({ token });
      await client.post<MarkAttendanceResponse>(
        `/api/gyms/${currentGymId}/classes/${classId}/attendance`,
        body,
      );
      setSuccessMessage('Attendance submitted successfully.');
    } catch (err) {
      // A 400 here is the lifecycle invariant: attendance requires in_progress
      // or completed. The shared 400 copy ("check your details") is wrong — the
      // coach's selections are fine, the class simply has not started.
      if (err instanceof ApiError && err.status === 400) {
        setSubmitError(
          'This class has not started yet. Attendance can be marked once it is in progress.',
        );
        return;
      }
      const msg = err instanceof Error ? err.message : 'Failed to submit attendance.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerTitle = scheduledDate && scheduledTime
    ? `Attendance — ${formatDateTime(scheduledDate, scheduledTime)}`
    : classTypeName ?? 'Mark Attendance';

  // ─── Mobile Layout ─────────────────────────────────────────────────────────

  if (isMobile) {
    const ms = mobileStyles;
    return (
      <SafeScreen style={ms.root} extraTopPadding={Space.base} testID="mark-attendance-screen">
        <ScrollView
          style={ms.main}
          contentContainerStyle={ms.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={ms.header}>
            <Pressable style={ms.backBtn} onPress={() => router.back()}>
              <Icon name="back" size={18} tone="muted" />
              <Text size="body" tone="muted">Back</Text>
            </Pressable>
            <Text size="screen" weight="bold" tone="strong" numberOfLines={2}>{headerTitle}</Text>
          </View>

          {/* Subheader with Select All */}
          <View style={ms.subHeaderRow}>
            <Text size="meta" tone="muted">
              {isLoadingBookings ? bookedCountNum : slots.length} athletes booked
            </Text>
            {slots.length > 0 && !isLoadingBookings ? (
              <Pressable testID="select-all-btn" style={ms.selectAllBtn} onPress={handleSelectAll}>
                <Text size="meta" weight="semibold" tone="strong">
                  {allPresent ? 'Deselect All' : 'Select All'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Attendance card */}
          <View style={ms.attendanceCard}>
            {isLoadingBookings ? (
              <View style={ms.emptyState}>
                <ActivityIndicator size="small" color={Ink.muted} />
              </View>
            ) : bookingsError !== null ? (
              <View style={ms.emptyState}>
                <Text size="meta" tone={Ink.muted} style={{ textAlign: 'center' }}>{bookingsError}</Text>
              </View>
            ) : slots.length === 0 ? (
              <View style={ms.emptyState}>
                <Text size="title" weight="semibold" tone="muted" style={{ textAlign: 'center' }}>
                  No athletes booked for this class
                </Text>
              </View>
            ) : (
              slots.map((slot, index) => (
                <MobileAthleteRow
                  key={slot.athleteUserId}
                  slot={slot}
                  onToggle={handleToggle}
                  isFirst={index === 0}
                />
              ))
            )}

            {/* Feedback — Clean Ink has no success role; a quiet meta line marks it saved. */}
            {successMessage !== null && (
              <View style={ms.feedbackRow}>
                <Text size="meta" tone="muted">{successMessage}</Text>
              </View>
            )}
            {submitError !== null && (
              <View style={ms.feedbackRow}>
                <Text size="meta" tone={Status.danger}>{submitError}</Text>
              </View>
            )}

            {/* Footer count */}
            {slots.length > 0 && !isLoadingBookings ? (
              <View style={ms.footerRow}>
                <Text size="meta" tone="muted">
                  {markedPresentCount} of {slots.length} marked present
                </Text>
              </View>
            ) : null}

            {/* Submit */}
            {slots.length > 0 && !isLoadingBookings && (
              <Button
                testID="submit-attendance-btn"
                label="Submit Attendance"
                variant="primary"
                loading={isSubmitting}
                onPress={handleSubmit}
              />
            )}
          </View>
        </ScrollView>
      </SafeScreen>
    );
  }

  // ─── Desktop Layout ────────────────────────────────────────────────────────

  return (
    <View style={styles.root} testID="mark-attendance-screen">
      <CoachSidebar activeItem="classes" />

      <SafeScreen style={styles.main} applyTopInset={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="back" size={18} tone="muted" />
            <Text size="body" tone="muted">Back to Class Details</Text>
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text size="screen" weight="bold" tone="strong" numberOfLines={1}>{headerTitle}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          {classTypeName ? (
            <View style={styles.infoItem}>
              <Text size="label" weight="semibold" tone="faint" upper>Class Type</Text>
              <Text size="body" weight="medium">{classTypeName}</Text>
            </View>
          ) : null}
          {scheduledDate && scheduledTime ? (
            <View style={styles.infoItem}>
              <Text size="label" weight="semibold" tone="faint" upper>Date &amp; Time</Text>
              <Text size="body" weight="medium">{formatDateTime(scheduledDate, scheduledTime)}</Text>
            </View>
          ) : null}
          {spaceName ? (
            <View style={styles.infoItem}>
              <Text size="label" weight="semibold" tone="faint" upper>Space</Text>
              <Text size="body" weight="medium">{spaceName}</Text>
            </View>
          ) : null}
          <View style={styles.infoItem}>
            <Text size="label" weight="semibold" tone="faint" upper>Status</Text>
            <StatusChip tone={STATE_CHIP_TONE[classState]} label={STATE_LABEL[classState]} />
          </View>
        </View>

        {/* Summary stat cards */}
        <View style={styles.statsRow}>
          <StatCard label="Booked" value={bookedCountNum} />
          <StatCard label="Marked Present" value={markedPresentCount} />
          <StatCard label="Marked Absent" value={markedAbsentCount} />
        </View>

        {/* Attendance card */}
        <View style={styles.attendanceCard}>
          {/* Section header */}
          <View style={styles.sectionHeader}>
            <Text size="title" weight="semibold">Attendance List</Text>
            <StatusChip
              tone="neutral"
              label={`${isLoadingBookings ? bookedCountNum : slots.length} booked`}
            />
          </View>

          {isLoadingBookings ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={Ink.muted} />
            </View>
          ) : bookingsError !== null ? (
            <View style={styles.emptyState}>
              <Text size="meta" tone={Ink.muted} style={{ textAlign: 'center' }}>{bookingsError}</Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={styles.emptyState}>
              <Text size="title" weight="semibold" tone="muted">No athletes booked for this class</Text>
            </View>
          ) : (
            <View style={styles.table}>
              {/* Table header */}
              <View style={styles.tableHeader}>
                <View style={styles.colAthlete}>
                  <Text size="label" weight="semibold" tone="faint" upper>Athlete</Text>
                </View>
                <View style={styles.colStatus}>
                  <Text size="label" weight="semibold" tone="faint" upper>Status</Text>
                </View>
              </View>

              {/* Athlete rows */}
              <ScrollView showsVerticalScrollIndicator={false} style={styles.tableBody}>
                {slots.map((slot) => (
                  <AthleteRow key={slot.athleteUserId} slot={slot} onToggle={handleToggle} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Feedback — Clean Ink has no success role; a quiet meta line marks it saved. */}
          {successMessage !== null && (
            <View style={styles.feedbackRow}>
              <Text size="meta" tone="muted">{successMessage}</Text>
            </View>
          )}
          {submitError !== null && (
            <View style={styles.feedbackRow}>
              <Text size="meta" tone={Status.danger}>{submitError}</Text>
            </View>
          )}

          {/* Submit */}
          {slots.length > 0 && !isLoadingBookings && (
            <View style={styles.submitWrap}>
              <Button
                testID="submit-attendance-btn"
                label="Submit Attendance"
                variant="primary"
                loading={isSubmitting}
                onPress={handleSubmit}
              />
            </View>
          )}
        </View>
      </SafeScreen>
    </View>
  );
}
