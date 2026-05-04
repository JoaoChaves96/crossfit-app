import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';

// ─── Design tokens from designs/athlete-screens.pen ───────────────────────────
const COLORS = {
  bg: '#FFFFFF',
  accent: '#333333',
  fontPrimary: '#1A1A1A',
  fontSecondary: '#666666',
  fontTertiary: '#999999',
  border: '#E0E0E0',
  danger: '#D32F2F',
  badgeLogged: '#2E7D32',
  badgeLoggedBg: '#E8F5E9',
  badgeNotLogged: '#999999',
  badgeNotLoggedBg: '#F5F5F5',
} as const;

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
  const color = hasResult ? COLORS.badgeLogged : COLORS.badgeNotLogged;
  const bg = hasResult ? COLORS.badgeLoggedBg : COLORS.badgeNotLoggedBg;

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
        <ActivityIndicator size="large" color={COLORS.accent} />
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

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 20,
  },
  header: {
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.fontPrimary,
  },
  listContent: {
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  cardTitleGroup: {
    flex: 1,
    gap: 2,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.fontPrimary,
  },
  cardDate: {
    fontSize: 13,
    color: COLORS.fontSecondary,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  cardChevron: {
    fontSize: 20,
    color: COLORS.fontTertiary,
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.fontPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.fontSecondary,
    textAlign: 'center',
    maxWidth: 220,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    textAlign: 'center',
  },
});
