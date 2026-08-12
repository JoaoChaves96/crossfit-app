import { StyleSheet } from 'react-native';
import { Ground, Ink, Line, Accent, Radius, Space, Elevation, Type } from '@/constants/design';

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
    gap: Space.hair,
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
    backgroundColor: Ground.sunken,
  },
  navItemDisabled: {
    opacity: 0.4,
  },

  // Header / title
  hamburgerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Space.sm,
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Main area
  main: {
    flex: 1,
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.xl,
    gap: Space.xl,
  },
  mainMobile: {
    paddingHorizontal: Space.base,
    paddingVertical: Space.base,
    gap: Space.base,
  },
  tabContent: {
    flex: 1,
  },

  // Tab bar (segmented toggle wrapper)
  segmentedWrap: {
    maxWidth: 520,
  },

  // Content area
  content: {
    gap: Space.base,
    paddingVertical: Space.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.md,
  },
  addBtnWrap: {
    minWidth: 160,
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
    backgroundColor: Ground.base,
    height: 48,
    paddingHorizontal: Space.base,
    borderBottomWidth: 1,
    borderBottomColor: Line.hairline,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.base,
    borderTopWidth: 1,
    borderTopColor: Line.hairline,
  },
  colName: {
    flex: 1,
    justifyContent: 'center',
  },
  colCapacity: {
    width: 160,
    justifyContent: 'center',
  },
  colActions: {
    width: 200,
    alignItems: 'flex-end',
  },
  colActionsRow: {
    width: 200,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Space.sm,
  },

  // Plans table columns
  colPrice: {
    width: 110,
  },
  colCycle: {
    width: 110,
  },
  colClassTypes: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.xs,
  },
  colSubscribers: {
    width: 110,
  },
  planCardList: {
    gap: Space.md,
  },
  planCardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.md,
  },
  planClassTypeTag: {
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
    paddingHorizontal: Space.sm,
    paddingVertical: Space.hair,
  },

  // Class Types table columns
  colLoggable: {
    width: 100,
    justifyContent: 'center',
  },
  colMetric: {
    width: 120,
    justifyContent: 'center',
  },
  colClassTypeActions: {
    width: 200,
    alignItems: 'flex-end',
  },
  colClassTypeActionsRow: {
    width: 200,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Space.sm,
  },

  // Entity card list (mobile)
  spaceCardList: {
    gap: Space.md,
    paddingBottom: Space.xl,
  },
  entityCard: {
    backgroundColor: Ground.surface,
    borderWidth: 1,
    borderColor: Line.hairline,
    borderRadius: Radius.card,
    padding: Space.base,
    gap: Space.md,
    ...Elevation.card,
  },
  entityCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.md,
  },
  entityCardTitleWrap: {
    flexShrink: 1,
  },
  entityCardActions: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  entityCardActionBtn: {
    minWidth: 96,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.md,
    paddingVertical: Space.jumbo,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.chip,
    backgroundColor: Ground.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.xs,
  },
  emptyDesc: {
    textAlign: 'center',
    maxWidth: 360,
  },
  emptyBtnWrap: {
    marginTop: Space.sm,
    minWidth: 180,
  },

  // Form
  formCard: {
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.xxl,
    gap: Space.lg,
    width: '100%',
    maxWidth: 480,
    ...Elevation.card,
  },
  classTypeFormCard: {
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.xxl,
    gap: Space.lg,
    width: '100%',
    maxWidth: 520,
    ...Elevation.card,
  },
  fieldGroup: {
    gap: Space.xs,
  },
  // TextInput can't route through the Text primitive; name the face explicitly.
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: Line.divider,
    borderRadius: Radius.control,
    paddingHorizontal: Space.md,
    fontFamily: Type.family.regular,
    fontSize: Type.size.body,
    color: Ink.strong,
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: Space.md,
    marginTop: Space.xs,
  },
  formBtnWrap: {
    minWidth: 110,
  },

  // Toggle row
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

  // Result metric pill selector (monochrome selection — accent stays on the primary action)
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  metricPill: {
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
    paddingHorizontal: Space.base,
    paddingVertical: Space.sm,
    backgroundColor: Ground.surface,
  },
  metricPillSelected: {
    backgroundColor: Ink.strong,
    borderColor: Ink.strong,
  },

  // Feedback (loading / error / placeholder)
  feedbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.jumbo,
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

  // Profile tab
  profileFormCard: {
    backgroundColor: Ground.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Line.hairline,
    padding: Space.xxl,
    gap: Space.lg,
    width: '100%',
    maxWidth: 480,
    ...Elevation.card,
  },
  profileDescInput: {
    height: 96,
    borderWidth: 1,
    borderColor: Line.divider,
    borderRadius: Radius.control,
    paddingHorizontal: Space.md,
    paddingVertical: Space.md,
    fontFamily: Type.family.regular,
    fontSize: Type.size.body,
    color: Ink.strong,
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  profileLogoSection: {
    gap: Space.sm,
  },
  profileLogoPlaceholder: {
    width: 120,
    height: 80,
    backgroundColor: Ground.sunken,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Line.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSaveBtnWrap: {
    minWidth: 140,
  },
});
