import { StyleSheet } from 'react-native';
import { Ground, Line, Radius, Space, Elevation, Ink, Type, Status } from '@/constants/design';

// ─── Desktop Styles ─────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Ground.base,
  },

  // Main area
  main: {
    flex: 1,
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.xl,
    gap: Space.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.base,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.control,
    backgroundColor: Ground.surface,
    borderWidth: 1,
    borderColor: Line.divider,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },

  // Content row
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    gap: Space.lg,
  },

  // Panels
  infoPanel: {
    width: 320,
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.xl,
    gap: Space.base,
    ...Elevation.card,
  },
  progPanel: {
    flex: 1,
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.xl,
    gap: Space.base,
    ...Elevation.card,
  },

  // Shared field/list bits
  separator: {
    height: 1,
    backgroundColor: Line.hairline,
  },
  fieldBlock: {
    gap: Space.hair,
  },
  bookedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Ground.base,
    borderRadius: Radius.control,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
  },

  // Programming panel bits
  progHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loggableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  progFeedback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.lg,
  },
  // WOD display block — a quiet sunken panel.
  wodContent: {
    backgroundColor: Ground.base,
    borderRadius: Radius.control,
    padding: Space.base,
  },
  emptyProgramming: {
    backgroundColor: Ground.base,
    borderRadius: Radius.control,
    padding: Space.base,
    alignItems: 'center',
  },
  // Replaces the whole edit form once the class is past editing.
  lockedNotice: {
    lineHeight: Type.lineHeight.relaxed,
  },
  // Applied to the TextInput itself; the face must be named explicitly since a
  // TextInput can't route through the Text primitive.
  // Height is applied inline from measured content (auto-grow).
  progInput: {
    borderWidth: 1,
    borderColor: Line.divider,
    borderRadius: Radius.control,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    backgroundColor: Ground.surface,
    color: Ink.strong,
    fontFamily: Type.family.regular,
    fontSize: Type.size.body,
    lineHeight: Type.lineHeight.body,
  },
  // Save error banner — deeper red, distinct from the accent.
  errorBanner: {
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Status.danger,
    backgroundColor: Status.dangerWash,
    padding: Space.md,
  },
  // Footer holding the quiet saved/updated meta and the save action.
  progFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.md,
  },
  saveWrap: {
    minWidth: 180,
  },
});

// ─── Mobile Styles (≤768px) ────────────────────────────────────────────────

export const mobileStyles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Ground.base,
  },
  main: {
    flex: 1,
    paddingHorizontal: Space.base,
    paddingVertical: Space.base,
  },
  // Trailing room so the Save button below the input can also clear the
  // keyboard once the focused field has been scrolled up.
  scrollContent: {
    gap: Space.base,
    paddingBottom: Space.jumbo,
  },

  // Header
  header: {
    flexDirection: 'column',
    gap: Space.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    paddingHorizontal: Space.sm,
    paddingVertical: Space.sm,
    marginLeft: -Space.xs,
    minHeight: 44,
  },

  // Content — stacked single column
  contentColumn: {
    flex: 1,
    gap: Space.base,
  },

  // Panels
  infoPanel: {
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.base,
    gap: Space.base,
    ...Elevation.card,
  },
  progPanel: {
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.base,
    gap: Space.base,
    ...Elevation.card,
  },

  // Compact 2-col info grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoGridCell: {
    width: '50%',
    marginBottom: Space.base,
    gap: Space.hair,
  },

  // Shared field/list bits
  separator: {
    height: 1,
    backgroundColor: Line.hairline,
  },
  fieldBlock: {
    gap: Space.hair,
  },
  bookedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Ground.base,
    borderRadius: Radius.control,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
  },

  // Programming panel bits
  progHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loggableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  progFeedback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.lg,
  },
  wodContent: {
    backgroundColor: Ground.base,
    borderRadius: Radius.control,
    padding: Space.base,
  },
  emptyProgramming: {
    backgroundColor: Ground.base,
    borderRadius: Radius.control,
    padding: Space.base,
    alignItems: 'center',
  },
  // Replaces the whole edit form once the class is past editing.
  lockedNotice: {
    lineHeight: Type.lineHeight.relaxed,
  },
  // Height is applied inline from measured content (auto-grow).
  progInput: {
    borderWidth: 1,
    borderColor: Line.divider,
    borderRadius: Radius.control,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    backgroundColor: Ground.surface,
    color: Ink.strong,
    fontFamily: Type.family.regular,
    fontSize: Type.size.body,
    lineHeight: Type.lineHeight.body,
  },
  errorBanner: {
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Status.danger,
    backgroundColor: Status.dangerWash,
    padding: Space.md,
  },
  // Mobile: meta stacks above a full-width save button.
  progFooter: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: Space.sm,
  },
  saveWrap: {
    width: '100%',
  },
});
