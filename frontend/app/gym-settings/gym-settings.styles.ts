import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: AppColors.backgroundWhite,
  },

  // Sidebar
  sidebar: {
    width: 220,
    backgroundColor: AppColors.backgroundLight,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xl,
    gap: Spacing.tight,
  },
  sidebarLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  sidebarLogoIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.mdSm,
    backgroundColor: AppColors.textMuted,
  },
  sidebarLogoText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
  },
  navGroup: {
    gap: Spacing.hairline,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smMd,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.mdSm,
  },
  navItemActive: {
    backgroundColor: AppColors.backgroundDivider,
  },
  navItemDisabled: {
    opacity: 0.4,
  },
  navIcon: {
    width: 16,
    height: 16,
    borderRadius: BorderRadius.hairline,
  },
  navIconActive: {
    backgroundColor: AppColors.textSecondary,
  },
  navIconInactive: {
    backgroundColor: AppColors.textDisabled,
  },
  navIconMuted: {
    backgroundColor: AppColors.textDisabled,
  },
  navLabel: {
    fontSize: FontSizes.body,
  },
  navLabelActive: {
    fontWeight: FontWeights.medium,
    color: AppColors.textHeading,
  },
  navLabelInactive: {
    fontWeight: FontWeights.regular,
    color: AppColors.textMuted,
  },
  navLabelMuted: {
    color: AppColors.textDisabled,
  },

  // Mobile drawer
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
  },
  drawerContainer: {
    width: 220,
    height: '100%',
  },
  hamburgerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerText: {
    fontSize: FontSizes.xl,
    color: AppColors.textHeading,
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Main area
  main: {
    flex: 1,
    paddingHorizontal: Spacing.jumboLg,
    paddingVertical: Spacing.jumbo,
    gap: Spacing.xl,
  },
  mainMobile: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.base,
  },
  pageTitle: {
    fontSize: FontSizes.title,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
    fontFamily: 'Inter',
  },
  tabContent: {
    flex: 1,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.smMd,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: AppColors.textPrimary,
  },
  tabInactive: {
    borderBottomWidth: 1,
    borderBottomColor: AppColors.separatorFaint,
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
  },
  tabTextActive: {
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
  tabTextInactive: {
    fontWeight: FontWeights.regular,
    color: AppColors.textGray400,
  },
  tabFill: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.separatorFaint,
    height: 38,
  },

  // Content area
  content: {
    gap: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.textHeading,
    fontFamily: 'Inter',
  },

  // Add button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.compact,
    backgroundColor: AppColors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.mdSm,
  },
  addBtnPlus: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
    fontFamily: 'Inter',
  },
  addBtnText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.backgroundWhite,
    fontFamily: 'Inter',
  },

  // Table
  table: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.backgroundScreen,
    height: 48,
    paddingHorizontal: Spacing.base,
  },
  tableHeaderText: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textMuted,
    fontFamily: 'Inter',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: AppColors.backgroundDivider,
  },
  colName: {
    flex: 1,
  },
  colCapacity: {
    width: 160,
  },
  colActions: {
    width: 160,
    alignItems: 'flex-end',
  },
  colActionsRow: {
    width: 160,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  rowText: {
    fontSize: FontSizes.body,
    color: AppColors.textHeading,
    fontFamily: 'Inter',
  },
  editBtn: {
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.compact,
    borderRadius: BorderRadius.mdSm,
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
  },
  editBtnText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.textSecondary,
    fontFamily: 'Inter',
  },
  deleteBtn: {
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.compact,
    borderRadius: BorderRadius.mdSm,
    borderWidth: 1,
    borderColor: AppColors.errorBgPale,
  },
  deleteBtnText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.errorDefault,
    fontFamily: 'Inter',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.base,
    paddingVertical: Spacing.ultra,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.round,
    backgroundColor: AppColors.backgroundSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: {
    fontSize: FontSizes.titleLg,
    color: AppColors.textLight,
    fontFamily: 'Inter',
  },
  emptyTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.textDark3,
    fontFamily: 'Inter',
  },
  emptyDesc: {
    fontSize: FontSizes.body,
    color: AppColors.textGray400,
    fontFamily: 'Inter',
    textAlign: 'center',
    maxWidth: 360,
  },

  // Form
  formTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.textHeading,
    fontFamily: 'Inter',
  },
  formCard: {
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    padding: Spacing.xxl,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: 480,
  },
  formCardTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.textSecondary,
    fontFamily: 'Inter',
  },
  inputLabel: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
    color: AppColors.textHeading,
    fontFamily: 'Inter',
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.mdPlus,
    fontSize: FontSizes.body,
    color: AppColors.textHeading,
    fontFamily: 'Inter',
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.mdSm,
    minWidth: 80,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
    fontFamily: 'Inter',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.mdSm,
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
  },
  cancelBtnText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.textSecondary,
    fontFamily: 'Inter',
  },

  // Class Types table columns
  colLoggable: {
    width: 100,
  },
  colMetric: {
    width: 120,
  },
  colClassTypeActions: {
    width: 140,
    alignItems: 'flex-end',
  },
  colClassTypeActionsRow: {
    width: 140,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },

  // Loggable badges
  badgeYes: {
    alignSelf: 'flex-start',
    backgroundColor: AppColors.successBg,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
  },
  badgeYesText: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.successDark,
    fontFamily: 'Inter',
  },
  badgeNo: {
    alignSelf: 'flex-start',
    backgroundColor: AppColors.backgroundLight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
  },
  badgeNoText: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textMuted,
    fontFamily: 'Inter',
  },

  // Class type form card
  classTypeFormCard: {
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    padding: Spacing.xxl,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: 520,
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
    borderRadius: BorderRadius.lg,
    backgroundColor: AppColors.separatorDefault,
    padding: Spacing.hairline,
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: AppColors.textPrimary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.mdLg,
    backgroundColor: AppColors.backgroundWhite,
    alignSelf: 'flex-start',
  },
  toggleThumbRight: {
    alignSelf: 'flex-end',
  },

  // Result metric pill selector
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricPill: {
    borderRadius: BorderRadius.mdSm,
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  metricPillSelected: {
    backgroundColor: AppColors.textPrimary,
    borderColor: AppColors.textPrimary,
  },
  metricPillText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.textSecondary,
    fontFamily: 'Inter',
  },
  metricPillTextSelected: {
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },

  // Feedback (loading / error / placeholder)
  feedbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.super,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.body,
    color: AppColors.errorDefault,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  retryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.mdSm,
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
  },
  retryBtnText: {
    fontSize: FontSizes.body,
    color: AppColors.textHeading,
    fontFamily: 'Inter',
  },
  placeholderText: {
    fontSize: FontSizes.body,
    color: AppColors.textDisabled,
    fontFamily: 'Inter',
  },

  // Profile tab
  profileFormCard: {
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    padding: Spacing.xxl,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: 480,
  },
  profileDescInput: {
    height: 96,
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.body,
    color: AppColors.textHeading,
    fontFamily: 'Inter',
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    height: 24,
  },
  profileActiveBadge: {
    backgroundColor: AppColors.successBg,
    borderRadius: BorderRadius.mdLg,
    paddingHorizontal: Spacing.smMd,
    paddingVertical: Spacing.micro,
  },
  profileActiveBadgeText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: AppColors.successDark,
    fontFamily: 'Inter',
  },
  profileCreatedLabel: {
    fontSize: FontSizes.smMd,
    color: AppColors.textDisabled,
    fontFamily: 'Inter',
  },
  profileLogoSection: {
    gap: Spacing.sm,
  },
  profileLogoPlaceholder: {
    width: 120,
    height: 80,
    backgroundColor: AppColors.backgroundLight,
    borderRadius: BorderRadius.mdSm,
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLogoPlaceholderText: {
    fontSize: FontSizes.sm,
    color: AppColors.textDisabled,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  profileSaveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.mdSm,
    minWidth: 120,
  },
  profileSaveBtnDisabled: {
    opacity: 0.4,
  },
  profileSaveBtnText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
    fontFamily: 'Inter',
  },
});
