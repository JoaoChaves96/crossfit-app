import { StyleSheet } from 'react-native';
import {
  Ground,
  Line,
  Accent,
  Status,
  Ink,
  Space,
  Radius,
  Elevation,
  Type,
} from '@/constants/design';

// ── Desktop layout ────────────────────────────────────────────────────────────
export const desktopStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  contentArea: {
    alignItems: 'center',
    paddingVertical: Space.xxl,
    paddingHorizontal: Space.jumbo,
  },
  innerWrap: {
    width: 640,
    maxWidth: '100%',
    gap: Space.lg,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  // Action wrapper on desktop: no docked-bar chrome — the crimson button sits on
  // Ground.base flush to the 640 card column (the mobile white band would orphan here).
  actionSection: {},
});

// ── Shared / mobile ─────────────────────────────────────────────────────────
export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  centered: {
    flex: 1,
    backgroundColor: Ground.base,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Space.lg,
    gap: Space.base,
  },

  // Header (mobile) — white surface, hairline bottom rule
  header: {
    backgroundColor: Ground.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },

  // Subtitle row (date)
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.lg,
    paddingTop: Space.md,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Space.lg,
    gap: Space.base,
    paddingBottom: Space.xl,
  },

  // Card container (programming / form)
  card: {
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    padding: Space.base,
    borderWidth: 1,
    borderColor: Line.hairline,
    gap: Space.md,
    ...Elevation.card,
  },

  // Programming
  progContent: {
    lineHeight: Type.lineHeight.body,
  },
  progToggle: {
    marginTop: Space.xs,
  },

  // Not-loggable warning — quiet neutral wash row
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    padding: Space.md,
    backgroundColor: Ground.sunken,
    borderRadius: Radius.control,
  },
  warningText: {
    flex: 1,
  },

  // Form
  editStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },

  // Field group
  fieldGroup: {
    gap: Space.sm,
  },

  // Metric row (value input + unit control side by side)
  metricRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Space.md,
  },
  metricInputWrap: {
    flex: 1,
    gap: Space.sm,
  },
  unitColumn: {
    width: 140,
  },

  // Text inputs — hairline field, accent border on focus
  input: {
    height: 46,
    borderRadius: Radius.control,
    backgroundColor: Ground.surface,
    borderWidth: 1,
    borderColor: Line.divider,
    paddingHorizontal: Space.base,
    fontFamily: Type.family.semibold,
    fontSize: Type.size.body,
    color: Ink.strong,
  },
  inputMultiline: {
    height: undefined,
    minHeight: 72,
    paddingTop: Space.md,
    paddingBottom: Space.md,
    fontFamily: Type.family.regular,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: Accent.base,
  },

  // Single fixed unit — quiet pill
  unitStatic: {
    height: 46,
    borderRadius: Radius.control,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Notes
  notesWrap: {
    gap: Space.sm,
  },

  // Submit error — danger wash card, danger text
  errorCard: {
    backgroundColor: Status.dangerWash,
    borderRadius: Radius.control,
    padding: Space.md,
  },

  // Docked action bar (mobile) — white surface, hairline top rule
  actionSection: {
    backgroundColor: Ground.surface,
    borderTopWidth: 1,
    borderTopColor: Line.hairline,
    paddingTop: Space.md,
    paddingHorizontal: Space.lg,
    paddingBottom: Space.xl,
  },
});
