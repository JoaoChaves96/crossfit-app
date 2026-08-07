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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  cardGrid: {
    flexDirection: 'row',
    gap: Space.base,
  },
  gridCol: {
    flex: 1,
    gap: Space.base,
  },
});

// ── Shared / mobile ─────────────────────────────────────────────────────────
export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ground.base,
  },
  // Header — white surface bar with a hairline bottom rule (mirrors the pilot)
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
  // Body below the header
  body: {
    flex: 1,
    paddingHorizontal: Space.lg,
    paddingTop: Space.base,
  },
  // Segmented toggle wrapper
  controls: {
    marginBottom: Space.md,
  },
  // List
  listContent: {
    paddingTop: Space.xs,
    paddingBottom: Space.xl,
    gap: Space.md,
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
  // Recessed treatment for a did-not-attend past card (tonal ground, not opacity)
  cardCancelled: {
    backgroundColor: Ground.sunken,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleWrap: {
    flex: 1,
    marginRight: Space.sm,
  },
  // Metadata block (date · time / space / coach)
  cardMeta: {
    gap: Space.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  detailText: {
    flex: 1,
  },
  // Actions
  cardActions: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  actionItem: {
    flex: 1,
  },
  // Attendance row (past cards)
  attendedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
  },
  // Empty state
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
    maxWidth: 260,
    lineHeight: Type.lineHeight.relaxed,
  },
  emptyButton: {
    marginTop: Space.sm,
  },
  // States
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Space.jumbo,
  },
});
