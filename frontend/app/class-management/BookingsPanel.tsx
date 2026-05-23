import React from 'react';
import { Text, View } from 'react-native';
import { AppColors } from '@/constants/theme';
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

interface BookingStatusBadgeProps {
  status: ClassBookingItem['status'];
}

function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const isBooked = status === 'booked';
  return (
    <View
      style={[
        styles.bookingBadge,
        { backgroundColor: isBooked ? AppColors.successBgVivid : AppColors.warningBg },
      ]}>
      <Text
        style={[
          styles.bookingBadgeText,
          { color: isBooked ? AppColors.successDefault : AppColors.warningText },
        ]}>
        {isBooked ? 'Confirmed' : 'Waitlisted'}
      </Text>
    </View>
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
        <Text style={styles.listTitle}>Attendance List</Text>
        <View style={styles.attBadge}>
          <Text style={styles.attBadgeText}>{bookings.length} booked</Text>
        </View>
      </View>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.tableColFill]}>Athlete</Text>
          <Text style={[styles.tableHeaderText, styles.tableColStatus]}>Status</Text>
        </View>
        {bookings.length === 0 ? (
          <View style={styles.tableEmpty}>
            <Text style={styles.tableEmptyText}>No booked athletes</Text>
          </View>
        ) : (
          bookings.map((booking) => (
            <View key={booking.bookingId} style={styles.tableRow}>
              <View style={styles.tableRowName}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(booking.displayName)}</Text>
                </View>
                <Text style={styles.athleteName}>{booking.displayName}</Text>
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
        <Text style={styles.listTitle}>Waitlist</Text>
        <View style={styles.waitBadge}>
          <Text style={styles.waitBadgeText}>{bookings.length} waiting</Text>
        </View>
      </View>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Athlete</Text>
        </View>
        {bookings.length === 0 ? (
          <View style={styles.tableEmpty}>
            <Text style={styles.tableEmptyText}>No one on waitlist</Text>
          </View>
        ) : (
          bookings.map((booking) => (
            <View key={booking.bookingId} style={[styles.tableRow, styles.tableRowWait]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(booking.displayName)}</Text>
              </View>
              <Text style={styles.athleteName}>{booking.displayName}</Text>
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
