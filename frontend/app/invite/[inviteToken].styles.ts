import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, LineHeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.xxl,
  },
  scroll: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  acceptingText: {
    fontSize: FontSizes.bodyMd,
    color: AppColors.textGray600,
  },

  // Content area
  contentWrap: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    gap: Spacing.sm,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AppColors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconGlyph: {
    fontSize: FontSizes.display,
    color: AppColors.backgroundWhite,
  },
  heroTitle: {
    fontSize: FontSizes.titleLg,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.regular,
    color: AppColors.textGray600,
    textAlign: 'center',
    lineHeight: LineHeights.comfortable,
  },

  // Gym card
  gymCard: {
    backgroundColor: AppColors.backgroundSubtle,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  gymCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  gymAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.mdSm,
    backgroundColor: AppColors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymAvatarText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: AppColors.backgroundWhite,
  },
  gymTextGroup: {
    flex: 1,
    gap: Spacing.hairline,
  },
  gymName: {
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
  gymSubtext: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.regular,
    color: AppColors.textGray600,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.borderDefault,
  },

  // Invite meta
  inviteMeta: {
    gap: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.regular,
    color: AppColors.textGray600,
  },
  metaValue: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.textPrimary,
  },

  // CTA section
  ctaSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  joinBtn: {
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },
  declineBtn: {
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
    backgroundColor: AppColors.backgroundWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.medium,
    color: AppColors.textGray600,
  },

  // Error banner
  errorBanner: {
    backgroundColor: AppColors.errorBgLighter,
    borderRadius: BorderRadius.mdLg,
    borderWidth: 1,
    borderColor: AppColors.errorBgPale,
    padding: Spacing.md,
    paddingHorizontal: Spacing.mdPlus,
    gap: Spacing.compact,
  },
  errorTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.errorMaterial,
  },
  errorDesc: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.regular,
    color: AppColors.errorDarker,
    lineHeight: LineHeights.body,
  },

  // Back to login
  backToLoginLink: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToLoginText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.textGray600,
  },
});
