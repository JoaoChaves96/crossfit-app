import React from 'react';
import { ScrollView, Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Accent, Ink, Ground, Line, Radius, Space } from '@/constants/design';

/**
 * Clean Ink filter chips — a horizontal rail of pills.
 * The active chip is the one place selection earns the crimson accent (a filled
 * accent pill); inactive chips are hairline-outlined on the surface.
 */
interface FilterChipsProps {
  options: string[];
  active: string;
  onChange: (value: string) => void;
  testIDPrefix?: string;
  contentStyle?: object;
}

export function FilterChips({
  options,
  active,
  onChange,
  testIDPrefix,
  contentStyle,
}: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, contentStyle]}
    >
      {options.map((opt) => {
        const isActive = opt === active;
        return (
          <Pressable
            key={opt}
            testID={testIDPrefix ? `${testIDPrefix}-${opt}` : undefined}
            onPress={() => onChange(opt)}
            style={[styles.chip, isActive ? styles.chipActive : styles.chipIdle]}
          >
            <Text
              size="meta"
              weight="semibold"
              tone={isActive ? Accent.on : Ink.muted}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Space.sm,
    paddingRight: Space.lg,
  },
  chip: {
    paddingHorizontal: Space.md + 2,
    paddingVertical: Space.sm - 1,
    borderRadius: Radius.chip,
    borderWidth: 1,
  },
  chipIdle: {
    backgroundColor: Ground.surface,
    borderColor: Line.divider,
  },
  chipActive: {
    backgroundColor: Accent.base,
    borderColor: Accent.base,
  },
});
