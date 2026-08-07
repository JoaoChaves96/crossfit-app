import React from 'react';
import { View } from 'react-native';
import { Text, StatusChip } from '@/components/cleanink';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { components } from '@/types/api.gen';
import { styles } from './class-management.styles';

type ClassBookingItem = components['schemas']['ClassBookingItemDto'];

/** Shown when the backend has not assigned a queue position yet. */
const UNASSIGNED_POSITION = '—';

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Booking Status Badge ─────────────────────────────────────────────────────
// Confirmed booking reads as an "open"/held state; waitlisted is a quiet neutral.

interface BookingStatusBadgeProps {
  status: ClassBookingItem['status'];
}

function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  return status === 'booked' ? (
    <StatusChip tone="open" label="Confirmed" />
  ) : (
    <StatusChip tone="neutral" label="Waitlisted" />
  );
}

// ─── Attendance List ──────────────────────────────────────────────────────────

interface AttendanceListProps {
  bookings: ClassBookingItem[];
  /** Stacked (mobile) layout: fill the column width, take content height. */
  stacked: boolean;
}

function AttendanceList({ bookings, stacked }: AttendanceListProps) {
  return (
    <View style={[styles.listSection, stacked && styles.sectionStackedMobile]}>
      <View style={styles.listHeader}>
        <Text size="title" weight="semibold">Attendance List</Text>
        <StatusChip tone="neutral" label={`${bookings.length} booked`} />
      </View>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <View style={styles.tableColFill}>
            <Text size="label" weight="semibold" tone="faint" upper>Athlete</Text>
          </View>
          <View style={styles.tableColStatus}>
            <Text size="label" weight="semibold" tone="faint" upper>Status</Text>
          </View>
        </View>
        {bookings.length === 0 ? (
          <View style={styles.tableEmpty}>
            <Text size="meta" tone="faint">No booked athletes</Text>
          </View>
        ) : (
          bookings.map((booking) => (
            <View key={booking.bookingId} style={styles.tableRow}>
              <View style={styles.tableRowName}>
                <View style={styles.avatar}>
                  <Text size="label" weight="semibold" tone="muted">{getInitials(booking.displayName)}</Text>
                </View>
                <Text size="meta">{booking.displayName}</Text>
              </View>
              <View style={styles.tableColStatus}>
                <BookingStatusBadge status={booking.status} />
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

interface WaitlistProps {
  bookings: ClassBookingItem[];
  /** Stacked (mobile) layout: fill the column width, take content height. */
  stacked: boolean;
}

function Waitlist({ bookings, stacked }: WaitlistProps) {
  return (
    <View style={[styles.waitSection, stacked && styles.sectionStackedMobile]}>
      <View style={styles.listHeader}>
        <Text size="title" weight="semibold">Waitlist</Text>
        <StatusChip tone="neutral" label={`${bookings.length} waiting`} />
      </View>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <View style={styles.tableColPos}>
            <Text size="label" weight="semibold" tone="faint" upper>#</Text>
          </View>
          <View style={styles.tableColFill}>
            <Text size="label" weight="semibold" tone="faint" upper>Athlete</Text>
          </View>
        </View>
        {bookings.length === 0 ? (
          <View style={styles.tableEmpty}>
            <Text size="meta" tone="faint">No one on waitlist</Text>
          </View>
        ) : (
          bookings.map((booking) => (
            <View key={booking.bookingId} style={styles.tableRow}>
              <View style={styles.tableColPos}>
                {/* Authoritative promotion order from the API — never derived
                    from the array index. Unassigned reads as a neutral dash. */}
                <Text
                  testID={`waitlist-position-${booking.bookingId}`}
                  size="meta"
                  weight={booking.waitlistPosition == null ? 'regular' : 'semibold'}
                  tone={booking.waitlistPosition == null ? 'faint' : 'strong'}>
                  {booking.waitlistPosition == null ? UNASSIGNED_POSITION : String(booking.waitlistPosition)}
                </Text>
              </View>
              <View style={styles.tableRowName}>
                <View style={styles.avatar}>
                  <Text size="label" weight="semibold" tone="muted">{getInitials(booking.displayName)}</Text>
                </View>
                <Text size="meta" numberOfLines={1}>{booking.displayName}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

// ─── Bookings Panel ───────────────────────────────────────────────────────────

interface BookingsPanelProps {
  bookedList: ClassBookingItem[];
  waitlistedList: ClassBookingItem[];
}

export function BookingsPanel({ bookedList, waitlistedList }: BookingsPanelProps) {
  const { isMobile } = useResponsiveLayout();

  const panels = (
    <>
      <AttendanceList bookings={bookedList} stacked={isMobile} />
      <Waitlist bookings={waitlistedList} stacked={isMobile} />
    </>
  );

  // Desktop: the two cards are direct children of `listsRow` (a flex row) and
  // sit beside Results, so the panel must stay a fragment there — wrapping it
  // would turn two flex siblings into one. Mobile: they own their own stack,
  // so wrap them to carry the column spacing.
  return isMobile ? <View style={styles.bookingsStackMobile}>{panels}</View> : panels;
}
