import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.backgroundSubtle,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },

  // Brand
  brand: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.jumbo,
    gap: Spacing.sm,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.textPrimary,
  },
  appName: {
    fontSize: FontSizes.titleLg,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
  },
  tagline: {
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.regular,
    color: AppColors.textGray600,
  },

  // Card
  card: {
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    padding: Spacing.lg,
    gap: Spacing.base,
  },

  // Field
  field: {
    gap: Spacing.compact,
  },
  label: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.mdLg,
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
    backgroundColor: AppColors.backgroundWhite,
    paddingHorizontal: Spacing.mdPlus,
    fontSize: FontSizes.bodyMd,
    color: AppColors.textPrimary,
  },

  // Error
  errorText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.errorDefault,
    marginTop: -Spacing.tight,
  },

  // Button
  loginBtn: {
    height: 50,
    borderRadius: BorderRadius.lg,
    backgroundColor: AppColors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnLabel: {
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.bold,
    color: AppColors.backgroundWhite,
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.lg,
    gap: Spacing.tight,
  },
  footerText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.regular,
    color: AppColors.textGray600,
  },
  signupLink: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
});
