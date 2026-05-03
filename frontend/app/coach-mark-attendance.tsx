import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
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

// ─── Design Tokens ────────────────────────────────────────────────────────────

const COLOR = {
  rootBg: '#F2F3F5',
  white: '#FFFFFF',

  sidebarBg: '#1E1E2D',
  sidebarLogoText: '#FFFFFF',
  navActiveItemBg: '#2D2D42',
  navActiveText: '#FFFFFF',
  navInactiveText: '#8888A0',

  titleText: '#111827',
  bodyText: '#1A1A2E',
  secondaryText: '#6B7280',
  mutedText: '#9CA3AF',

  cardBg: '#FFFFFF',
  cardBorder: '#E5E7EB',
  tableHeaderBg: '#F9FAFB',
  rowBorder: '#E5E7EB',

  statCardBg: '#F9FAFB',
  statCardBorder: '#E5E7EB',

  presentBg: '#DCFCE7',
  presentText: '#15803D',
  absentBg: '#FEE2E2',
  absentText: '#991B1B',
  unmarkedBg: '#F3F4F6',
  unmarkedText: '#6B7280',

  actionBtnBg: '#111827',
  actionBtnText: '#FFFFFF',
  actionBtnDisabledOpacity: 0.6,

  backBtnBg: '#FFFFFF',
  backBtnBorder: '#E4E4EA',
  backBtnText: '#555568',

  successBg: '#DCFCE7',
  successText: '#15803D',
  errorText: '#DC2626',

  borderMid: '#D1D5DB',

  infoLabelText: '#9CA3AF',
  infoValueText: '#111827',
};

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
            valueBg="#DBEAFE"
            valueColor="#1D4ED8"
          />
          <StatCard
            label="Marked Present"
            value={markedPresentCount}
            valueBg={COLOR.presentBg}
            valueColor={COLOR.presentText}
          />
          <StatCard
            label="Marked Absent"
            value={markedAbsentCount}
            valueBg={COLOR.absentBg}
            valueColor={COLOR.absentText}
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
              <ActivityIndicator size="small" color={COLOR.secondaryText} />
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
                <ActivityIndicator size="small" color={COLOR.actionBtnText} />
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
    paddingHorizontal: 32,
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
  headerSpacer: {
    width: 130,
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLOR.statCardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLOR.statCardBorder,
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 32,
  },
  infoItem: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLOR.infoLabelText,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLOR.infoValueText,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLOR.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLOR.cardBorder,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLOR.secondaryText,
  },
  statValueBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 36,
    alignItems: 'center',
  },
  statValueText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Attendance card
  attendanceCard: {
    flex: 1,
    backgroundColor: COLOR.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLOR.cardBorder,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.titleText,
  },
  sectionBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1D4ED8',
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.tableHeaderBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR.rowBorder,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.secondaryText,
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLOR.rowBorder,
  },
  tableRowAlt: {
    backgroundColor: '#F9FAFB',
  },

  // Column widths
  colAthlete: {
    flex: 1,
  },
  colStatus: {
    width: 120,
    textAlign: 'right',
  },

  // Athlete cell
  athleteNameCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  athleteNameText: {
    fontSize: 13,
    fontWeight: '400',
    color: COLOR.titleText,
  },

  // Toggle cell
  attendanceToggleCell: {
    width: 120,
    alignItems: 'flex-end',
  },
  toggleBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  toggleBtnPresent: {
    backgroundColor: COLOR.presentBg,
  },
  toggleBtnAbsent: {
    backgroundColor: COLOR.absentBg,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
  toggleBtnTextPresent: {
    color: COLOR.presentText,
  },
  toggleBtnTextAbsent: {
    color: COLOR.absentText,
  },

  // Submit button
  submitBtn: {
    backgroundColor: COLOR.actionBtnBg,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: COLOR.actionBtnDisabledOpacity,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.actionBtnText,
  },

  // Feedback
  successBanner: {
    backgroundColor: COLOR.successBg,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  successText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLOR.successText,
  },
  errorText: {
    fontSize: 13,
    color: COLOR.errorText,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.bodyText,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLOR.secondaryText,
    textAlign: 'center',
  },
});
