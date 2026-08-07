import { StyleSheet } from 'react-native';
import { Ground, Line, Radius, Space } from '@/constants/design';

export const styles = StyleSheet.create({
  sidebar: {
    width: 220,
    backgroundColor: Ground.base,
    paddingHorizontal: Space.base,
    paddingVertical: Space.xl,
    gap: Space.xs,
  },
  sidebarLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingBottom: Space.lg,
  },
  navGroup: {
    gap: Space.hair,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.control,
  },
  navItemActive: {
    backgroundColor: Ground.sunken,
  },
  navItemDisabled: {
    opacity: 0.4,
  },
  // Log Out pinned to the foot of the nav shell.
  footer: {
    marginTop: 'auto',
    paddingTop: Space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Line.hairline,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.control,
  },
});
