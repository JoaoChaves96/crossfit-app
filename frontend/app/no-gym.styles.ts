import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, LineHeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundSubtle,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 0,
    paddingRight: Spacing.xl,
    paddingBottom: Spacing.jumboLg,
    paddingLeft: Spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.round,
    backgroundColor: AppColors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: {
    fontSize: FontSizes.hero,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontSize: FontSizes.body,
    color: AppColors.textGray600,
    textAlign: 'center',
    lineHeight: LineHeights.medium,
    width: '100%',
  },
  spacer: {
    height: 40,
  },
  logoutBtn: {
    height: 50,
    borderRadius: BorderRadius.lg,
    backgroundColor: AppColors.backgroundWhite,
    borderWidth: 1,
    borderColor: AppColors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutLabel: {
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
});
