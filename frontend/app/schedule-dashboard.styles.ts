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
    backgroundColor: AppColors.backgroundDivider,
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
  navItemDisabled: {
    opacity: 0.4,
  },
  navIconDisabled: {
    backgroundColor: AppColors.textDisabled,
  },
  navLabelDisabled: {
    color: AppColors.textDisabled,
  },

  // Main area
  main: {
    flex: 1,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.xl,
    gap: Spacing.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    gap: Spacing.tight,
  },
  headerTitle: {
    fontSize: FontSizes.title,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
  },
  headerSubtitle: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textMuted,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.compact,
    backgroundColor: AppColors.textHeading,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.md,
  },
  createBtnText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.backgroundWhite,
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
    gap: Spacing.md,
  },
  navArrowBtn: {
    paddingHorizontal: Spacing.smMd,
    paddingVertical: Spacing.compact,
    borderRadius: BorderRadius.mdSm,
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
  },
  navArrowText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.textSecondary,
  },
  weekLabel: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.textHeading,
  },
  viewToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
    borderRadius: BorderRadius.mdSm,
    overflow: 'hidden',
  },
  toggleBtn: {
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.compact,
  },
  toggleBtnActive: {
    backgroundColor: AppColors.backgroundDivider,
  },
  toggleBtnText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textMuted,
  },
  toggleBtnTextActive: {
    fontWeight: FontWeights.medium,
    color: AppColors.textHeading,
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

  // Week grid
  gridContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexGrow: 1,
  },
  dayColumn: {
    minWidth: 140,
    flex: 1,
    gap: Spacing.sm,
  },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  dayLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: AppColors.textDisabled,
    letterSpacing: 1,
  },
  dayDate: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
  },

  // Class card
  classCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.smMd,
    gap: Spacing.tight,
  },
  classTime: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  className: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
    color: AppColors.textHeading,
  },
  classCoach: {
    fontSize: FontSizes.sm,
    color: AppColors.textMuted,
  },
  classCapacity: {
    fontSize: FontSizes.sm,
    color: AppColors.textMuted,
  },
  classCapacityFull: {
    color: AppColors.errorDefault,
  },

  // Empty day
  emptyDayCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.smMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDayText: {
    fontSize: FontSizes.smMd,
    color: AppColors.textDisabled,
  },

  // Mobile styles
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
  },
  drawerContainer: {
    width: 220,
    height: '100%',
  },
  mainMobile: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.base,
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
    marginRight: Spacing.sm,
  },
  hamburgerText: {
    fontSize: FontSizes.xl,
    color: AppColors.textHeading,
  },
  createBtnMobile: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minWidth: 44,
    minHeight: 44,
  },
  toolbarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  navArrowBtnMobile: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabelMobile: {
    fontSize: FontSizes.mdSm,
  },
  toggleBtnMobile: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.smMd,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileGridContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  mobileDayColumn: {
    width: 160,
    gap: Spacing.sm,
  },

  // List view
  listContainer: {
    flex: 1,
  },
  emptyListContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.jumbo,
  },
  emptyListText: {
    fontSize: FontSizes.body,
    color: AppColors.textDisabled,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderLeftWidth: 3,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.backgroundDivider,
    marginBottom: Spacing.tight,
  },
  listRowMain: {
    gap: Spacing.hairline,
  },
  listRowName: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.textHeading,
  },
  listRowTime: {
    fontSize: FontSizes.smMd,
    color: AppColors.textMuted,
  },
  listRowCapacity: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.textMuted,
  },
});
