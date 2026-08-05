import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, LineHeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.backgroundScreen,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: AppColors.backgroundWhite,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  markAllButton: {
    paddingVertical: Spacing.tight,
    paddingHorizontal: Spacing.sm,
  },
  markAllText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
    color: AppColors.textDark3,
  },
  clearReadText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
    color: AppColors.textGray500,
  },
  listContent: {
    paddingVertical: Spacing.sm,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    backgroundColor: AppColors.backgroundWhite,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderDefault,
  },
  notificationItemUnread: {
    backgroundColor: AppColors.backgroundSurface,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    gap: Spacing.tight,
  },
  statusIndicator: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Spacing.tight,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColors.brandPrimary,
  },
  titleText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.regular,
    color: AppColors.textPrimary,
  },
  titleTextUnread: {
    fontWeight: FontWeights.bold,
  },
  bodyText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.textGray600,
    lineHeight: LineHeights.bodyRelaxed,
  },
  timeText: {
    fontSize: FontSizes.smMd,
    color: AppColors.textGray500,
  },
  // States
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.jumbo,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
});
