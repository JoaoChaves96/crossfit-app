import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { showConfirm, showError } from '@/utils/alert';
import { components } from '@/types/api.gen';

type ClassDetailsItem = components['schemas']['ClassScheduleItemDto'];
type UserBookingItem = components['schemas']['UserBookingItemDto'];
type GetUserBookingsResponse = components['schemas']['GetUserBookingsResponseDto'];
type GetClassScheduleResponse = components['schemas']['GetClassScheduleResponseDto'];

type BookingStatus = 'booked' | 'waitlisted' | 'open' | 'full';

export default function ClassDetailsScreen() {
  const router = useRouter();
  const { userId, isLoading: authLoading } = useAuth();
  const { currentGymId, isLoading: gymLoading } = useGym();
  const { classId } = useLocalSearchParams();

  const [classData, setClassData] = useState<ClassDetailsItem | null>(null);
  const [userBookingStatus, setUserBookingStatus] = useState<BookingStatus>('open');
  const [userBookingId, setUserBookingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const fetchData = async (client: ReturnType<typeof createApiClient>) => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch both schedule and bookings
      const [scheduleResponse, bookingsResponse] = await Promise.all([
        client.get<GetClassScheduleResponse>(`/api/gyms/${currentGymId}/classes`),
        client.get<GetUserBookingsResponse>('/api/me/bookings'),
      ]);

      const found = scheduleResponse.classes.find((c) => c.id === classId);
      if (!found) {
        setError('Class not found');
        return;
      }

      setClassData(found);

      // Determine booking status
      const booking = bookingsResponse.bookings.find((b) => b.classId === classId);
      if (booking) {
        setUserBookingStatus(booking.status);
        setUserBookingId(booking.id);
      } else if (found.bookedCount >= found.capacity) {
        setUserBookingStatus('full');
        setUserBookingId(null);
      } else {
        setUserBookingStatus('open');
        setUserBookingId(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load class details';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || gymLoading || !userId || !currentGymId || !classId) {
      setIsLoading(false);
      return;
    }

    const client = createApiClient({ userId, gymId: currentGymId });
    fetchData(client);
  }, [authLoading, gymLoading, userId, currentGymId, classId]);

  const handleBookClass = async () => {
    if (!userId || !currentGymId || !classId) return;

    try {
      setIsSubmitting(true);
      setMutationError(null);

      const client = createApiClient({ userId, gymId: currentGymId });

      // Call booking endpoint
      await client.post(`/api/gyms/${currentGymId}/classes/${classId}/bookings`, {
        classId,
        gymId: currentGymId,
      });

      // Re-fetch bookings to update UI
      const bookingsResponse = await client.get<GetUserBookingsResponse>('/api/me/bookings');
      const booking = bookingsResponse.bookings.find((b) => b.classId === classId);
      if (booking) {
        setUserBookingStatus(booking.status);
        setUserBookingId(booking.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to book class';
      setMutationError(message);
      showError('Booking Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = () => {
    showConfirm(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'Keep Booking', style: 'cancel', onPress: () => {} },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            if (!userId || !currentGymId || !userBookingId) {
              showError('Error', 'Missing required information for cancellation');
              return;
            }

            try {
              setIsSubmitting(true);
              setMutationError(null);

              const client = createApiClient({ userId, gymId: currentGymId });

              // Call cancellation endpoint
              await client.delete(`/api/gyms/${currentGymId}/classes/bookings/${userBookingId}`);

              // Re-fetch bookings to update UI
              const bookingsResponse = await client.get<GetUserBookingsResponse>('/api/me/bookings');
              const booking = bookingsResponse.bookings.find((b) => b.classId === classId);
              if (booking) {
                setUserBookingStatus(booking.status);
                setUserBookingId(booking.id);
              } else {
                // No more bookings for this class
                const currentClass = classData;
                if (currentClass && currentClass.bookedCount >= currentClass.capacity) {
                  setUserBookingStatus('full');
                } else {
                  setUserBookingStatus('open');
                }
                setUserBookingId(null);
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to cancel booking';
              setMutationError(message);
              showError('Cancellation Error', message);
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: BookingStatus): string => {
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
        return 'You are booked';
      case 'waitlisted':
        return 'You are waitlisted';
      case 'full':
        return 'Class is full';
      case 'open':
        return 'Open';
      default:
        return '';
    }
  };

  const isBookingDisabled =
    userBookingStatus === 'booked' ||
    userBookingStatus === 'waitlisted' ||
    classData?.state === 'booking_closed' ||
    classData?.state === 'in_progress' ||
    classData?.state === 'completed' ||
    classData?.state === 'archived' ||
    isSubmitting;

  const getBookButtonText = (): string => {
    if (userBookingStatus === 'booked') return 'Already Booked';
    if (userBookingStatus === 'waitlisted') return 'Already on Waitlist';
    if (classData?.state === 'booking_closed') return 'Booking Closed';
    if (classData?.state !== 'published') return 'Not Available';
    return userBookingStatus === 'full' ? 'Join Waitlist' : 'Book Class';
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (error || !classData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Error: {error || 'Class not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAvailable = classData.bookedCount < classData.capacity;
  const availableSpots = classData.capacity - classData.bookedCount;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{classData.classTypeName}</Text>
        <View
          style={[styles.stateBadge, { backgroundColor: getStatusColor(userBookingStatus) }]}>
          <Text style={styles.stateBadgeText}>{getStatusLabel(userBookingStatus)}</Text>
        </View>
      </View>

      {(userBookingStatus === 'booked' || userBookingStatus === 'waitlisted') && (
        <View
          style={[
            styles.bookingStatusCard,
            {
              borderLeftColor: userBookingStatus === 'booked' ? '#4caf50' : '#ff9800',
              backgroundColor: userBookingStatus === 'booked' ? '#e8f5e9' : '#fff3e0',
            },
          ]}>
          <Text
            style={[
              styles.bookingStatusText,
              {
                color: userBookingStatus === 'booked' ? '#2e7d32' : '#e65100',
              },
            ]}>
            ✓ You are {userBookingStatus === 'booked' ? 'booked for this class' : 'on the waitlist'}
          </Text>
        </View>
      )}

      {mutationError && (
        <View style={styles.errorCard}>
          <Text style={styles.errorCardText}>{mutationError}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date & Time</Text>
        <Text style={styles.sectionContent}>
          {classData.scheduledDate} at {classData.scheduledTime}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coach</Text>
        <Text style={styles.sectionContent}>{classData.coachName}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Availability</Text>
        <Text style={styles.sectionContent}>
          {isAvailable
            ? `${availableSpots}/${classData.capacity} spots available`
            : `Fully booked (Waitlist available)`}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <Text style={styles.sectionContent}>{classData.state}</Text>
      </View>

      {classData.state === 'published' && (
        <TouchableOpacity
          style={[styles.bookButton, isBookingDisabled && styles.bookButtonDisabled]}
          onPress={handleBookClass}
          disabled={isBookingDisabled}>
          {isSubmitting && userBookingStatus !== 'booked' && userBookingStatus !== 'waitlisted' ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.bookButtonText}>{getBookButtonText()}</Text>
          )}
        </TouchableOpacity>
      )}

      {(userBookingStatus === 'booked' || userBookingStatus === 'waitlisted') && (
        <TouchableOpacity
          style={[styles.cancelButton, isSubmitting && styles.cancelButtonDisabled]}
          onPress={handleCancelBooking}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back to Schedule</Text>
      </TouchableOpacity>
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  stateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  stateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  bookingStatusCard: {
    borderLeftWidth: 4,
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  bookingStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorCard: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorCardText: {
    fontSize: 14,
    color: '#c62828',
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionContent: {
    fontSize: 16,
    color: '#000',
  },
  bookButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 12,
    justifyContent: 'center',
    minHeight: 48,
  },
  bookButtonDisabled: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButtonDisabled: {
    backgroundColor: '#ffb3b3',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
    marginBottom: 32,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0a7ea4',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
});
