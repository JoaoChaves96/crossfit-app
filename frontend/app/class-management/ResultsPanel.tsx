import React from 'react';
import { Text, View } from 'react-native';
import { components } from '@/types/api.gen';
import { styles } from './class-management.styles';

type ClassResultItem = components['schemas']['ClassResultItemDto'];

const METRIC_LABEL: Record<ClassResultItem['metricType'], string> = {
  time: 'Time',
  reps: 'Reps',
  weight: 'Weight',
  rounds: 'Rounds',
  note: 'Note',
};

interface ResultsPanelProps {
  results: ClassResultItem[];
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
            const valueWithUnit =
              result.unit !== 'none' ? `${result.value} ${result.unit}` : result.value;
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
                      {result.userId.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.athleteName} numberOfLines={1}>
                    {result.userId}
                  </Text>
                </View>
                <View style={styles.resColMetric}>
                  <Text style={styles.resMetricText}>
                    {METRIC_LABEL[result.metricType] ?? result.metricType}
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
