import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { AppColors } from '@/constants/theme';
import { styles } from './coach-mark-attendance.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

type CoachClassItem = components['schemas']['CoachClassItemDto'];
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

function buildSlotsFromBookings(bookings: ClassBookingItem[]): AthleteSlot[] {
  return bookings.map((b) => ({
    athleteUserId: b.athleteUserId,
    label: b.displayName,
    present: false,
  }));
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
              <Text style={[styles.navLabel, styles.navLabelInactive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  valueBg: string;
  valueColor: string;
}

function StatCard({ label, value, valueBg, valueColor }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={[styles.statValueBadge, { backgroundColor: valueBg }]}>
        <Text style={[styles.statValueText, { color: valueColor }]}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Athlete Row ──────────────────────────────────────────────────────────────

interface AthleteRowProps {
  slot: AthleteSlot;
  isAlt: boolean;
  onToggle: (athleteUserId: string, present: boolean) => void;
}

function AthleteRow({ slot, isAlt, onToggle }: AthleteRowProps) {
  return (
    <View style={[styles.tableRow, isAlt && styles.tableRowAlt]}>
      <View style={styles.athleteNameCell}>
        <View style={styles.avatarPlaceholder} />
        <Text style={styles.athleteNameText}>{slot.label}</Text>
      </View>
      <View style={styles.attendanceToggleCell}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            slot.present ? styles.toggleBtnPresent : styles.toggleBtnAbsent,
          ]}
          onPress={() => onToggle(slot.athleteUserId, !slot.present)}
          activeOpacity={0.8}>
          <Text
            style={[
              styles.toggleBtnText,
              slot.present ? styles.toggleBtnTextPresent : styles.toggleBtnTextAbsent,
            ]}>
            {slot.present ? 'Present' : 'Absent'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CoachMarkAttendanceScreen() {
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
    bookedCount,
    state,
  } = params;

  const bookedCountNum = bookedCount ? parseInt(bookedCount, 10) : 0;
  const classState: CoachClassItem['state'] = state ?? 'in_progress';

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
      const msg = err instanceof Error ? err.message : 'Failed to submit attendance.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerTitle = scheduledDate && scheduledTime
    ? `Attendance — ${formatDateTime(scheduledDate, scheduledTime)}`
    : classTypeName ?? 'Mark Attendance';

  return (
    <View style={styles.root}>
      <Sidebar />

      <View style={styles.main}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{'← Back to Class Details'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          {classTypeName ? (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>CLASS TYPE</Text>
              <Text style={styles.infoValue}>{classTypeName}</Text>
            </View>
          ) : null}
          {scheduledDate && scheduledTime ? (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>DATE &amp; TIME</Text>
              <Text style={styles.infoValue}>{formatDateTime(scheduledDate, scheduledTime)}</Text>
            </View>
          ) : null}
          {spaceName ? (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>SPACE</Text>
              <Text style={styles.infoValue}>{spaceName}</Text>
            </View>
          ) : null}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>STATUS</Text>
            <Text style={styles.infoValue}>{classState.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Summary stat cards */}
        <View style={styles.statsRow}>
          <StatCard
            label="Booked"
            value={bookedCountNum}
            valueBg={AppColors.badgeBlueBg}
            valueColor={AppColors.actionBlue}
          />
          <StatCard
            label="Marked Present"
            value={markedPresentCount}
            valueBg={AppColors.successBgVivid}
            valueColor={AppColors.successDefault}
          />
          <StatCard
            label="Marked Absent"
            value={markedAbsentCount}
            valueBg={AppColors.errorBgSoft}
            valueColor={AppColors.errorDarkest}
          />
        </View>

        {/* Attendance card */}
        <View style={styles.attendanceCard}>
          {/* Section header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Attendance List</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{isLoadingBookings ? bookedCountNum : slots.length} booked</Text>
            </View>
          </View>

          {isLoadingBookings ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={AppColors.darkTextDim} />
            </View>
          ) : bookingsError !== null ? (
            <View style={styles.emptyState}>
              <Text style={styles.errorText}>{bookingsError}</Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No athletes booked for this class</Text>
            </View>
          ) : (
            <>
              {/* Table header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colAthlete]}>Athlete</Text>
                <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
              </View>

              {/* Athlete rows */}
              <ScrollView showsVerticalScrollIndicator={false} style={styles.tableBody}>
                {slots.map((slot, idx) => (
                  <AthleteRow
                    key={slot.athleteUserId}
                    slot={slot}
                    isAlt={idx % 2 !== 0}
                    onToggle={handleToggle}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* Feedback */}
          {successMessage !== null && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}
          {submitError !== null && (
            <Text style={styles.errorText}>{submitError}</Text>
          )}

          {/* Submit */}
          {slots.length > 0 && !isLoadingBookings && (
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={AppColors.backgroundWhite} />
              ) : (
                <Text style={styles.submitBtnText}>Submit Attendance</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
