import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';

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

type BookingStatus = 'booked' | 'waitlisted' | 'open' | 'full';

interface EnrichedClass extends ClassScheduleItem {
  userBookingStatus: BookingStatus;
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentGymId } = useGym();

  const [classes, setClasses] = useState<EnrichedClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !currentGymId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const client = createApiClient({ token });

        // Fetch both schedule and bookings in parallel
        const [scheduleResponse, bookingsResponse] = await Promise.all([
          client.get<GetClassScheduleResponse>(`/api/gyms/${currentGymId}/classes`),
          client.get<GetUserBookingsResponse>('/api/me/bookings'),
        ]);

        // Create a Map of classId -> booking status for O(1) lookups
        const bookingMap = new Map<string, 'booked' | 'waitlisted'>();
        bookingsResponse.bookings.forEach((booking) => {
          bookingMap.set(booking.classId, booking.status);
        });

        // Merge booking state into classes
        const enrichedClasses: EnrichedClass[] = scheduleResponse.classes.map((cls) => {
          let userBookingStatus: BookingStatus;

          if (bookingMap.has(cls.id)) {
            // User has a booking for this class
            userBookingStatus = bookingMap.get(cls.id)!;
          } else if (cls.bookedCount >= cls.capacity) {
            // Class is full and user hasn't booked
            userBookingStatus = 'full';
          } else {
            // Class is open and user hasn't booked
            userBookingStatus = 'open';
          }

          return {
            ...cls,
            userBookingStatus,
          };
        });

        setClasses(enrichedClasses);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load classes';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token, currentGymId]);

  const handleClassPress = (classId: string) => {
    if (!currentGymId) return;
    router.push({
      pathname: '/class-details',
      params: { gymId: currentGymId, classId },
    });
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
        return '#4caf50'; // Green
      case 'waitlisted':
        return '#ff9800'; // Orange
      case 'full':
        return '#f44336'; // Red
      case 'open':
        return '#2196f3'; // Blue
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
        <Text style={styles.classType}>{item.classTypeName}</Text>
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
  classType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
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
  },
  bookedIndicatorText: {
    fontSize: 13,
    color: '#2e7d32',
    fontWeight: '500',
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
