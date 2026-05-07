import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, LineHeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.backgroundSubtle,
  },
  // Header
  header: {
    backgroundColor: AppColors.backgroundWhite,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  gymSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  gymName: {
    fontFamily: 'Inter',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
  },
  gymDropdownCaret: {
    fontFamily: 'Inter',
    fontSize: FontSizes.xs,
    color: AppColors.textGray600,
  },
  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  // Date separator
  dateSep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.tight,
    marginBottom: Spacing.tight,
  },
  dateLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: AppColors.borderDefault,
  },
  // Card
  card: {
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTime: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
  cardTitle: {
    fontFamily: 'Inter',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
  },
  cardDetails: {
    gap: Spacing.compact,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.compact,
  },
  detailIcon: {
    fontSize: FontSizes.mdSm,
    width: 14,
    textAlign: 'center',
  },
  detailText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    color: AppColors.textGray600,
  },
  detailTextFull: {
    color: AppColors.warningOrange,
    fontWeight: FontWeights.semibold,
  },
  // Badge
  badge: {
    borderRadius: BorderRadius.mdLg,
    paddingHorizontal: Spacing.smMd,
    paddingVertical: Spacing.tight,
  },
  badgeText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  // Action buttons
  actionBtn: {
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: AppColors.textPrimary,
  },
  actionBtnCancel: {
    backgroundColor: AppColors.backgroundWhite,
    borderWidth: 1,
    borderColor: AppColors.errorBootstrap,
  },
  actionBtnWaitlist: {
    backgroundColor: AppColors.backgroundWhite,
    borderWidth: 1,
    borderColor: AppColors.textPrimary,
  },
  actionBtnText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
  },
  // States
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.jumbo,
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.md,
    color: AppColors.errorMaterial,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.jumbo,
    gap: Spacing.base,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.round,
    backgroundColor: AppColors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIconText: {
    fontSize: FontSizes.hero,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    color: AppColors.textGray500,
    textAlign: 'center',
    lineHeight: LineHeights.medium,
  },
});
