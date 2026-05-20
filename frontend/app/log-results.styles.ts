import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';

export const desktopStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  contentArea: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 40,
  },
  innerWrap: {
    width: 560,
    maxWidth: '100%',
    gap: 24,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.textGray600,
  },
});

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.backgroundWhite,
  },
  centered: {
    flex: 1,
    backgroundColor: AppColors.backgroundWhite,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: AppColors.black,
  },

  // Subtitle row
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.compact,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  subtitleText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.regular,
    color: AppColors.textGray600,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: AppColors.borderDim,
  },

  // Programming
  progSection: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sectionLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
  progContent: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.regular,
    color: AppColors.textDark2,
    lineHeight: FontSizes.mdSm * 1.4,
  },
  progToggle: {
    fontFamily: 'Inter',
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textDark3,
    marginTop: Spacing.tight,
  },

  // Warning
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: AppColors.backgroundSurface,
    borderRadius: BorderRadius.md,
  },
  warningText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.regular,
    color: AppColors.textGray600,
    flex: 1,
  },

  // Form section
  formSection: {
    gap: Spacing.base,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
  },
  formTitle: {
    fontFamily: 'Inter',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: AppColors.textPrimary,
  },

  // Edit state indicator
  editStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  editStateLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.medium,
    color: AppColors.textGray500,
  },

  // Field group
  fieldGroup: {
    gap: Spacing.compact,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textGray600,
    letterSpacing: 0.5,
  },

  // Metric type selector chips
  metricTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricTypeChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.backgroundSurface,
  },
  metricTypeChipSelected: {
    backgroundColor: AppColors.textDark3,
  },
  metricTypeChipText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textGray600,
  },
  metricTypeChipTextSelected: {
    color: AppColors.backgroundWhite,
  },

  // Metric row (input + unit)
  metricRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.md,
  },
  metricInputWrap: {
    flex: 1,
    gap: Spacing.compact,
  },
  metricInput: {
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.backgroundWhite,
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
    paddingHorizontal: Spacing.base,
    fontFamily: 'Inter',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: AppColors.textPrimary,
  },
  metricInputActive: {
    borderWidth: 2,
    borderColor: AppColors.textPrimary,
  },

  // Unit selector
  unitWrap: {
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.backgroundSurface,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.textDark3,
  },
  unitSelectorRow: {
    flexDirection: 'column',
    gap: Spacing.tight,
  },
  unitChip: {
    height: 22,
    borderRadius: BorderRadius.mdSm,
    backgroundColor: AppColors.backgroundSurface,
    paddingHorizontal: Spacing.smMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitChipSelected: {
    backgroundColor: AppColors.textDark3,
  },
  unitChipText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.smMd,
    fontWeight: FontWeights.semibold,
    color: AppColors.textGray600,
  },
  unitChipTextSelected: {
    color: AppColors.backgroundWhite,
  },

  // Notes
  notesWrap: {
    gap: Spacing.compact,
  },
  notesInput: {
    minHeight: 72,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.backgroundWhite,
    borderWidth: 1,
    borderColor: AppColors.borderDefault,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.regular,
    color: AppColors.textPrimary,
    textAlignVertical: 'top',
  },

  // Error card
  errorCard: {
    backgroundColor: AppColors.errorBg,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.errorMaterial,
    borderRadius: BorderRadius.mdSm,
    padding: Spacing.md,
  },
  errorCardText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
    color: AppColors.errorDark,
  },

  // Action section
  actionSection: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  saveBtn: {
    height: 50,
    borderRadius: BorderRadius.lg,
    backgroundColor: AppColors.textDark3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.bodyMd,
    fontWeight: FontWeights.bold,
    color: AppColors.backgroundWhite,
    letterSpacing: 0.5,
  },

  // Error screen
  errorText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.md,
    color: AppColors.errorDark,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  errorBackBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.borderDim,
  },
  errorBackBtnText: {
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: AppColors.black,
  },
});
