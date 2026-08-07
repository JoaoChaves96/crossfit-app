import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Radius, Space, Status, Ink, Ground, Accent } from '@/constants/design';

/**
 * Clean Ink status chip — a quiet, filled pill.
 *
 * Tones map to the world's status roles: open (muted green), accent
 * (booked/active — crimson wash), danger (waitlisted/full — deeper red),
 * neutral (closed/completed/in-progress). Text tints from the same hue as the
 * fill, never a flat gray on a colored wash.
 */
export type ChipTone = 'open' | 'accent' | 'danger' | 'neutral';

const TONE: Record<ChipTone, { bg: string; fg: string }> = {
  open: { bg: Status.openWash, fg: Status.open },
  accent: { bg: Accent.wash, fg: Accent.pressed },
  danger: { bg: Status.dangerWash, fg: Status.danger },
  neutral: { bg: Ground.sunken, fg: Ink.muted },
};

export function StatusChip({ tone, label }: { tone: ChipTone; label: string }) {
  const c = TONE[tone];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text size="label" weight="semibold" tone={c.fg} upper tracking="wide">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: Radius.chip,
    paddingHorizontal: Space.sm + 2,
    paddingVertical: Space.xs,
    alignSelf: 'flex-start',
  },
});
