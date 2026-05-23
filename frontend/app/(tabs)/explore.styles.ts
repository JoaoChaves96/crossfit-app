import { StyleSheet } from 'react-native';
import { AppColors, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  headerImage: {
    color: AppColors.gray500,
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
