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
    backgroundColor: AppColors.actionBlue,
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

  // Main area
  main: {
    flex: 1,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.xl,
    gap: Spacing.xl,
  },

  // Page header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pageTitle: {
    fontSize: FontSizes.title,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
  },
  countBadge: {
    backgroundColor: AppColors.backgroundLight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.smMd,
    paddingVertical: Spacing.tight,
  },
  countBadgeText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.textMuted,
  },

  // Table card
  tableCard: {
    flex: 1,
    borderRadius: BorderRadius.mdLg,
    backgroundColor: AppColors.backgroundWhite,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    overflow: 'hidden',
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
    gap: Spacing.sm,
  },
  colEmail: {
    width: 200,
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
    paddingHorizontal: Spacing.base,
    backgroundColor: AppColors.backgroundScreen,
  },
  hCell: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: AppColors.textDisabled,
    letterSpacing: 0.5,
  },

  // Data row
  drow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.backgroundDivider,
  },
  drowAlt: {
    backgroundColor: AppColors.surfaceBlueHint,
  },

  // Avatar
  avatar: {
    width: 32,
    height: 32,
    borderRadius: Spacing.base,
    backgroundColor: AppColors.badgeBlueBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: AppColors.actionBlue,
  },

  // Member name cell
  memberName: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
    color: AppColors.darkSurface,
    flex: 1,
  },

  // Cell text
  cellText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.regular,
    color: AppColors.darkTextDim,
  },

  // Active badge
  activeBadge: {
    backgroundColor: AppColors.successBg,
    borderRadius: BorderRadius.mdLg,
    paddingHorizontal: Spacing.smMd,
    paddingVertical: Spacing.micro,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: AppColors.successDark,
  },

  // Empty state card
  emptyCard: {
    borderRadius: BorderRadius.mdLg,
    backgroundColor: AppColors.backgroundWhite,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    paddingVertical: Spacing.jumboLg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.base,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.round,
    backgroundColor: AppColors.backgroundSurface,
  },
  emptyTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.textHeading,
  },
  emptyDesc: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.regular,
    color: AppColors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
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

  // Mobile responsive styles
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
    marginRight: Spacing.sm,
  },
  hamburgerText: {
    fontSize: FontSizes.xl,
    color: AppColors.textHeading,
  },
  mainMobile: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.base,
  },

  // Member cards (mobile)
  memberCardList: {
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  memberCard: {
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    borderRadius: BorderRadius.mdLg,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  memberCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  memberCardInfo: {
    flex: 1,
    gap: Spacing.hairline,
  },
  memberCardJoined: {
    fontSize: FontSizes.smMd,
    color: AppColors.textMuted,
    paddingLeft: Spacing.jumboLg,
  },
});
