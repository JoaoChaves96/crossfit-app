import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { showConfirm, showError } from '@/utils/alert';

interface ClassScheduleItem {
  id: string;
  classTypeId: string;
  classTypeName: string;
  scheduledDate: string;
  scheduledTime: string;
  coachName: string;
  capacity: number;
  bookedCount: number;
  state: 'published' | 'booking_closed' | 'in_progress' | 'completed' | 'archived';
}

interface UserBookingItem {
  id: string;
  classId: string;
  status: 'booked' | 'waitlisted';
}

interface GetClassScheduleResponse {
  classes: ClassScheduleItem[];
}

interface GetUserBookingsResponse {
  bookings: UserBookingItem[];
}

interface BookingWithClassDetails extends ClassScheduleItem {
  bookingId: string;
  bookingStatus: 'booked' | 'waitlisted';
}

export default function MyBookingsScreen() {
  const router = useRouter();
  const { userId, isLoading: authLoading } = useAuth();
  const { currentGymId, isLoading: gymLoading } = useGym();

  const [bookings, setBookings] = useState<BookingWithClassDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (authLoading || gymLoading || !userId || !currentGymId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const client = createApiClient({ userId, gymId: currentGymId });

      // Fetch both classes and bookings in parallel
      const [scheduleResponse, bookingsResponse] = await Promise.all([
        client.get<GetClassScheduleResponse>(`/api/gyms/${currentGymId}/classes`),
        client.get<GetUserBookingsResponse>('/api/me/bookings'),
      ]);

      // Create a map of classId -> class for O(1) lookups
      const classMap = new Map<string, ClassScheduleItem>();
      scheduleResponse.classes.forEach((cls) => {
        classMap.set(cls.id, cls);
      });

      // Merge booking data with class details
      const enrichedBookings: BookingWithClassDetails[] = bookingsResponse.bookings
        .map((booking) => {
          const classDetails = classMap.get(booking.classId);
          if (!classDetails) {
            return null;
          }
          return {
            ...classDetails,
            bookingId: booking.id,
            bookingStatus: booking.status,
          };
        })
        .filter((booking): booking is BookingWithClassDetails => booking !== null);

      setBookings(enrichedBookings);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load bookings';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, gymLoading, userId, currentGymId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleClassPress = (classId: string) => {
    if (!currentGymId) return;
    router.push({
      pathname: '/class-details',
      params: { gymId: currentGymId, classId },
    });
  };

  const handleCancelBooking = (booking: BookingWithClassDetails) => {
    showConfirm(
      'Cancel Booking',
      `Cancel booking for ${booking.classTypeName} on ${booking.scheduledDate}?`,
      [
        { text: 'Keep Booking', style: 'cancel', onPress: () => {} },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingBookingId(booking.bookingId);

              const client = createApiClient({ userId: userId!, gymId: currentGymId! });

              // Call cancellation endpoint
              await client.delete(`/api/gyms/${currentGymId}/classes/bookings/${booking.bookingId}`);

              // Re-fetch data to update UI
              await fetchData();
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to cancel booking';
              showError('Cancellation Error', message);
            } finally {
              setCancellingBookingId(null);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: 'booked' | 'waitlisted'): string => {
    return status === 'booked' ? '#4caf50' : '#ff9800';
  };

  const getStatusLabel = (status: 'booked' | 'waitlisted'): string => {
    return status === 'booked' ? 'Booked' : 'Waitlisted';
  };

  const renderBookingItem = ({ item }: { item: BookingWithClassDetails }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => handleClassPress(item.id)}
      activeOpacity={0.7}>
      <View style={styles.bookingHeader}>
        <View style={styles.classTypeContainer}>
          <Text style={styles.classType}>{item.classTypeName}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.bookingStatus) },
          ]}>
          <Text style={styles.statusBadgeText}>
            {getStatusLabel(item.bookingStatus)}
          </Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <Text style={styles.dateTime}>
          {item.scheduledDate} at {item.scheduledTime}
        </Text>
        <Text style={styles.coach}>Coach: {item.coachName}</Text>
      </View>

      <View style={styles.actionContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={[
            styles.cancelButton,
            cancellingBookingId === item.bookingId && styles.cancelButtonDisabled,
          ]}
          onPress={() => handleCancelBooking(item)}
          disabled={cancellingBookingId === item.bookingId}>
          {cancellingBookingId === item.bookingId ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.cancelButtonText}>Cancel</Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (!userId || !currentGymId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Please select a gym and log in to view your bookings.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>No active bookings</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Bookings</Text>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.bookingId}
        renderItem={renderBookingItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 16,
    color: '#000',
  },
  listContent: {
    paddingBottom: 20,
  },
  bookingCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0a7ea4',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  classTypeContainer: {
    flex: 1,
  },
  classType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  bookingDetails: {
    gap: 4,
    marginBottom: 12,
  },
  dateTime: {
    fontSize: 14,
    color: '#333',
  },
  coach: {
    fontSize: 14,
    color: '#666',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonDisabled: {
    backgroundColor: '#ffb3b3',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
