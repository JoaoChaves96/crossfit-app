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
  cardGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  gridCol: {
    flex: 1,
    gap: 16,
  },
  // Controls (desktop): rely on innerWrap gap/padding — transparent, no extra chrome
  controls: {
    gap: Spacing.md,
  },
});

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.backgroundSubtle,
  },
  // Header
  header: {
    backgroundColor: AppColors.backgroundWhite,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  gymSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  gymName: {
    fontFamily: 'Inter',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
  },
  gymDropdownCaret: {
    fontFamily: 'Inter',
    fontSize: FontSizes.xs,
    color: AppColors.textGray600,
  },
  // Controls (Week/Day toggle + class-type filter chips).
  // Mobile: rendered inside the FlatList header, which already applies
  // horizontal + top padding via listContent — so no extra padding here.
  controls: {
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  // Segmented Week/Day toggle
  segmented: {
    flexDirection: 'row',
    backgroundColor: AppColors.backgroundSubtle,
    borderRadius: BorderRadius.mdLg,
    padding: Spacing.tight,
    gap: Spacing.tight,
  },
  segment: {
    flex: 1,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: AppColors.backgroundWhite,
  },
  segmentText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
    color: AppColors.textGray500,
  },
  segmentTextActive: {
    color: AppColors.textPrimary,
  },
  // Class-type filter chips
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  chip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
    backgroundColor: AppColors.backgroundWhite,
  },
  chipActive: {
    backgroundColor: AppColors.textPrimary,
    borderColor: AppColors.textPrimary,
  },
  chipText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
    color: AppColors.textGray600,
  },
  chipTextActive: {
    color: AppColors.backgroundWhite,
  },
  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  // Date separator
  dateSep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.tight,
    marginBottom: Spacing.tight,
  },
  dateLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: AppColors.borderDefault,
  },
  // Card
  card: {
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTime: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
  cardTitle: {
    fontFamily: 'Inter',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
  },
  cardDetails: {
    gap: Spacing.compact,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.compact,
  },
  detailIcon: {
    fontSize: FontSizes.mdSm,
    width: 14,
    textAlign: 'center',
  },
  detailText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    color: AppColors.textGray600,
  },
  detailTextFull: {
    color: AppColors.warningOrange,
    fontWeight: FontWeights.semibold,
  },
  // Badge
  badge: {
    borderRadius: BorderRadius.mdLg,
    paddingHorizontal: Spacing.smMd,
    paddingVertical: Spacing.tight,
  },
  badgeText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  // Action buttons
  actionBtn: {
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: AppColors.textPrimary,
  },
  actionBtnCancel: {
    backgroundColor: AppColors.backgroundWhite,
    borderWidth: 1,
    borderColor: AppColors.errorBootstrap,
  },
  actionBtnWaitlist: {
    backgroundColor: AppColors.backgroundWhite,
    borderWidth: 1,
    borderColor: AppColors.textPrimary,
  },
  actionBtnText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
  },
  // Filtered-empty (controls active but nothing matches)
  filteredEmpty: {
    paddingVertical: Spacing.jumbo,
    alignItems: 'center',
  },
  filteredEmptyText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    color: AppColors.textGray500,
    textAlign: 'center',
  },
  // States
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.jumbo,
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.md,
    color: AppColors.errorMaterial,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.jumbo,
    gap: Spacing.base,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.round,
    backgroundColor: AppColors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIconText: {
    fontSize: FontSizes.hero,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    color: AppColors.textGray500,
    textAlign: 'center',
    lineHeight: LineHeights.medium,
  },
});
