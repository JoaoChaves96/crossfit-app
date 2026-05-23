import { StyleSheet } from 'react-native';
import { AppColors, BorderRadius, FontSizes, FontWeights, LineHeights, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.backgroundWhite,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.jumboLg,
  },
  header: {
    marginBottom: Spacing.xl,
  },

  // Loading / error full-screen states
  centeredFeedback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.jumbo,
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
    color: AppColors.textHeading,
  },

  // Form card
  formCard: {
    backgroundColor: AppColors.backgroundWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.backgroundDivider,
    padding: Spacing.xxl,
    gap: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  rowItem: {
    flex: 1,
  },

  // Field
  fieldContainer: {
    gap: Spacing.compact,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: FontSizes.mdSm,
    fontWeight: FontWeights.medium,
    color: AppColors.textSecondary,
  },

  // Input box
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smMd,
    backgroundColor: AppColors.backgroundWhite,
    minHeight: 42,
  },
  inputBoxText: {
    flexDirection: 'column',
    alignItems: undefined,
    color: AppColors.textHeading,
    fontFamily: 'Inter',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.regular,
  },
  inputBoxDisabled: {
    backgroundColor: AppColors.backgroundLight,
  },
  inputBoxError: {
    borderColor: AppColors.errorBgRose,
    backgroundColor: AppColors.errorBgLight,
  },
  inputBoxValidationError: {
    borderColor: AppColors.errorBgRose,
  },
  validationErrorText: {
    fontSize: FontSizes.smMd,
    color: AppColors.errorDefault,
    marginTop: Spacing.tight,
  },

  // Dropdown
  dropdownList: {
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.backgroundWhite,
    overflow: 'hidden',
    marginTop: Spacing.tight,
  },
  dropdownItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smMd,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.backgroundDivider,
  },
  dropdownItemSelected: {
    backgroundColor: AppColors.backgroundLight,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: AppColors.backgroundDivider,
  },

  // Submit error
  submitErrorBanner: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.errorBgRose,
    backgroundColor: AppColors.errorBgLight,
    padding: Spacing.md,
  },
  submitErrorText: {
    fontSize: FontSizes.mdSm,
    color: AppColors.errorDefault,
    lineHeight: LineHeights.body,
  },

  // Button row
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftBtns: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: AppColors.separatorDefault,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.smMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: AppColors.textHeading,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.smMd,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  rightGroup: {
    alignItems: 'flex-end',
    gap: Spacing.tight,
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: AppColors.errorVivid,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.smMd,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Mobile responsive styles
  scrollContentMobile: {
    padding: Spacing.base,
    paddingBottom: Spacing.jumbo,
  },
  formCardMobile: {
    padding: Spacing.base,
    borderWidth: 0,
  },
  rowMobile: {
    flexDirection: 'column',
    gap: Spacing.md,
  },
  btnRowMobile: {
    flexDirection: 'column',
    gap: Spacing.md,
  },
  leftBtnsMobile: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  rightGroupMobile: {
    alignItems: 'stretch',
  },
  btnMobile: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
