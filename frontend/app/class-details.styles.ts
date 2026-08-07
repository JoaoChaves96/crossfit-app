import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Status, Space, Radius, Elevation, Type } from '@/constants/design';

// ── Desktop layout (side-by-side) ─────────────────────────────────────────────
export const desktopStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  contentArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: Space.xxl,
    paddingHorizontal: Space.jumbo,
    gap: Space.xxl,
  },
  leftCol: {
    width: 520,
    gap: Space.xl,
  },
  rightCol: {
    width: 400,
    gap: Space.xl,
  },
  // White surface cards on the desktop's Ground.base ground.
  rightCard: {
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    padding: Space.xl,
    borderWidth: 1,
    borderColor: Line.hairline,
    gap: Space.md,
    ...Elevation.card,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  actionContainer: {
    gap: Space.md,
  },
});

// ── Shared / mobile ───────────────────────────────────────────────────────────
export const styles = StyleSheet.create({
  // A single white surface for the mobile detail page.
  screen: {
    flex: 1,
    backgroundColor: Ground.surface,
  },
  centered: {
    flex: 1,
    backgroundColor: Ground.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Space.lg,
    gap: Space.base,
  },

  // Header — white surface with a hairline bottom rule (pilot pattern).
  header: {
    backgroundColor: Ground.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.lg,
    paddingBottom: Space.xl,
    gap: Space.xl,
  },

  // Meta rows
  metaGroup: {
    gap: Space.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },

  // Divider (hairline)
  divider: {
    height: 1,
    backgroundColor: Line.hairline,
  },

  // Section groups
  sectionGap8: {
    gap: Space.sm,
  },
  sectionGap10: {
    gap: Space.md,
  },

  // Capacity
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityBarBg: {
    flexDirection: 'row',
    height: Space.sm,
    borderRadius: Radius.chip,
    backgroundColor: Ground.sunken,
    overflow: 'hidden',
  },
  capacityBarFill: {
    height: Space.sm,
    borderRadius: Radius.chip,
    backgroundColor: Ink.strong,
  },

  // Booking status — a status chip beside its descriptive line.
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  statusText: {
    flex: 1,
  },

  // Programming
  programBlock: {
    gap: Space.xs,
  },
  programText: {
    lineHeight: Type.lineHeight.relaxed,
  },

  // Recent result
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Mutation error
  mutationErrorCard: {
    backgroundColor: Status.dangerWash,
    borderLeftWidth: Space.xs,
    borderLeftColor: Status.danger,
    borderRadius: Radius.control,
    padding: Space.md,
  },

  // Action button area
  actionContainer: {
    paddingTop: Space.md,
    paddingHorizontal: Space.lg,
    paddingBottom: Space.xxl,
    gap: Space.md,
  },
});
