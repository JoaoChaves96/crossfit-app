import React from 'react';
import { Text, View } from 'react-native';
import { components } from '@/types/api.gen';
import { formatMetricLabel, formatResultValue } from '@/utils/result-format';
import { styles } from './class-management.styles';

type ClassResultItem = components['schemas']['ClassResultItemDto'];

interface ResultsPanelProps {
  results: ClassResultItem[];
}

/** Two-letter initials from a display name (e.g. "Carlos Silva" → "CS"). */
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Value shown in the owner Results table. Time results render as a clock with
 * a "min" unit per design (e.g. "18:42 min"); everything else uses the shared
 * formatter ("95 kg", "12 rounds", raw note text).
 */
function formatTableValue(result: ClassResultItem): string {
  const formatted = formatResultValue(result);
  return result.metricType === 'time' ? `${formatted} min` : formatted;
}

export function ResultsPanel({ results }: ResultsPanelProps) {
  return (
    <View style={styles.listSection}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Results</Text>
        <View style={styles.resBadge}>
          <Text style={styles.resBadgeText}>{results.length} logged</Text>
        </View>
      </View>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.tableColFill]}>Athlete</Text>
          <Text style={[styles.tableHeaderText, styles.resColMetric]}>Metric</Text>
          <Text style={[styles.tableHeaderText, styles.resColValue]}>Value</Text>
          <Text style={[styles.tableHeaderText, styles.resColNotes]}>Notes</Text>
        </View>
        {results.length === 0 ? (
          <View style={styles.tableEmpty}>
            <Text style={styles.tableEmptyText}>No results logged yet</Text>
          </View>
        ) : (
          results.map((result) => {
            const valueWithUnit = formatTableValue(result);
            const rawNotes = result.notes as unknown;
            const notesStr =
              rawNotes != null && typeof rawNotes === 'string' && rawNotes.length > 0
                ? rawNotes
                : null;
            const truncatedNotes =
              notesStr != null && notesStr.length > 12
                ? `${notesStr.slice(0, 12)}…`
                : (notesStr ?? '—');
            return (
              <View key={result.id} style={styles.tableRow}>
                <View style={[styles.tableRowName, styles.tableColFill]}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {initialsFor(result.userName)}
                    </Text>
                  </View>
                  <Text style={styles.athleteName} numberOfLines={1}>
                    {result.userName}
                  </Text>
                </View>
                <View style={styles.resColMetric}>
                  <Text style={styles.resMetricText}>
                    {formatMetricLabel(result.metricType)}
                  </Text>
                </View>
                <View style={styles.resColValue}>
                  <Text style={styles.resValueText}>{valueWithUnit}</Text>
                </View>
                <View style={styles.resColNotes}>
                  <Text style={styles.resNotesText}>{truncatedNotes}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}
