import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
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
});
