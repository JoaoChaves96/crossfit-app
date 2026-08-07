import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Ground, Ink, Radius, Space, Elevation } from '@/constants/design';

/**
 * Clean Ink segmented toggle — a quiet track with an ink-lifted active pill.
 * The active segment is a white surface on the sunken track (selection reads
 * through elevation + weight, not the accent — the accent stays reserved for
 * the primary action and the class-type chips).
 */
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /**
   * Exact testID for this segment, overriding the `{testIDPrefix}-{value}`
   * default. Use when a screen must keep a pre-existing testID that the
   * prefix convention would not reproduce.
   */
  testID?: string;
}

interface SegmentedToggleProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testIDPrefix?: string;
}

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix,
}: SegmentedToggleProps<T>) {
  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            testID={opt.testID ?? (testIDPrefix ? `${testIDPrefix}-${opt.value}` : undefined)}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text
              size="meta"
              weight={active ? 'semibold' : 'medium'}
              tone={active ? Ink.strong : Ink.faint}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: Ground.sunken,
    borderRadius: Radius.control,
    padding: Space.xs - 1,
    gap: Space.xs - 1,
  },
  segment: {
    flex: 1,
    height: 34,
    borderRadius: Radius.control - 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: Ground.surface,
    ...Elevation.card,
  },
});
