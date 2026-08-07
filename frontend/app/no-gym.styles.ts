import { StyleSheet } from 'react-native';
import { Ground, Space, Type } from '@/constants/design';

/*
 * ─── Clean Ink · No-Gym zero-state (restyle) ─────────────────────────────────
 * The onboarding empty state shown to an athlete with no gym membership.
 * Mirrors the athlete pilot's empty-state treatment (centered icon-circle on a
 * sunken tonal ground + Text + a single primary Button). Only the visual world
 * changes — behavior, navigation, and copy are preserved exactly.
 */
export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  // Centered empty-state column (mirrors the pilot's emptyContainer)
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Space.jumbo,
    gap: Space.md,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Ground.sunken,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Space.xs,
  },
  title: {
    textAlign: 'center',
  },
  emptyDesc: {
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: Type.lineHeight.relaxed,
  },
  emptyButton: {
    marginTop: Space.sm,
    alignSelf: 'stretch',
  },
});
