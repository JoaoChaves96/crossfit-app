import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';

const COL_CLASS_TYPE = 180;
const COL_DATE_TIME = 200;
const COL_SPACE = 100;
const COL_CAPACITY = 100;
const COL_STATUS = 160;
const COL_ACTION = 90;

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: AppColors.backgroundWarm,
  },

  // Sidebar
  sidebar: {
    width: 220,
    backgroundColor: AppColors.darkSurface2,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xl,
    gap: Spacing.tight,
  },
  sidebarLogo: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: AppColors.backgroundWhite,
    letterSpacing: 0.5,
  },
  navSpacer: {
    height: 24,
  },
  navGroup: {
    gap: Spacing.tight,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smMd,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.mdSm,
    height: 40,
  },
  navItemActive: {
    backgroundColor: AppColors.darkSurface3,
  },
  navLabel: {
    fontSize: FontSizes.body,
  },
  navLabelActive: {
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },
  navLabelInactive: {
    fontWeight: FontWeights.regular,
    color: AppColors.darkTextMuted,
  },

  // Main area
  main: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xl,
    gap: Spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: FontSizes.titleLg,
    fontWeight: FontWeights.bold,
    color: AppColors.darkSurface,
  },

  // Filter row
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  filterBtn: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.backgroundWhite,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  filterBtnActive: {
    backgroundColor: AppColors.darkSurface,
    borderColor: AppColors.darkSurface,
  },
  filterBtnText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.regular,
    color: AppColors.darkTextMuted,
  },
  filterBtnTextActive: {
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },

  // Classes card
  classesCard: {
    flex: 1,
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.mdLg,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    overflow: 'hidden',
  },

  // Table header
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: Spacing.base,
    backgroundColor: AppColors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  tableHeaderCell: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: AppColors.darkTextMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Table rows
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  tableRowAlt: {
    backgroundColor: AppColors.surfaceBlueHint,
  },
  rowCell: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.darkSurface,
  },
  rowCellSecondary: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.regular,
    color: AppColors.darkTextDim,
  },

  // Column widths
  colClassType: {
    width: COL_CLASS_TYPE,
  },
  colDateTime: {
    width: COL_DATE_TIME,
  },
  colSpace: {
    width: COL_SPACE,
  },
  colCapacity: {
    width: COL_CAPACITY,
  },
  colStatus: {
    width: COL_STATUS,
  },
  colAction: {
    width: COL_ACTION,
    alignItems: 'flex-start',
  },

  // Status badge
  statusBadge: {
    borderRadius: BorderRadius.mdLg,
    paddingHorizontal: Spacing.smMd,
    paddingVertical: Spacing.micro,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
  },

  // Action button
  viewBtn: {
    backgroundColor: AppColors.darkSurface,
    borderRadius: BorderRadius.mdSm,
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.compact,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },

  // Loading / error
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.body,
    color: AppColors.errorDefault,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.mdSm,
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
  },
  retryBtnText: {
    fontSize: FontSizes.body,
    color: AppColors.darkSurface,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.jumboLg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.darkSurface,
  },
  emptySubtitle: {
    fontSize: FontSizes.body,
    color: AppColors.darkTextDim,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});

// ─── Mobile Styles (≤768px) ────────────────────────────────────────────────

export const mobileStyles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: AppColors.backgroundWarm,
  },

  // Main area — no sidebar
  main: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    gap: Spacing.base,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: AppColors.darkSurface,
  },

  // Filter row
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  filterBtn: {
    flex: 1,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.backgroundWhite,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: AppColors.darkSurface,
    borderColor: AppColors.darkSurface,
  },
  filterBtnText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.regular,
    color: AppColors.darkTextMuted,
  },
  filterBtnTextActive: {
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },

  // Class card (replaces table rows)
  classCard: {
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  classCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  classCardTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.darkSurface,
    flex: 1,
  },
  classCardMeta: {
    gap: Spacing.tight,
    marginTop: Spacing.tight,
  },
  classCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  classCardMetaText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.regular,
    color: AppColors.darkTextDim,
  },
  classCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  classCardViewBtn: {
    backgroundColor: AppColors.darkSurface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.smMd,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 80,
  },
  classCardViewBtnText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },

  // Status badge (same as desktop but inline)
  statusBadge: {
    borderRadius: BorderRadius.mdLg,
    paddingHorizontal: Spacing.smMd,
    paddingVertical: Spacing.micro,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
  },

  // Loading / error (same)
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.body,
    color: AppColors.errorDefault,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.mdSm,
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: FontSizes.body,
    color: AppColors.darkSurface,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.jumboLg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.darkSurface,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSizes.body,
    color: AppColors.darkTextDim,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
