import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Space, Radius, Elevation, Type } from '@/constants/design';

// ── Desktop layout ────────────────────────────────────────────────────────────
export const desktopStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  contentArea: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Space.xxl,
    paddingHorizontal: Space.jumbo,
  },
  innerWrap: {
    width: 1000,
    maxWidth: '100%',
    flex: 1,
    gap: Space.xl,
  },
  cardGrid: {
    flexDirection: 'row',
    gap: Space.base,
  },
  gridCol: {
    flex: 1,
    gap: Space.base,
  },
  controls: {
    gap: Space.base,
  },
});

// ── Shared / mobile ─────────────────────────────────────────────────────────
export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  // Header
  header: {
    backgroundColor: Ground.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },
  // Controls (Week/Day toggle + class-type chips)
  controls: {
    gap: Space.md,
    marginBottom: Space.xs,
  },
  // List
  listContent: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.base,
    paddingBottom: Space.xl,
    gap: Space.md,
  },
  // Date separator — a quiet day label with a trailing hairline
  dateSep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingTop: Space.sm,
    marginBottom: Space.xs,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: Line.hairline,
  },
  // Card
  card: {
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    padding: Space.base,
    gap: Space.md,
    borderWidth: 1,
    borderColor: Line.hairline,
    ...Elevation.card,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardMeta: {
    gap: Space.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  // Filtered-empty (controls active but nothing matches)
  filteredEmpty: {
    paddingVertical: Space.jumbo,
    alignItems: 'center',
  },
  // States
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Space.jumbo,
  },
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
  emptyDesc: {
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: Type.lineHeight.relaxed,
    marginTop: Space.xs,
  },
  // Quiet plan-cutoff note — no border, no background, sits at the end of the
  // list on both registers.
  cutoffNote: {
    paddingHorizontal: Space.base,
    paddingTop: Space.lg,
    paddingBottom: Space.xl,
  },
});
