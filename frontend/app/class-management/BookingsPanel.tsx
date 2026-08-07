import React from 'react';
import { View } from 'react-native';
import { Text, StatusChip } from '@/components/cleanink';
import { components } from '@/types/api.gen';
import { styles } from './class-management.styles';

type ClassBookingItem = components['schemas']['ClassBookingItemDto'];

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
}

function AttendanceList({ bookings }: AttendanceListProps) {
  return (
    <View style={styles.listSection}>
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
}

function Waitlist({ bookings }: WaitlistProps) {
  return (
    <View style={styles.waitSection}>
      <View style={styles.listHeader}>
        <Text size="title" weight="semibold">Waitlist</Text>
        <StatusChip tone="neutral" label={`${bookings.length} waiting`} />
      </View>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text size="label" weight="semibold" tone="faint" upper>Athlete</Text>
        </View>
        {bookings.length === 0 ? (
          <View style={styles.tableEmpty}>
            <Text size="meta" tone="faint">No one on waitlist</Text>
          </View>
        ) : (
          bookings.map((booking) => (
            <View key={booking.bookingId} style={[styles.tableRow, styles.tableRowWait]}>
              <View style={styles.avatar}>
                <Text size="label" weight="semibold" tone="muted">{getInitials(booking.displayName)}</Text>
              </View>
              <Text size="meta">{booking.displayName}</Text>
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
  return (
    <>
      <AttendanceList bookings={bookedList} />
      <Waitlist bookings={waitlistedList} />
    </>
  );
}
