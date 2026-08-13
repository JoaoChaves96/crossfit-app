import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text, StatusChip, Icon } from '@/components/cleanink';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { components } from '@/types/api.gen';
import { formatMetricLabel, formatResultValue } from '@/utils/result-format';
import { styles } from './class-management.styles';

type ClassResultItem = components['schemas']['ClassResultItemDto'];

/** Shown wherever a result carries no note. */
const NO_NOTES = '—';

/**
 * Longest note rendered inline in the desktop table before it is elided. The
 * mobile accordion never truncates — it has the room, so it shows the whole note.
 */
const DESKTOP_NOTES_MAX = 12;

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

/** A result's note text, or null when it has none (empty string counts as none). */
function notesOf(result: ClassResultItem): string | null {
  return result.notes != null && result.notes.length > 0 ? result.notes : null;
}

/** The athlete avatar + name pair shared by both layouts. */
function AthleteCell({ name }: { name: string }) {
  return (
    <View style={styles.tableRowName}>
      <View style={styles.avatar}>
        <Text size="label" weight="semibold" tone="muted">{initialsFor(name)}</Text>
      </View>
      <Text size="meta" numberOfLines={1}>{name}</Text>
    </View>
  );
}

function ResultsEmpty() {
  return (
    <View style={styles.tableEmpty}>
      <Text size="meta" tone="faint">No results logged yet</Text>
    </View>
  );
}

// ─── Desktop: four-column table ───────────────────────────────────────────────

function ResultsTable({ results }: ResultsPanelProps) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <View style={styles.tableColFill}>
          <Text size="label" weight="semibold" tone="faint" upper>Athlete</Text>
        </View>
        <View style={styles.resColMetric}>
          <Text size="label" weight="semibold" tone="faint" upper>Metric</Text>
        </View>
        <View style={styles.resColValue}>
          <Text size="label" weight="semibold" tone="faint" upper>Value</Text>
        </View>
        <View style={styles.resColNotes}>
          <Text size="label" weight="semibold" tone="faint" upper>Notes</Text>
        </View>
      </View>
      {results.length === 0 ? (
        <ResultsEmpty />
      ) : (
        results.map((result) => {
          const notes = notesOf(result);
          const shownNotes =
            notes == null
              ? NO_NOTES
              : notes.length > DESKTOP_NOTES_MAX
                ? `${notes.slice(0, DESKTOP_NOTES_MAX)}…`
                : notes;
          return (
            <View key={result.id} style={styles.tableRow}>
              <View style={styles.tableColFill}>
                <AthleteCell name={result.userName} />
              </View>
              <View style={styles.resColMetric}>
                <Text size="meta" tone="muted">{formatMetricLabel(result.metricType)}</Text>
              </View>
              <View style={styles.resColValue}>
                <Text size="meta" weight="medium">{formatTableValue(result)}</Text>
              </View>
              <View style={styles.resColNotes}>
                <Text size="meta" tone="muted">{shownNotes}</Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

// ─── Mobile: one expandable row per athlete ───────────────────────────────────

interface ResultRowProps {
  result: ClassResultItem;
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Collapsed, a row shows only what an owner scans for: who logged, and the
 * value. Metric and the full (untruncated) note live in the expansion, so no
 * column has to compete for a phone's width.
 */
function ResultRow({ result, expanded, onToggle }: ResultRowProps) {
  const notes = notesOf(result);
  return (
    <View>
      <TouchableOpacity
        testID={`result-row-${result.id}`}
        style={styles.tableRow}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${result.userName}, ${formatMetricLabel(result.metricType)} ${formatTableValue(result)}`}
        activeOpacity={0.7}>
        <AthleteCell name={result.userName} />
        <Text size="meta" weight="medium">{formatTableValue(result)}</Text>
        <Icon name={expanded ? 'chevronDown' : 'chevronForward'} size={16} tone="faint" />
      </TouchableOpacity>
      {expanded && (
        <View testID={`result-detail-${result.id}`} style={styles.resDetail}>
          <View style={styles.resDetailPair}>
            <Text size="label" weight="semibold" tone="faint" upper>Metric</Text>
            <Text size="meta">{formatMetricLabel(result.metricType)}</Text>
          </View>
          <View style={styles.resDetailPair}>
            <Text size="label" weight="semibold" tone="faint" upper>Notes</Text>
            <Text size="meta" tone={notes == null ? 'faint' : 'muted'}>
              {notes ?? NO_NOTES}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function ResultsAccordion({ results }: ResultsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <View style={styles.table}>
      {results.length === 0 ? (
        <ResultsEmpty />
      ) : (
        results.map((result) => (
          <ResultRow
            key={result.id}
            result={result}
            expanded={expandedId === result.id}
            onToggle={() => setExpandedId((prev) => (prev === result.id ? null : result.id))}
          />
        ))
      )}
    </View>
  );
}

export function ResultsPanel({ results }: ResultsPanelProps) {
  const { isMobile } = useResponsiveLayout();

  return (
    <View
      testID="results-panel"
      style={[styles.listSection, isMobile && styles.sectionStackedMobile]}
    >
      <View style={styles.listHeader}>
        <Text size="title" weight="semibold">Results</Text>
        <StatusChip tone="neutral" label={`${results.length} logged`} />
      </View>
      {isMobile ? <ResultsAccordion results={results} /> : <ResultsTable results={results} />}
    </View>
  );
}
