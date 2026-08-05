import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, LineHeights, Spacing } from '@/constants/theme';

export const desktopStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  contentArea: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 40,
  },
  innerWrap: {
    width: 960,
    maxWidth: '100%',
    flex: 1,
    gap: 20,
  },
});

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundWhite,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: FontSizes.titleLg,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
  },
  listContent: {
    gap: Spacing.md,
  },
  card: {
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  cardTitleGroup: {
    flex: 1,
    gap: Spacing.hairline,
    marginRight: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
  cardDate: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textGray600,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.smMd,
    paddingVertical: Spacing.tight,
  },
  badgeText: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.tight,
    marginTop: Spacing.hairline,
  },
  coachIcon: {
    fontSize: FontSizes.smMd,
  },
  coachText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textGray600,
  },
  resultDisplay: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  resultValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
  resultMetric: {
    fontSize: FontSizes.smMd,
    color: AppColors.textGray500,
    marginTop: Spacing.hairline,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  cardChevron: {
    fontSize: FontSizes.xl,
    color: AppColors.textGray500,
    lineHeight: LineHeights.comfortable,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.base,
  },
  emptyIcon: {
    fontSize: FontSizes.jumbo,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: FontSizes.body,
    color: AppColors.textGray600,
    textAlign: 'center',
    maxWidth: 220,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: AppColors.errorMaterial,
    textAlign: 'center',
  },
});
