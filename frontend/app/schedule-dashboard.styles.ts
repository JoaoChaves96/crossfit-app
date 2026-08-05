import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: AppColors.backgroundWhite,
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
  headerTitleMobile: {
    fontSize: FontSizes.lg,
  },
  createIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  weekNavMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
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
  navArrowBtnMobile: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabelMobile: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.textHeading,
  },

  // Mobile day-strip + vertical card list
  dayStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: Spacing.tight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dayPill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.smMd,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    gap: Spacing.tight,
  },
  dayPillActive: {
    backgroundColor: AppColors.textHeading,
  },
  dayPillLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: AppColors.textMuted,
  },
  dayPillLabelActive: {
    color: AppColors.backgroundWhite,
  },
  dayPillDate: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
  },
  dayPillDateActive: {
    color: AppColors.backgroundWhite,
  },
  mobileCardList: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  mobileClassCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.base,
  },
  mobileClassCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileClassTime: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
  },
  mobileClassCapacity: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textMuted,
  },
  mobileClassName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: AppColors.textHeading,
    marginTop: Spacing.compact,
  },
  mobileClassMeta: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textMuted,
    marginTop: Spacing.hairline,
  },
  mobileEmptyDay: {
    paddingVertical: Spacing.jumboLg,
    alignItems: 'center',
  },
  mobileEmptyDayText: {
    fontSize: FontSizes.body,
    color: AppColors.textDisabled,
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
