import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { AppColors } from '@/constants/theme';
import { styles } from './training-history.styles';

// ─── Types ─────────────────────────────────────────────────────────────────────
type TrainingHistoryItem = components['schemas']['TrainingHistoryItemDto'];
type GetTrainingHistoryResponse = components['schemas']['GetTrainingHistoryResponseDto'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatScheduledAt(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// ─── Sub-components ─────────────────────────────────────────────────────────────
interface ResultBadgeProps {
  hasResult: boolean;
}

function ResultBadge({ hasResult }: ResultBadgeProps) {
  const label = hasResult ? 'Logged' : 'Not Logged';
  const color = hasResult ? AppColors.successMaterial : AppColors.textGray500;
  const bg = hasResult ? AppColors.successBgFaint : AppColors.backgroundSubtle;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

interface HistoryCardProps {
  item: TrainingHistoryItem;
  onPress: () => void;
}

function HistoryCard({ item, onPress }: HistoryCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleGroup}>
          <Text style={styles.cardTitle}>{item.className}</Text>
          <Text style={styles.cardDate}>{formatScheduledAt(item.scheduledAt)}</Text>
        </View>
        <ResultBadge hasResult={item.result !== null} />
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.cardChevron}>{'›'}</Text>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🕐</Text>
      <Text style={styles.emptyTitle}>No attended classes yet</Text>
      <Text style={styles.emptyDesc}>Your completed classes will appear here.</Text>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────────
export default function TrainingHistoryScreen() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { currentGymId, isLoading: gymLoading } = useGym();

  const [history, setHistory] = useState<TrainingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (authLoading || gymLoading || !token || !currentGymId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const client = createApiClient({ token });
      const response = await client.get<GetTrainingHistoryResponse>(
        `/api/gyms/${currentGymId}/athletes/me/history`,
      );

      setHistory(response.history);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load training history';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, gymLoading, token, currentGymId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory]),
  );

  const handleCardPress = (classId: string) => {
    if (!currentGymId) return;
    router.push({
      pathname: '/log-results',
      params: { classId, gymId: currentGymId },
    });
  };

  if (!token || !currentGymId) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Please select a gym and log in to view your history.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={AppColors.textDark3} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentWrap}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Training History</Text>
        </View>

        {history.length === 0 ? (
          <EmptyState />
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.classId}
            renderItem={({ item }) => (
              <HistoryCard item={item} onPress={() => handleCardPress(item.classId)} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

