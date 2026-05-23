import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    padding: Spacing.sm,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: AppColors.errorDefault,
    borderRadius: BorderRadius.mdLg,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.tight,
  },
  badgeText: {
    color: AppColors.backgroundWhite,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },
});
