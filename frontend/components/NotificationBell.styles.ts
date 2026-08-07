import { StyleSheet } from 'react-native';
import { Ground, Space, Status } from '@/constants/design';

export const styles = StyleSheet.create({
  container: {
    padding: Space.sm,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    // Two Reds: unread urgency reads in the deeper danger red, never the accent.
    backgroundColor: Status.danger,
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.xs,
    // A thin ground-colored ring lifts the badge off the bell glyph.
    borderWidth: 2,
    borderColor: Ground.surface,
  },
  badgeText: {
    // Face/size/tone come from the Text primitive; keep the count optically centered.
    lineHeight: 14,
  },
});
