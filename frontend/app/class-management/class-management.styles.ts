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
    backgroundColor: AppColors.badgeBlueBg,
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
    fontWeight: FontWeights.semibold,
    color: AppColors.actionBlue,
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

  // Main content
  mainScroll: {
    flex: 1,
  },
  mainContent: {
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.xl,
    gap: Spacing.lg,
    flexGrow: 1,
  },
  mainContentMobile: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },

  // Mobile tabs
  mobileTabsContainer: {
    flex: 1,
    gap: Spacing.base,
  },
  mobileTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: AppColors.backgroundDivider,
  },
  mobileTab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  mobileTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: AppColors.textHeading,
  },
  mobileTabText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.regular,
    color: AppColors.textMuted,
    fontFamily: 'Inter',
  },
  mobileTabTextActive: {
    fontWeight: FontWeights.semibold,
    color: AppColors.textHeading,
  },

  // Loading / error
  centeredFeedback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.jumbo,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.body,
    color: AppColors.errorDefault,
    textAlign: 'center',
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
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    gap: Spacing.tight,
    flex: 1,
    marginRight: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.title,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
    fontFamily: 'Inter',
  },
  headerSubtitle: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textMuted,
    fontFamily: 'Inter',
  },

  // State badge
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.compact,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
  },
  stateBadgeDisabled: {
    opacity: 0.6,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.sm,
  },
  stateText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.textSecondary,
    fontFamily: 'Inter',
  },
  stateChevron: {
    fontSize: FontSizes.sm,
    color: AppColors.textDisabled,
    fontFamily: 'Inter',
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: AppColors.backgroundScreen,
    borderRadius: BorderRadius.mdLg,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.xxxl,
    flexWrap: 'wrap',
  },
  infoItem: {
    gap: Spacing.tight,
    minWidth: 80,
  },
  infoItemSeparator: {
    // gap between items is handled by parent gap
  },
  infoLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: AppColors.textDisabled,
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  infoValue: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.textHeading,
    fontFamily: 'Inter',
  },

  // Mobile compact info grid (2-col)
  mobileInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: AppColors.backgroundScreen,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    borderRadius: BorderRadius.mdLg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  mobileInfoGridCell: {
    width: '50%',
    marginBottom: Spacing.md,
  },
  mobileInfoGridLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    letterSpacing: 0.5,
    color: AppColors.textDisabled,
    marginBottom: Spacing.tight,
    fontFamily: 'Inter',
  },
  mobileInfoGridValue: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.textHeading,
    fontFamily: 'Inter',
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.smMd,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.textHeading,
    paddingHorizontal: Spacing.basePlus,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.md,
  },
  primaryBtnText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.backgroundWhite,
    fontFamily: 'Inter',
  },
  outlinedBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.basePlus,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
  },
  outlinedBtnText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.textSecondary,
    fontFamily: 'Inter',
  },

  // Lists row
  listsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    flex: 1,
  },

  // Attendance section
  listSection: {
    flex: 1,
    gap: Spacing.md,
  },
  waitSection: {
    width: 280,
    gap: Spacing.md,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textHeading,
    fontFamily: 'Inter',
  },
  attBadge: {
    backgroundColor: AppColors.badgeBlueBg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.smMd,
    paddingVertical: Spacing.micro,
  },
  attBadgeText: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.medium,
    color: AppColors.actionBlue,
    fontFamily: 'Inter',
  },
  waitBadge: {
    backgroundColor: AppColors.warningBg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.smMd,
    paddingVertical: Spacing.micro,
  },
  waitBadgeText: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.medium,
    color: AppColors.warningText,
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
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.smMd,
  },
  tableHeaderText: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textMuted,
    fontFamily: 'Inter',
  },
  tableColFill: {
    flex: 1,
  },
  tableColStatus: {
    width: 100,
    alignItems: 'flex-start',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.smMd,
    borderTopWidth: 1,
    borderTopColor: AppColors.backgroundDivider,
  },
  tableRowWait: {
    gap: Spacing.sm,
  },
  tableRowName: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tableEmpty: {
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: AppColors.backgroundDivider,
    alignItems: 'center',
  },
  tableEmptyText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textDisabled,
    fontFamily: 'Inter',
  },

  // Avatar
  avatar: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.lg,
    backgroundColor: AppColors.backgroundDivider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSizes.tiny,
    fontWeight: FontWeights.semibold,
    color: AppColors.textMuted,
    fontFamily: 'Inter',
  },
  athleteName: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textHeading,
    fontFamily: 'Inter',
  },

  // Booking status badge
  bookingBadge: {
    borderRadius: BorderRadius.mdLg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.hairline,
  },
  bookingBadgeText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    fontFamily: 'Inter',
  },

  // Results badge
  resBadge: {
    backgroundColor: AppColors.badgeBlueBg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.smMd,
    paddingVertical: Spacing.micro,
  },
  resBadgeText: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.medium,
    color: AppColors.actionBlue,
    fontFamily: 'Inter',
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

  // Results row cell text
  resMetricText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textSecondary,
    fontFamily: 'Inter',
  },
  resValueText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.textHeading,
    fontFamily: 'Inter',
  },
  resNotesText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textMuted,
    fontFamily: 'Inter',
  },
});
