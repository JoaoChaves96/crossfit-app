/*
 * ─── Clean Ink · Athlete Training History (restyle) ──────────────────────────
 * Direct sibling of the my-bookings pilot: same card language, same
 * white-surface hairline header, same empty/loading/error treatment, same
 * responsive registers (mobile single-column list / desktop centered grid).
 * Only the visual world changes — data fetching, handlers, copy, and
 * lifecycle/tenant logic are preserved exactly. No emoji as UI; drawn Ionicons.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { Space, Accent, Ink, Status } from '@/constants/design';
import { SafeScreen } from '@/components/SafeScreen';
import { formatResultValue, formatMetricLabel } from '@/utils/result-format';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { DesktopTopNav } from '@/components/DesktopTopNav';
import { NotificationBell } from '@/components/NotificationBell';
import { Text, Icon, StatusChip } from '@/components/cleanink';
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
    // Metric label reads as a quiet neutral chip — not an active selection.
    return <StatusChip tone="neutral" label="Not Logged" />;
  }

  return (
    <View style={styles.resultDisplay}>
      <Text size="lead" weight="bold" tracking="tight">{formatResultValue(result)}</Text>
      <StatusChip tone="neutral" label={formatMetricLabel(result.metricType)} />
    </View>
  );
}

interface HistoryCardProps {
  item: TrainingHistoryItem;
  onPress: () => void;
}

function HistoryCard({ item, onPress }: HistoryCardProps) {
  return (
    <TouchableOpacity
      testID={`training-history-card-${item.classId}`}
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardTitleWrap}>
          <Text size="title" weight="semibold" tracking="snug">{item.className}</Text>
          <Text size="meta" tone={Ink.muted}>{formatScheduledAt(item.scheduledAt)}</Text>
        </View>
        <ResultDisplay result={item.result} />
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.detailRow}>
          <Icon name="coach" size={15} tone={Ink.faint} />
          <Text size="meta" tone={Ink.muted} style={styles.detailText}>Coach {item.coachName}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Icon name="time" size={30} tone={Ink.faint} />
      </View>
      <Text size="title" weight="bold" tracking="snug">No attended classes yet</Text>
      <Text size="body" tone={Ink.muted} style={styles.emptyDesc}>
        Your completed classes will appear here.
      </Text>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────────
export default function TrainingHistoryScreen() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { currentGymId, isLoading: gymLoading } = useGym();
  const { isDesktop } = useResponsiveLayout();

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
      <View style={isDesktop ? desktopStyles.screen : styles.screen}>
        {isDesktop && <DesktopTopNav />}
        <View style={styles.centeredState}>
          <Text size="body" tone={Ink.muted} style={{ textAlign: 'center' }}>
            Please select a gym and log in to view your history.
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={isDesktop ? desktopStyles.screen : styles.screen}>
        {isDesktop && <DesktopTopNav />}
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={Accent.base} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={isDesktop ? desktopStyles.screen : styles.screen}>
        {isDesktop && <DesktopTopNav />}
        <View style={styles.centeredState}>
          <Text size="body" tone={Status.danger} style={{ textAlign: 'center' }}>{error}</Text>
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
            <View style={desktopStyles.headerRow}>
              <Text size="screen" weight="bold" tracking="tight">Training History</Text>
            </View>
            {history.length === 0 ? (
              <EmptyState />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                <View style={desktopStyles.cardGrid}>
                  {[0, 1].map((colIdx) => (
                    <View key={colIdx} style={desktopStyles.gridCol}>
                      {history
                        .filter((_, index) => index % 2 === colIdx)
                        .map((item) => (
                          <HistoryCard
                            key={item.classId}
                            item={item}
                            onPress={() => handleCardPress(item.classId)}
                          />
                        ))}
                    </View>
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
    <View style={styles.screen}>
      <SafeScreen style={styles.header} extraTopPadding={Space.md}>
        <Text size="screen" weight="bold" tracking="tight">Training History</Text>
        <NotificationBell />
      </SafeScreen>

      <View style={styles.body}>
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
