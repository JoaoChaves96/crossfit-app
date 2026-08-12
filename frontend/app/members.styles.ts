import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Radius, Space, Elevation } from '@/constants/design';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Ground.base,
  },

  // Row holding the main content and the (optional) member details panel side
  // by side on desktop; on mobile the panel renders as its own Modal, so this
  // row only ever has one visible child there.
  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },

  // Main area
  main: {
    flex: 1,
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.xl,
    gap: Space.xl,
  },

  // Page header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  countBadge: {
    backgroundColor: Ground.sunken,
    borderRadius: Radius.chip,
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  searchInput: {
    flex: 1,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
    backgroundColor: Ground.surface,
    paddingHorizontal: Space.base,
    paddingVertical: Space.sm,
    color: Ink.strong,
  },

  // Table card
  tableCard: {
    flex: 1,
    borderRadius: Radius.card,
    backgroundColor: Ground.surface,
    borderWidth: 1,
    borderColor: Line.hairline,
    overflow: 'hidden',
    ...Elevation.card,
  },

  // Column widths
  colName: {
    width: 160,
    height: '100%',
    justifyContent: 'center',
  },
  colNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  colEmail: {
    width: 200,
    height: '100%',
    justifyContent: 'center',
  },
  colPlan: {
    width: 140,
    height: '100%',
    justifyContent: 'center',
  },
  colPlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
  },
  colExpires: {
    width: 120,
    height: '100%',
    justifyContent: 'center',
  },
  colJoined: {
    width: 110,
    height: '100%',
    justifyContent: 'center',
  },
  colStatus: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },

  // Header row
  hrow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: Space.base,
    backgroundColor: Ground.base,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },

  // Data row
  drow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: Space.base,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },
  drowAlt: {
    backgroundColor: Ground.base,
  },

  // Avatar
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Name cell text (needs flex to truncate within its column)
  nameText: {
    flex: 1,
  },

  // Empty state card
  emptyCard: {
    borderRadius: Radius.card,
    backgroundColor: Ground.surface,
    borderWidth: 1,
    borderColor: Line.hairline,
    paddingVertical: Space.jumbo,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.base,
    ...Elevation.card,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDesc: {
    textAlign: 'center',
    paddingHorizontal: Space.xl,
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

  // Mobile responsive styles
  hamburgerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Space.sm,
  },
  mainMobile: {
    paddingHorizontal: Space.base,
    paddingVertical: Space.base,
    gap: Space.base,
  },

  // Member cards (mobile)
  memberCardList: {
    gap: Space.md,
    paddingBottom: Space.lg,
  },
  memberCard: {
    backgroundColor: Ground.surface,
    borderWidth: 1,
    borderColor: Line.hairline,
    borderRadius: Radius.card,
    padding: Space.base,
    gap: Space.sm,
    ...Elevation.card,
  },
  memberCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  memberCardInfo: {
    flex: 1,
    gap: Space.hair,
  },
  memberCardJoined: {
    paddingLeft: Space.jumbo,
  },
  memberCardPlan: {
    marginTop: Space.hair,
  },
});
