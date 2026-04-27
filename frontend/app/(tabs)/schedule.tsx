import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { showConfirm, showError } from '@/utils/alert';
import { useCallback } from 'react';
import { components } from '@/types/api.gen';

type ClassScheduleItem = components['schemas']['ClassScheduleItemDto'];
type UserBookingItem = components['schemas']['UserBookingItemDto'];
type GetClassScheduleResponse = components['schemas']['GetClassScheduleResponseDto'];
type GetUserBookingsResponse = components['schemas']['GetUserBookingsResponseDto'];

type BookingStatus = 'booked' | 'waitlisted' | 'open' | 'full';

interface EnrichedClass extends ClassScheduleItem {
  userBookingStatus: BookingStatus;
  userBookingId?: string;
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { token, userId, isLoading: authLoading } = useAuth();
  const { currentGymId, isLoading: gymLoading } = useGym();

  const [classes, setClasses] = useState<EnrichedClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (authLoading || gymLoading || !token || !currentGymId || !userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const client = createApiClient({ userId, gymId: currentGymId });

      // Fetch both schedule and bookings in parallel
      const [scheduleResponse, bookingsResponse] = await Promise.all([
        client.get<GetClassScheduleResponse>(`/api/gyms/${currentGymId}/classes`),
        client.get<GetUserBookingsResponse>('/api/me/bookings'),
      ]);

      // Create a Map of classId -> booking for O(1) lookups
      const bookingMap = new Map<string, UserBookingItem>();
      bookingsResponse.bookings.forEach((booking) => {
        bookingMap.set(booking.classId, booking);
      });

      // Merge booking state into classes
      const enrichedClasses: EnrichedClass[] = scheduleResponse.classes.map((cls) => {
        const booking = bookingMap.get(cls.id);
        let userBookingStatus: BookingStatus;
        let userBookingId: string | undefined;

        if (booking) {
          userBookingStatus = booking.status;
          userBookingId = booking.id;
        } else if (cls.bookedCount >= cls.capacity) {
          userBookingStatus = 'full';
        } else {
          userBookingStatus = 'open';
        }

        return {
          ...cls,
          userBookingStatus,
          userBookingId,
        };
      });

      setClasses(enrichedClasses);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load classes';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, gymLoading, token, userId, currentGymId]);

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

  const handleCancelBooking = async (
    event: React.TouchEvent,
    classId: string,
    bookingId: string
  ) => {
    event.stopPropagation();

    showConfirm(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'Keep Booking', style: 'cancel', onPress: () => {} },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingBookingId(bookingId);

              const client = createApiClient({ userId: userId!, gymId: currentGymId! });

              // Call cancellation endpoint
              await client.delete(`/api/gyms/${currentGymId}/classes/bookings/${bookingId}`);

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

  const getAvailabilityText = (bookedCount: number, capacity: number): string => {
    const available = capacity - bookedCount;
    if (available <= 0) {
      return 'Full (Waitlist)';
    }
    return `${available}/${capacity} spots`;
  };

  const getStatusBadgeColor = (status: BookingStatus): string => {
    switch (status) {
      case 'booked':
        return '#4caf50';
      case 'waitlisted':
        return '#ff9800';
      case 'full':
        return '#f44336';
      case 'open':
        return '#2196f3';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status: BookingStatus): string => {
    switch (status) {
      case 'booked':
        return 'Booked';
      case 'waitlisted':
        return 'Waitlisted';
      case 'full':
        return 'Full';
      case 'open':
        return 'Open';
      default:
        return '';
    }
  };

  const renderClassItem = ({ item }: { item: EnrichedClass }) => (
    <TouchableOpacity
      style={styles.classCard}
      onPress={() => handleClassPress(item.id)}
      activeOpacity={0.7}>
      <View style={styles.classHeader}>
        <View style={styles.classTypeContainer}>
          <Text style={styles.classType}>{item.classTypeName}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusBadgeColor(item.userBookingStatus) },
          ]}>
          <Text style={styles.statusBadgeText}>
            {getStatusLabel(item.userBookingStatus)}
          </Text>
        </View>
      </View>

      <View style={styles.classDetails}>
        <Text style={styles.dateTime}>
          {item.scheduledDate} at {item.scheduledTime}
        </Text>
        <Text style={styles.coach}>Coach: {item.coachName}</Text>
        <Text style={styles.availability}>
          {getAvailabilityText(item.bookedCount, item.capacity)}
        </Text>
      </View>

      {(item.userBookingStatus === 'booked' || item.userBookingStatus === 'waitlisted') && (
        <View style={styles.bookedIndicator}>
          <Text style={styles.bookedIndicatorText}>
            ✓ You are {item.userBookingStatus === 'booked' ? 'booked' : 'on the waitlist'}
          </Text>
          {!cancellingBookingId && (
            <TouchableOpacity
              style={styles.quickCancelButton}
              onPress={(e: any) =>
                handleCancelBooking(e, item.id, item.userBookingId!)
              }>
              <Text style={styles.quickCancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
          {cancellingBookingId === item.userBookingId && (
            <View style={styles.cancelLoadingContainer}>
              <ActivityIndicator size="small" color="#f44336" />
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  if (!token || !currentGymId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Please select a gym and log in to view classes.
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

  if (classes.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>No classes available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Class Schedule</Text>
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={renderClassItem}
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
  classCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0a7ea4',
  },
  classHeader: {
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
  classDetails: {
    gap: 4,
    marginBottom: 8,
  },
  dateTime: {
    fontSize: 14,
    color: '#333',
  },
  coach: {
    fontSize: 14,
    color: '#666',
  },
  availability: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0a7ea4',
  },
  bookedIndicator: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookedIndicatorText: {
    fontSize: 13,
    color: '#2e7d32',
    fontWeight: '500',
    flex: 1,
  },
  quickCancelButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f44336',
    borderRadius: 3,
  },
  quickCancelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  cancelLoadingContainer: {
    paddingHorizontal: 8,
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
