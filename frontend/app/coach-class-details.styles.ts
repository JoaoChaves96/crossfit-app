import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, LineHeights, Spacing } from '@/constants/theme';

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
  navLabel: {
    fontSize: FontSizes.body,
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
    gap: Spacing.base,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.mdSm,
    backgroundColor: AppColors.backgroundWhite,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  backBtnText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.darkTextDim,
    fontWeight: FontWeights.regular,
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSizes.title,
    fontWeight: FontWeights.bold,
    color: AppColors.darkSurface,
    textAlign: 'center',
  },
  statusBadge: {
    borderRadius: BorderRadius.mdLg,
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.tightPlus,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.semibold,
  },

  // Content row
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.lg,
  },

  // Info panel
  infoPanel: {
    width: 320,
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.mdLg,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    padding: Spacing.xl,
  },
  panelTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: AppColors.darkSurface,
    marginBottom: Spacing.base,
  },
  separator: {
    height: 1,
    backgroundColor: AppColors.borderLight,
  },
  separatorSpacing: {
    marginTop: Spacing.base,
  },
  fieldLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: AppColors.darkTextMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: Spacing.base,
  },
  fieldLabelSpacing: {
    marginTop: Spacing.base,
  },
  fieldValueBold: {
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.darkSurface,
    marginTop: Spacing.tight,
  },
  fieldValue: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.regular,
    color: AppColors.darkTextDim,
    marginTop: Spacing.tight,
  },
  bookedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: AppColors.backgroundWarm,
    borderRadius: BorderRadius.mdSm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.tight,
  },
  bookedRowText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.darkCard,
  },
  actionBtn: {
    backgroundColor: AppColors.darkSurface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.smMd,
    paddingHorizontal: Spacing.basePlus,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.base,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },

  // Programming panel
  progPanel: {
    flex: 1,
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.mdLg,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    padding: Spacing.xl,
  },
  progHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  loggableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smMd,
  },
  loggableLabel: {
    fontSize: FontSizes.mdSm,
    color: AppColors.darkTextMuted,
    fontWeight: FontWeights.regular,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.hairline,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: AppColors.darkSurface,
    alignItems: 'flex-end',
  },
  toggleOff: {
    backgroundColor: AppColors.darkTextMuted,
    alignItems: 'flex-start',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.mdLg,
    backgroundColor: AppColors.backgroundWhite,
  },
  toggleKnobRight: {},
  toggleKnobLeft: {},

  // Programming loading
  programmingLoadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // WOD display
  wodContent: {
    backgroundColor: AppColors.backgroundWarm,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginTop: Spacing.sm,
  },
  wodText: {
    fontSize: FontSizes.body,
    color: AppColors.darkCard,
    lineHeight: LineHeights.comfortable,
  },
  emptyProgramming: {
    backgroundColor: AppColors.backgroundWarm,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  emptyProgrammingText: {
    fontSize: FontSizes.body,
    color: AppColors.darkTextMuted,
    fontStyle: 'italic',
  },

  // Form
  formTitle: {
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.darkSurface,
    marginTop: Spacing.base,
  },
  textInputLarge: {
    height: 80,
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.mdSm,
    color: AppColors.darkCard,
    marginTop: Spacing.sm,
  },
  textInputSmall: {
    height: 56,
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.mdSm,
    color: AppColors.darkCard,
    marginTop: Spacing.sm,
  },

  // Success / error
  successBanner: {
    backgroundColor: AppColors.successBgLight,
    borderRadius: BorderRadius.mdSm,
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.smMd,
    marginTop: Spacing.md,
  },
  successText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.successLabel,
    fontWeight: FontWeights.medium,
  },
  errorText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.errorDefault,
    marginTop: Spacing.md,
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
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smMd,
    borderRadius: BorderRadius.mdSm,
    backgroundColor: AppColors.backgroundWhite,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    minHeight: 44,
  },
  backBtnText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.darkTextDim,
    fontWeight: FontWeights.regular,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: AppColors.darkSurface,
  },
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

  // Content — stacked single column
  contentColumn: {
    flex: 1,
    gap: Spacing.base,
  },

  // Info panel
  infoPanel: {
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    padding: Spacing.base,
  },
  panelTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: AppColors.darkSurface,
    marginBottom: Spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: AppColors.borderLight,
  },
  separatorSpacing: {
    marginTop: Spacing.base,
  },
  fieldLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: AppColors.darkTextMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
  },
  fieldValueBold: {
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.darkSurface,
    marginTop: Spacing.tight,
  },
  fieldValue: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.regular,
    color: AppColors.darkTextDim,
    marginTop: Spacing.tight,
  },

  // Compact 2-col info grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoGridCell: {
    width: '50%',
    marginBottom: Spacing.base,
  },
  infoGridCellLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: AppColors.darkTextMuted,
    marginBottom: Spacing.tight,
  },
  infoGridCellValue: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.regular,
    color: AppColors.darkTextDim,
  },
  bookedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: AppColors.backgroundWarm,
    borderRadius: BorderRadius.mdSm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.tight,
  },
  bookedRowText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.darkCard,
  },
  actionBtn: {
    backgroundColor: AppColors.darkSurface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.basePlus,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.base,
    minHeight: 48,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.backgroundWhite,
  },

  // Programming panel
  progPanel: {
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    padding: Spacing.base,
  },
  progHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  loggableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.smMd,
  },
  loggableLabel: {
    fontSize: FontSizes.mdSm,
    color: AppColors.darkTextMuted,
    fontWeight: FontWeights.regular,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.micro,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: AppColors.darkSurface,
    alignItems: 'flex-end',
  },
  toggleOff: {
    backgroundColor: AppColors.darkTextMuted,
    alignItems: 'flex-start',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.lg,
    backgroundColor: AppColors.backgroundWhite,
  },
  toggleKnobRight: {},
  toggleKnobLeft: {},

  // Programming loading
  programmingLoadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // WOD display
  wodContent: {
    backgroundColor: AppColors.backgroundWarm,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginTop: Spacing.sm,
  },
  wodText: {
    fontSize: FontSizes.body,
    color: AppColors.darkCard,
    lineHeight: LineHeights.comfortable,
  },
  emptyProgramming: {
    backgroundColor: AppColors.backgroundWarm,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  emptyProgrammingText: {
    fontSize: FontSizes.body,
    color: AppColors.darkTextMuted,
    fontStyle: 'italic',
  },

  // Form
  formTitle: {
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.darkSurface,
    marginTop: Spacing.base,
  },
  textInputLarge: {
    height: 100,
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.body,
    color: AppColors.darkCard,
    marginTop: Spacing.sm,
  },
  textInputSmall: {
    height: 72,
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.body,
    color: AppColors.darkCard,
    marginTop: Spacing.sm,
  },

  // Success / error
  successBanner: {
    backgroundColor: AppColors.successBgLight,
    borderRadius: BorderRadius.mdSm,
    paddingHorizontal: Spacing.mdPlus,
    paddingVertical: Spacing.smMd,
    marginTop: Spacing.md,
  },
  successText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.successLabel,
    fontWeight: FontWeights.medium,
  },
  errorText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.errorDefault,
    marginTop: Spacing.md,
  },
});
