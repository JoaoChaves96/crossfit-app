import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.backgroundWhite,
  },
  centered: {
    flex: 1,
    backgroundColor: AppColors.backgroundWhite,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: AppColors.black,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },

  // Class name
  className: {
    fontFamily: 'Inter',
    fontSize: FontSizes.titleLg,
    fontWeight: FontWeights.bold,
    color: AppColors.black,
  },

  // Meta rows
  metaGroup: {
    gap: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metaText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.regular,
    color: AppColors.textGray600,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: AppColors.borderDim,
  },

  // Section groups
  sectionGap8: {
    gap: Spacing.sm,
  },
  sectionGap10: {
    gap: Spacing.smMd,
  },
  sectionLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.black,
  },

  // Capacity
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityCount: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.black,
  },
  capacityBarBg: {
    flexDirection: 'row',
    height: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: AppColors.borderDim,
    overflow: 'hidden',
  },
  capacityBarFill: {
    height: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: AppColors.warningDefault,
  },
  capacityNote: {
    fontFamily: 'Inter',
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.regular,
    color: AppColors.warningDefault,
  },

  // Booking status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  statusBadgeText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
  },

  // Programming
  wodTitle: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.textDark3,
  },
  programBlock: {
    gap: Spacing.tight,
  },
  programSubLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textGray500,
  },
  programText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.regular,
    color: AppColors.textDark2,
    lineHeight: FontSizes.mdSm * 1.4,
  },

  // Mutation error
  mutationErrorCard: {
    backgroundColor: AppColors.errorBg,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.errorDefault,
    borderRadius: BorderRadius.mdSm,
    padding: Spacing.md,
  },
  mutationErrorText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.errorDark,
  },

  // Action button area
  actionContainer: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  leaveWaitlistBtn: {
    height: 50,
    borderRadius: BorderRadius.lg,
    backgroundColor: AppColors.backgroundWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: AppColors.errorDefault,
  },
  leaveWaitlistBtnText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.bold,
    color: AppColors.errorDefault,
    letterSpacing: 0.5,
  },
  cancelBtn: {
    height: 50,
    borderRadius: BorderRadius.lg,
    backgroundColor: AppColors.errorDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.bold,
    color: AppColors.backgroundWhite,
    letterSpacing: 0.5,
  },
  bookBtn: {
    height: 50,
    borderRadius: BorderRadius.lg,
    backgroundColor: AppColors.textDark3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.bold,
    color: AppColors.backgroundWhite,
    letterSpacing: 0.5,
  },

  // Error screen
  errorText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.md,
    color: AppColors.errorDark,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  errorBackBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.borderDim,
  },
  errorBackBtnText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.black,
  },
});
