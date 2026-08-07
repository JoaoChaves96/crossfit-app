import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Accent, Radius, Space, Elevation } from '@/constants/design';

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
    gap: Space.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    gap: Space.hair,
    flexShrink: 1,
  },
  createIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Accent.base,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.control,
  },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
  },
  weekNavMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Space.sm,
  },
  navArrowBtnMobile: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Segmented Week/List toggle sizing wrapper (desktop only)
  viewToggle: {
    minWidth: 180,
  },

  // Loading / error
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.md,
  },
  retryBtn: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
  },

  // Week grid (desktop)
  gridContainer: {
    flexDirection: 'row',
    gap: Space.sm,
    flexGrow: 1,
  },
  dayColumn: {
    minWidth: 140,
    flex: 1,
    gap: Space.sm,
  },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: Space.sm,
    gap: Space.hair,
  },

  // Class card (desktop grid)
  classCard: {
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.md,
    gap: Space.xs,
    ...Elevation.card,
  },

  // Empty day
  emptyDayCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Line.divider,
    paddingVertical: Space.lg,
    paddingHorizontal: Space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Mobile shell
  mainMobile: {
    paddingHorizontal: Space.base,
    paddingVertical: Space.base,
    gap: Space.base,
  },
  headerMobile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hamburgerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Space.sm,
  },

  // Mobile day-strip + vertical card list
  dayStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: Space.hair,
    paddingVertical: Space.sm,
  },
  dayPill: {
    flex: 1,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.xs,
    borderRadius: Radius.control,
    alignItems: 'center',
    gap: Space.hair,
  },
  dayPillActive: {
    backgroundColor: Accent.base,
  },
  mobileCardList: {
    paddingBottom: Space.xl,
    gap: Space.md,
  },
  mobileClassCard: {
    backgroundColor: Ground.surface,
    borderWidth: 1,
    borderColor: Line.hairline,
    borderRadius: Radius.card,
    padding: Space.base,
    gap: Space.hair,
    ...Elevation.card,
  },
  mobileClassCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Space.xs,
  },
  mobileEmptyDay: {
    paddingVertical: Space.jumbo,
    alignItems: 'center',
  },

  // List view
  listContainer: {
    flex: 1,
  },
  emptyListContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Space.jumbo,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Space.md,
    paddingHorizontal: Space.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Line.hairline,
  },
  listRowMain: {
    gap: Space.hair,
    flexShrink: 1,
  },
});
