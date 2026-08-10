import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Radius, Space, Elevation, Status, Type } from '@/constants/design';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Ground.base,
  },

  // Sidebar
  sidebar: {
    width: 220,
    backgroundColor: Ground.surface,
    borderRightWidth: 1,
    borderRightColor: Line.hairline,
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
    gap: Space.sm,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.control,
  },
  navItemActive: {
    // Clean Ink: active nav reads as a quiet neutral fill, not the accent.
    backgroundColor: Ground.sunken,
  },
  navItemDisabled: {
    opacity: 0.4,
  },

  // Mobile top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  hamburgerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Main content
  mainScroll: {
    flex: 1,
  },
  mainContent: {
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.xl,
    gap: Space.lg,
    flexGrow: 1,
  },
  mainContentMobile: {
    paddingHorizontal: Space.base,
    paddingVertical: Space.base,
  },

  // Mobile tabs
  mobileTabsContainer: {
    flex: 1,
    gap: Space.base,
  },
  mobileTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },
  mobileTab: {
    flex: 1,
    paddingVertical: Space.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  mobileTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Ink.strong,
  },

  // Loading / error
  centeredFeedback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.xxl,
    gap: Space.md,
  },
  errorText: {
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    gap: Space.hair,
    flex: 1,
    marginRight: Space.md,
  },

  // State badge (lifecycle transition control)
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
    backgroundColor: Ground.surface,
  },
  stateBadgeDisabled: {
    opacity: 0.6,
  },

  // Info card (desktop)
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    paddingHorizontal: Space.xl,
    paddingVertical: Space.lg,
    gap: Space.xxl,
    flexWrap: 'wrap',
    ...Elevation.card,
  },
  infoItem: {
    gap: Space.hair,
    minWidth: 80,
  },

  // Mobile compact info grid (2-col)
  mobileInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Ground.surface,
    borderWidth: 1,
    borderColor: Line.hairline,
    borderRadius: Radius.card,
    padding: Space.base,
    marginBottom: Space.base,
    ...Elevation.card,
  },
  mobileInfoGridCell: {
    width: '50%',
    marginBottom: Space.md,
    gap: Space.hair,
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  actionBtnWrap: {
    minWidth: 160,
  },
  // Mobile: the primary action takes its own full-width row and the secondary
  // actions stack full-width beneath it. A phone can't fit two 160pt buttons
  // side by side, so wrapping would produce a ragged stack of stubby boxes.
  actionRowMobile: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    gap: Space.sm,
  },
  actionBtnWrapMobile: {
    width: '100%',
    minWidth: 0,
  },

  // Lists row
  listsRow: {
    flexDirection: 'row',
    gap: Space.lg,
    flex: 1,
  },

  // Programming section
  progSection: {
    gap: Space.md,
  },
  progLoggableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  progCard: {
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.base,
    gap: Space.sm,
    ...Elevation.card,
  },
  progFeedback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.lg,
    gap: Space.md,
  },
  // Applied to the TextInput itself; the face must be named explicitly since a
  // TextInput can't route through the Text primitive.
  // Groups the input with the controls below it so the keyboard-follow scroll
  // can measure them as one unit. Repeats progCard's gap so nesting the group
  // inside it leaves spacing unchanged.
  progEditGroup: {
    gap: Space.sm,
  },
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
  progReadonly: {
    lineHeight: Type.lineHeight.relaxed,
  },
  progErrorBanner: {
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Status.danger,
    backgroundColor: Status.dangerWash,
    padding: Space.md,
  },
  progFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.md,
  },
  progFooterMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: Space.sm,
  },
  progSaveWrap: {
    minWidth: 180,
  },
  progSaveWrapMobile: {
    width: '100%',
    minWidth: 0,
  },

  // Mobile: Attendance + Waitlist stack full-width with one rhythm gap. No
  // flex here on purpose — the cards keep their content height.
  bookingsStackMobile: {
    gap: Space.lg,
  },

  // List sections
  listSection: {
    flex: 1,
    gap: Space.md,
  },
  waitSection: {
    width: 280,
    gap: Space.md,
  },
  // Mobile: the two booking cards stack in a column, so each must fill the
  // column width (not the 280pt waitlist rail) and take its content height
  // rather than growing to divide the leftover space.
  sectionStackedMobile: {
    width: '100%',
    flex: 0,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Table
  table: {
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    overflow: 'hidden',
    ...Elevation.card,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Ground.base,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },
  tableColFill: {
    flex: 1,
  },
  tableColStatus: {
    width: 100,
    alignItems: 'flex-start',
  },
  // Waitlist queue position — a narrow leading column. Stays monochrome: the
  // accent is reserved for the primary action, not for a rank number.
  tableColPos: {
    width: 28,
    alignItems: 'flex-start',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderTopWidth: 1,
    borderTopColor: Line.hairline,
  },
  tableRowName: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  tableEmpty: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.base,
    borderTopWidth: 1,
    borderTopColor: Line.hairline,
    alignItems: 'center',
  },

  // Avatar
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Mobile results accordion — the expansion body under a tapped row. Sunken
  // ground + no top hairline reads as part of the row above it, not a new row.
  resDetail: {
    backgroundColor: Ground.base,
    paddingHorizontal: Space.md,
    paddingVertical: Space.md,
    gap: Space.md,
  },
  resDetailPair: {
    gap: Space.hair,
  },

  // Results table columns
  resColMetric: {
    width: 90,
    justifyContent: 'center',
  },
  resColValue: {
    width: 90,
    justifyContent: 'center',
  },
  resColNotes: {
    width: 100,
    justifyContent: 'center',
  },
});
