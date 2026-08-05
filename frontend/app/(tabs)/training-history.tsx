import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatResultValue, formatMetricLabel } from '@/utils/result-format';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { DesktopTopNav } from '@/components/DesktopTopNav';
import { NotificationBell } from '@/components/NotificationBell';
import { styles, desktopStyles } from './training-history.styles';

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
interface ResultDisplayProps {
  result: TrainingHistoryItem['result'];
}

function ResultDisplay({ result }: ResultDisplayProps) {
  if (result === null) {
    return (
      <View style={[styles.badge, { backgroundColor: AppColors.backgroundSubtle }]}>
        <Text style={[styles.badgeText, { color: AppColors.textGray500 }]}>Not Logged</Text>
      </View>
    );
  }

  return (
    <View style={styles.resultDisplay}>
      <Text style={styles.resultValue}>{formatResultValue(result)}</Text>
      <Text style={styles.resultMetric}>{formatMetricLabel(result.metricType)}</Text>
    </View>
  );
}

interface HistoryCardProps {
  item: TrainingHistoryItem;
  onPress: () => void;
}

function HistoryCard({ item, onPress }: HistoryCardProps) {
  return (
    <TouchableOpacity testID={`training-history-card-${item.classId}`} style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleGroup}>
          <Text style={styles.cardTitle}>{item.className}</Text>
          <Text style={styles.cardDate}>{formatScheduledAt(item.scheduledAt)}</Text>
          <View style={styles.coachRow}>
            <Text style={styles.coachIcon}>👤</Text>
            <Text style={styles.coachText}>Coach {item.coachName}</Text>
          </View>
        </View>
        <ResultDisplay result={item.result} />
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
  const { isDesktop } = useResponsiveLayout();
  const insets = useSafeAreaInsets();

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
      <View style={isDesktop ? desktopStyles.screen : [styles.container, styles.centerContent]}>
        {isDesktop && <DesktopTopNav />}
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.errorText}>Please select a gym and log in to view your history.</Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={isDesktop ? desktopStyles.screen : [styles.container, styles.centerContent]}>
        {isDesktop && <DesktopTopNav />}
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={AppColors.textDark3} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={isDesktop ? desktopStyles.screen : [styles.container, styles.centerContent]}>
        {isDesktop && <DesktopTopNav />}
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  // ── Desktop layout ────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={desktopStyles.screen}>
        <DesktopTopNav />
        <View style={desktopStyles.contentArea}>
          <View style={desktopStyles.innerWrap}>
            <Text style={styles.headerTitle}>Training History</Text>
            {history.length === 0 ? (
              <EmptyState />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                <View style={{ gap: 12 }}>
                  {history.map((item) => (
                    <HistoryCard key={item.classId} item={item} onPress={() => handleCardPress(item.classId)} />
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.contentWrap}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Training History</Text>
          <NotificationBell />
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

