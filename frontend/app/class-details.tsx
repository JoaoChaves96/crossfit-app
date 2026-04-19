import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { createApiClient } from '@/utils/api-client';

interface ClassDetailsItem {
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

interface GetUserBookingsResponse {
  bookings: UserBookingItem[];
}

type BookingStatus = 'booked' | 'waitlisted' | 'open' | 'full';

export default function ClassDetailsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { gymId, classId } = useLocalSearchParams();

  const [classData, setClassData] = useState<ClassDetailsItem | null>(null);
  const [userBookingStatus, setUserBookingStatus] = useState<BookingStatus>('open');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !gymId || !classId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const client = createApiClient({ token });

        // Fetch both schedule and bookings
        const [scheduleResponse, bookingsResponse] = await Promise.all([
          client.get<{ classes: ClassDetailsItem[] }>(`/api/gyms/${gymId}/classes`),
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
        } else if (found.bookedCount >= found.capacity) {
          setUserBookingStatus('full');
        } else {
          setUserBookingStatus('open');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load class details';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token, gymId, classId]);

  const handleBookClass = () => {
    // Booking action will be implemented in the next phase
    alert('Booking feature coming soon');
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
    classData?.state === 'archived';

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
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
          <Text style={styles.bookButtonText}>{getBookButtonText()}</Text>
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
    marginVertical: 16,
  },
  bookButtonDisabled: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
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
