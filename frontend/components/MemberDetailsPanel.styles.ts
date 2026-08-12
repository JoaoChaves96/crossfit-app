import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Radius, Space, Elevation, Status } from '@/constants/design';

export const styles = StyleSheet.create({
  // ── Desktop side panel ────────────────────────────────────────────────────
  panel: {
    width: 380,
    backgroundColor: Ground.surface,
    borderLeftWidth: 1,
    borderLeftColor: Line.divider,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.lg,
    gap: Space.lg,
  },

  // ── Mobile bottom sheet ───────────────────────────────────────────────────
  backdropRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,26,26,0.45)',
  },
  sheet: {
    backgroundColor: Ground.surface,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: Space.sm,
    paddingBottom: Space.xl,
    paddingHorizontal: Space.base,
    maxHeight: '85%',
    gap: Space.base,
    ...Elevation.raised,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Line.divider,
    marginBottom: Space.xs,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.md,
  },
  headerInfo: {
    flex: 1,
    gap: Space.hair,
  },
  closeBtn: {
    padding: Space.xs,
  },

  // ── Field rows ────────────────────────────────────────────────────────────
  field: {
    gap: Space.xs,
  },
  // Lifts the plan picker above the rows below it so SelectField's desktop
  // floating menu overlays them instead of being clipped underneath.
  planField: {
    zIndex: 10,
    ...{ elevation: 10 },
  },
  input: {
    borderWidth: 1,
    borderColor: Line.divider,
    borderRadius: Radius.control,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    backgroundColor: Ground.surface,
    color: Ink.strong,
    minHeight: 46,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  expiryInput: {
    flex: 1,
  },
  inputError: {
    borderColor: Status.danger,
  },

  // ── Auto-renew toggle (monochrome; accent stays on Save) ──────────────────
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: Radius.chip,
    backgroundColor: Line.divider,
    padding: Space.hair,
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: Ink.strong,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: Radius.chip,
    backgroundColor: Ground.surface,
    alignSelf: 'flex-start',
  },
  toggleThumbRight: {
    alignSelf: 'flex-end',
  },

  divider: {
    height: 1,
    backgroundColor: Line.hairline,
  },
  actions: {
    gap: Space.sm,
  },
  errorText: {
    marginTop: Space.xs,
  },
});
