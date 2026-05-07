import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, LineHeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.backgroundSubtle,
  },
  scrollContent: {
    flexGrow: 1,
  },
  statusBar: {
    height: 62,
  },
  content: {
    flex: 1,
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
  brandIcon: {
    fontSize: FontSizes.displayLg,
  },
  brandName: {
    fontFamily: 'Inter',
    fontSize: FontSizes.titleLg,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
  },
  brandTagline: {
    fontFamily: 'Inter',
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.regular,
    color: AppColors.textGray600,
  },

  // Form Card
  formCard: {
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    padding: Spacing.lg,
    gap: Spacing.base,
  },

  // Fields
  field: {
    gap: Spacing.compact,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
  input: {
    height: 48,
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.mdLg,
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
    paddingHorizontal: Spacing.mdPlus,
    fontFamily: 'Inter',
    fontSize: FontSizes.bodyMd,
    color: AppColors.textPrimary,
  },
  inputReadOnly: {
    backgroundColor: AppColors.backgroundSubtle,
    color: AppColors.textGray600,
  },

  // Error
  errorText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    color: AppColors.errorMaterial,
    lineHeight: LineHeights.body,
  },

  // Register Button
  registerBtn: {
    height: 50,
    backgroundColor: AppColors.textPrimary,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerBtnDisabled: {
    opacity: 0.6,
  },
  registerBtnLabel: {
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.regular,
    color: AppColors.textGray600,
  },
  loginLink: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
});
