import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';

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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  cardGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  gridCol: {
    flex: 1,
    gap: 16,
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
  // Filter toggle
  filterRow: {
    flexDirection: 'row',
    backgroundColor: AppColors.backgroundSurface,
    borderRadius: BorderRadius.xxl,
    height: 40,
    padding: Spacing.tight,
  },
  filterTab: {
    flex: 1,
    borderRadius: BorderRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: AppColors.textDark3,
  },
  filterTabText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
  },
  filterTabTextActive: {
    color: AppColors.backgroundWhite,
    fontWeight: FontWeights.semibold,
  },
  filterTabTextInactive: {
    color: AppColors.textGray600,
  },
  // List
  listContent: {
    gap: Spacing.md,
  },
  // Card
  card: {
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
  },
  cardCancelled: {
    backgroundColor: AppColors.backgroundSubtle,
    opacity: 0.7,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  cardTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  cardTitleMuted: {
    color: AppColors.textGray500,
  },
  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.smMd,
    paddingVertical: Spacing.tight,
    borderRadius: BorderRadius.lg,
    gap: Spacing.tight,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    letterSpacing: 0.5,
  },
  // Card details
  cardDetails: {
    gap: Spacing.compact,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.compact,
  },
  detailIcon: {
    fontSize: FontSizes.body,
    width: 18,
    textAlign: 'center',
  },
  detailText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textGray600,
    flex: 1,
  },
  // Card actions
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  viewButton: {
    flex: 1,
    height: 36,
    backgroundColor: AppColors.backgroundSurface,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.textPrimary,
  },
  cancelButton: {
    flex: 1,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.errorMaterial,
  },
  // Attended row (past cards)
  attendedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.compact,
  },
  attendedText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
  },
  // Empty state
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.textDark3,
    borderRadius: BorderRadius.xxlPlus,
    height: 44,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  emptyButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },
  // Error
  errorText: {
    fontSize: FontSizes.md,
    color: AppColors.errorMaterial,
    textAlign: 'center',
  },
});
