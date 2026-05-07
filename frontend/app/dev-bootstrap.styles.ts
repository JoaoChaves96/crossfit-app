import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, LineHeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundSubtle,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.jumbo,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  headerText: {
    fontSize: FontSizes.display,
    fontWeight: FontWeights.bold,
    color: AppColors.black,
    marginBottom: Spacing.tight,
  },
  subtitle: {
    fontSize: FontSizes.body,
    color: AppColors.textGray600,
  },
  list: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.mdLg,
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
    padding: Spacing.base,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardRole: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.black,
    marginBottom: Spacing.hairline,
  },
  cardEmail: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textGray600,
  },
  cardError: {
    fontSize: FontSizes.smMd,
    color: AppColors.errorDefault,
    marginTop: Spacing.sm,
  },
  warningBox: {
    backgroundColor: AppColors.warningBgOrange,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.warningMaterial,
    padding: Spacing.md,
  },
  warningText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.warningOrange,
    fontWeight: FontWeights.medium,
    lineHeight: LineHeights.body,
  },
});
